import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { RecentFile } from '../../types';

// Windows maintains a live "Recent" folder (the same list that powers
// Explorer's Quick Access "Recent files" and each app's Jump List union) at
// %AppData%\Microsoft\Windows\Recent — every entry is a .lnk shortcut named
// after the file it points to. This is a much simpler and more reliable
// source than trying to reconstruct per-application MRU lists from the
// registry (those live under each app's own key, in inconsistent formats).
const RECENT_DIR = path.join(os.homedir(), 'AppData', 'Roaming', 'Microsoft', 'Windows', 'Recent');

function extensionToType(fileName: string): string {
  const ext = path.extname(fileName).replace('.', '');
  return ext.length > 0 ? ext.toUpperCase() : 'FILE';
}

export async function getRecentFiles(): Promise<RecentFile[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(RECENT_DIR);
  } catch (err) {
    console.warn(`[recent-files] Could not read ${RECENT_DIR}:`, err);
    return [];
  }

  const lnkFiles = entries.filter((name) => name.toLowerCase().endsWith('.lnk'));

  const files = await Promise.all(
    lnkFiles.map(async (lnkName): Promise<RecentFile | null> => {
      try {
        const fullLnkPath = path.join(RECENT_DIR, lnkName);
        const stat = await fs.stat(fullLnkPath);
        const targetName = lnkName.replace(/\.lnk$/i, '');

        return {
          name: targetName,
          // Note: this is the shortcut's own path, not the resolved target
          // path. Resolving the actual target requires parsing the binary
          // .lnk format (or shelling out to a small PowerShell/WScript.Shell
          // helper — see getIconForPath in icons.ts for the same pattern).
          // Left as the shortcut path for now since it's enough to identify
          // and re-open "the same recent item" from the UI.
          path: fullLnkPath,
          type: extensionToType(targetName),
          lastOpened: stat.mtime
        };
      } catch {
        return null;
      }
    })
  );

  return files
    .filter((f): f is RecentFile => f !== null)
    .sort((a, b) => b.lastOpened.getTime() - a.lastOpened.getTime());
}
