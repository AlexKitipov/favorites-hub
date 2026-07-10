import path from 'node:path';
import type { RecentApp } from '../../types';
import { queryKey, listSubkeys } from './registry';

// Windows tracks how often and when Explorer-launched items (Start Menu,
// desktop, taskbar — anything launched "as a user", not from a terminal)
// were run in the UserAssist registry key. Each launched item gets its own
// GUID-named subkey grouping ("folder" = {GUID}\Count), and inside that, one
// value per launched item. Two quirks make this trickier than a normal
// registry read:
//
//   1. Value NAMES are ROT13-"encoded" (a leftover Windows XP-era obfuscation
//      that Microsoft never removed) — e.g. "Cebtenz Svyrf" decodes to
//      "Program Files".
//   2. Value DATA is a binary blob containing a run counter and a FILETIME
//      timestamp of the last run, not just plain text.
//
// CAVEAT: the exact binary layout below (offsets for run count / last-run
// FILETIME) matches the commonly documented Windows 7+ "UserAssist format
// version 5" (72-byte entries) used in DFIR/forensics references. Microsoft
// has never publicly documented this format and it has changed across
// Windows versions before, so treat this as best-effort — verify against a
// real machine (e.g. compare a decoded timestamp with a known-recent app
// launch) before relying on it, and adjust OFFSET_* below if it's off.
const USERASSIST_ROOT = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Explorer\\UserAssist';

const OFFSET_RUN_COUNT = 4; // DWORD
const OFFSET_LAST_RUN_FILETIME = 60; // FILETIME (8 bytes, little-endian)
const MIN_ENTRY_LENGTH_BYTES = 68;

function rot13(input: string): string {
  return input.replace(/[a-zA-Z]/g, (char) => {
    const base = char <= 'Z' ? 65 : 97;
    return String.fromCharCode(((char.charCodeAt(0) - base + 13) % 26) + base);
  });
}

// Windows FILETIME: 100-nanosecond intervals since 1601-01-01 UTC.
function filetimeToDate(low: number, high: number): Date | null {
  if (low === 0 && high === 0) return null;
  const filetime = high * 2 ** 32 + low;
  const EPOCH_DIFF_MS = 11644473600000; // ms between 1601-01-01 and 1970-01-01
  const ms = filetime / 10000 - EPOCH_DIFF_MS;
  return new Date(ms);
}

function parseBinaryHex(hex: string): { runCount: number; lastRun: Date | null } | null {
  const bytes = hex.match(/.{1,2}/g)?.map((b) => parseInt(b, 16)) ?? [];
  if (bytes.length < MIN_ENTRY_LENGTH_BYTES) return null;

  const runCount = bytes[OFFSET_RUN_COUNT] | (bytes[OFFSET_RUN_COUNT + 1] << 8) | (bytes[OFFSET_RUN_COUNT + 2] << 16) | (bytes[OFFSET_RUN_COUNT + 3] << 24);

  const low =
    bytes[OFFSET_LAST_RUN_FILETIME] |
    (bytes[OFFSET_LAST_RUN_FILETIME + 1] << 8) |
    (bytes[OFFSET_LAST_RUN_FILETIME + 2] << 16) |
    (bytes[OFFSET_LAST_RUN_FILETIME + 3] << 24);
  const high =
    bytes[OFFSET_LAST_RUN_FILETIME + 4] |
    (bytes[OFFSET_LAST_RUN_FILETIME + 5] << 8) |
    (bytes[OFFSET_LAST_RUN_FILETIME + 6] << 16) |
    (bytes[OFFSET_LAST_RUN_FILETIME + 7] << 24);

  return { runCount, lastRun: filetimeToDate(low >>> 0, high >>> 0) };
}

export async function getRecentApps(): Promise<RecentApp[]> {
  const guidSubkeys = await listSubkeys(USERASSIST_ROOT);
  const apps: RecentApp[] = [];

  for (const guidKey of guidSubkeys) {
    const { values } = await queryKey(`${guidKey}\\Count`);

    for (const value of values) {
      // The session-marker entry, not a real launched item.
      if (value.name === 'UEME_CTLSESSION') continue;

      const decodedPath = rot13(value.name);
      const parsed = value.type === 'REG_BINARY' ? parseBinaryHex(value.data.replace(/\s/g, '')) : null;
      if (!parsed || !parsed.lastRun) continue;

      apps.push({
        name: path.basename(decodedPath).replace(/\.(exe|lnk)$/i, ''),
        path: decodedPath,
        lastUsed: parsed.lastRun
      });
    }
  }

  // Same app can appear under multiple UserAssist GUID groupings (e.g. once
  // via Start Menu, once via taskbar pin) — keep the most recent instance.
  const deduped = new Map<string, RecentApp>();
  for (const app of apps) {
    const existing = deduped.get(app.path);
    if (!existing || app.lastUsed > existing.lastUsed) deduped.set(app.path, app);
  }

  return Array.from(deduped.values()).sort((a, b) => b.lastUsed.getTime() - a.lastUsed.getTime());
}
