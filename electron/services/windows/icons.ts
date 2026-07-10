import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Node has no built-in way to pull the icon Windows Explorer shows for a
// .exe/.dll/shortcut — that's a Win32 shell API (SHGetFileInfo or
// System.Drawing.Icon.ExtractAssociatedIcon). Rather than add a native
// addon (ABI-version-pinned to the exact Electron build, painful to keep
// working across upgrades), shell out to PowerShell, which has direct
// access to System.Drawing via .NET. The script extracts the icon, encodes
// it as PNG, and prints it as base64 to stdout.
const EXTRACT_ICON_SCRIPT = `
Add-Type -AssemblyName System.Drawing
param($TargetPath)
try {
  $icon = [System.Drawing.Icon]::ExtractAssociatedIcon($TargetPath)
  if ($null -eq $icon) { exit 1 }
  $ms = New-Object System.IO.MemoryStream
  $icon.ToBitmap().Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
  [Convert]::ToBase64String($ms.ToArray())
} catch {
  exit 1
}
`.trim();

const cache = new Map<string, string | null>();

// Returns a "data:image/png;base64,..." URL, or null if extraction failed
// (missing file, no associated icon, PowerShell unavailable, etc). Results
// are cached in-process since the same handful of exe paths tend to repeat
// across Recent Apps / Installed Programs and icon extraction is relatively
// slow (spawns a PowerShell process per call).
export async function getIconAsDataUrl(targetPath: string): Promise<string | null> {
  if (cache.has(targetPath)) return cache.get(targetPath)!;

  try {
    const { stdout } = await execFileAsync('powershell', [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      EXTRACT_ICON_SCRIPT,
      '-TargetPath',
      targetPath
    ]);

    const base64 = stdout.trim();
    const result = base64.length > 0 ? `data:image/png;base64,${base64}` : null;
    cache.set(targetPath, result);
    return result;
  } catch (err) {
    console.warn(`[icons] Could not extract icon for ${targetPath}:`, err);
    cache.set(targetPath, null);
    return null;
  }
}
