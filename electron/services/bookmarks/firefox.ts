import fs from 'node:fs/promises';
import fsSync from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import initSqlJs from 'sql.js';
import type { FavoriteItem } from '../../types';

// Firefox bookmarks live in a SQLite database (places.sqlite), not JSON like
// the Chromium browsers, so this needs an actual SQLite reader — Node has no
// built-in one.
//
// This uses `sql.js` (SQLite compiled to WebAssembly) rather than a native
// addon like `better-sqlite3`. Native addons need a matching prebuilt binary
// or a full node-gyp/Visual Studio C++ toolchain to compile one locally —
// that toolchain isn't available on every Windows machine (older Windows
// versions in particular often can't install a modern VS Build Tools
// release at all). sql.js's .wasm file runs anywhere Node or Electron runs,
// no compilation step, no VS/Python/node-gyp dependency.
//
// The tradeoff: sql.js loads the whole database file into memory rather than
// streaming from disk, which is irrelevant for a bookmarks file (typically a
// few hundred KB to a few MB) but wouldn't scale to a large database.

let sqlJsPromise: ReturnType<typeof initSqlJs> | null = null;

function getSqlJs() {
  if (!sqlJsPromise) {
    // sql.js ships its .wasm binary alongside its JS in node_modules/sql.js/dist.
    // `locateFile` tells it exactly where to find that file rather than
    // guessing a URL (which only makes sense in a browser bundle context).
    sqlJsPromise = initSqlJs({
      locateFile: (file: string) => require.resolve(`sql.js/dist/${file}`)
    });
  }
  return sqlJsPromise;
}

// Firefox profile folder names are randomized (e.g. "xxxxxxxx.default-release"),
// so the active profile has to be resolved from profiles.ini first rather than
// assumed. This is a minimal parser for just the fields we need — profiles.ini
// is a plain INI file with one [ProfileN] / [Install...] section per profile.
async function resolveDefaultProfileDir(): Promise<string | null> {
  const firefoxRoot = path.join(os.homedir(), 'AppData', 'Roaming', 'Mozilla', 'Firefox');
  const iniPath = path.join(firefoxRoot, 'profiles.ini');

  let raw: string;
  try {
    raw = await fs.readFile(iniPath, 'utf-8');
  } catch (err) {
    console.warn('[bookmarks] Could not read Firefox profiles.ini:', err);
    return null;
  }

  const sections = raw.split(/\r?\n(?=\[)/).map((block) => {
    const lines = block.split(/\r?\n/).filter(Boolean);
    const header = lines[0]?.trim() ?? '';
    const fields: Record<string, string> = {};
    for (const line of lines.slice(1)) {
      const [key, ...rest] = line.split('=');
      if (key) fields[key.trim()] = rest.join('=').trim();
    }
    return { header, fields };
  });

  // Prefer an explicit [Install...] "Default=" pointer (modern Firefox),
  // falling back to the first Profile section with Default=1, then just the
  // first profile section at all.
  const installSection = sections.find((s) => s.header.startsWith('[Install'));
  const defaultPath =
    installSection?.fields.Default ??
    sections.find((s) => s.header.startsWith('[Profile') && s.fields.Default === '1')?.fields.Path ??
    sections.find((s) => s.header.startsWith('[Profile'))?.fields.Path;

  const isRelative =
    sections.find((s) => s.fields.Path === defaultPath)?.fields.IsRelative !== '0';

  if (!defaultPath) return null;

  return isRelative ? path.join(firefoxRoot, defaultPath) : defaultPath;
}

// places.sqlite is frequently locked while Firefox is running (SQLite's
// default locking prevents a second process from safely reading it). Copying
// to a temp file first sidesteps that — it's a snapshot, not fully live, but
// good enough for a bookmarks start page. (sql.js reads the whole file into
// memory anyway, so this copy is also what actually gets loaded below.)
async function copyToTempCopy(originalPath: string): Promise<string> {
  const tempPath = path.join(os.tmpdir(), `favorites-hub-places-${Date.now()}-${Math.random().toString(36).slice(2)}.sqlite`);
  await fs.copyFile(originalPath, tempPath);
  return tempPath;
}

export async function readFirefoxBookmarks(): Promise<FavoriteItem[]> {
  const profileDir = await resolveDefaultProfileDir();
  if (!profileDir) {
    console.warn('[bookmarks] Could not resolve a Firefox profile — skipping Firefox bookmarks.');
    return [];
  }

  const placesPath = path.join(profileDir, 'places.sqlite');
  if (!fsSync.existsSync(placesPath)) {
    console.warn(`[bookmarks] No places.sqlite found at ${placesPath} — skipping Firefox bookmarks.`);
    return [];
  }

  let tempCopyPath: string | null = null;
  try {
    tempCopyPath = await copyToTempCopy(placesPath);
    const fileBuffer = await fs.readFile(tempCopyPath);

    const SQL = await getSqlJs();
    const db = new SQL.Database(fileBuffer);

    try {
      // moz_bookmarks.type = 1 means "bookmark" (as opposed to a folder or
      // separator). moz_bookmarks.fk points at moz_places.id, which holds
      // the actual URL.
      const results = db.exec(
        `SELECT moz_bookmarks.id as id, moz_bookmarks.title as title, moz_places.url as url
         FROM moz_bookmarks
         JOIN moz_places ON moz_bookmarks.fk = moz_places.id
         WHERE moz_bookmarks.type = 1 AND moz_places.url IS NOT NULL`
      );

      if (results.length === 0) return [];

      const { columns, values } = results[0];
      const idIdx = columns.indexOf('id');
      const titleIdx = columns.indexOf('title');
      const urlIdx = columns.indexOf('url');

      return values.map((row): FavoriteItem => {
        const url = String(row[urlIdx]);
        const title = row[titleIdx];
        return {
          id: `firefox-${row[idIdx]}`,
          title: typeof title === 'string' && title.length > 0 ? title : url,
          url,
          sourceBrowser: 'firefox' as const
        };
      });
    } finally {
      db.close();
    }
  } catch (err) {
    console.warn('[bookmarks] Failed to read Firefox places.sqlite:', err);
    return [];
  } finally {
    if (tempCopyPath) {
      fs.unlink(tempCopyPath).catch(() => {
        /* best effort cleanup */
      });
    }
  }
}
