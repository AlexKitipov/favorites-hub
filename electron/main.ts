import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';
import fs from 'node:fs/promises';
import os from 'node:os';

// Mirrors src/types/favorites.ts. Duplicated here (rather than imported)
// because the Electron main process is compiled separately — CommonJS,
// Node context (see tsconfig.electron.json) — from the React renderer,
// which is ESM bundled by Vite. Keeping this file free of cross-project
// imports avoids module-resolution headaches between the two build setups.
type SourceBrowser = 'chrome' | 'edge' | 'firefox' | 'brave';

interface FavoriteItem {
  id: string;
  title: string;
  url: string;
  sourceBrowser: SourceBrowser;
}

const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    backgroundColor: '#14161a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (isDev) {
    // In dev, the renderer is served by the Vite dev server (see package.json
    // "electron:dev" script, which waits for it to be up before launching this).
    const devUrl = process.env.ELECTRON_START_URL ?? 'http://localhost:5173';
    win.loadURL(devUrl);
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    // In production, load the static build produced by `vite build` (dist/index.html).
    win.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ---------------------------------------------------------------------------
// Bookmark reading (real implementation — replaces the mock data loader)
// ---------------------------------------------------------------------------

const chromeBookmarksPath = path.join(
  os.homedir(),
  'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Bookmarks'
);
const edgeBookmarksPath = path.join(
  os.homedir(),
  'AppData', 'Local', 'Microsoft', 'Edge', 'User Data', 'Default', 'Bookmarks'
);
// Bonus: Brave uses the same Chromium bookmark format as Chrome/Edge, so it's
// effectively free to support once the generic reader exists.
const braveBookmarksPath = path.join(
  os.homedir(),
  'AppData', 'Local', 'BraveSoftware', 'Brave-Browser', 'User Data', 'Default', 'Bookmarks'
);

// Chromium-based browsers (Chrome, Edge, Brave) all store bookmarks as JSON
// with the same tree shape: { roots: { bookmark_bar, other, synced }, ... }.
// Folders have `type: "folder"` + `children`; actual bookmarks have
// `type: "url"` + `name` + `url`.
async function readChromiumBookmarks(
  bookmarksFilePath: string,
  sourceBrowser: 'chrome' | 'edge' | 'brave'
): Promise<FavoriteItem[]> {
  try {
    const raw = await fs.readFile(bookmarksFilePath, 'utf-8');
    const json = JSON.parse(raw);
    const items: FavoriteItem[] = [];

    function walk(node: any) {
      if (!node) return;
      if (node.type === 'url' && typeof node.url === 'string') {
        items.push({
          id: typeof node.guid === 'string' ? node.guid : `${sourceBrowser}-${items.length}`,
          title: typeof node.name === 'string' && node.name.length > 0 ? node.name : node.url,
          url: node.url,
          sourceBrowser
        });
      } else if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    }

    const roots = json.roots ?? {};
    Object.values(roots).forEach(walk);

    return items;
  } catch (err) {
    // Missing file (browser not installed, or never used on this machine) or
    // unreadable JSON — treat as "no bookmarks from this browser" rather than
    // failing the whole aggregation.
    console.warn(`[bookmarks] Could not read ${sourceBrowser} bookmarks at ${bookmarksFilePath}:`, err);
    return [];
  }
}

// TODO: Firefox bookmarks live in a SQLite database (places.sqlite), not
// JSON, so this needs a SQLite driver — Node has no built-in one. Suggested
// approach once ready to implement:
//
//   1. npm install better-sqlite3
//   2. Find the active profile folder: Firefox profile folder names are
//      randomized (e.g. "xxxxxxxx.default-release"), so first read
//      `%APPDATA%\Mozilla\Firefox\profiles.ini` to find the right one.
//   3. The places.sqlite file is often locked while Firefox is running, so
//      copy it to a temp path first (fs.copyFile) and query the copy.
//   4. Query:
//        SELECT moz_bookmarks.title, moz_places.url
//        FROM moz_bookmarks
//        JOIN moz_places ON moz_bookmarks.fk = moz_places.id
//        WHERE moz_bookmarks.type = 1 AND moz_places.url IS NOT NULL
//   5. Map each row to a FavoriteItem with sourceBrowser: 'firefox'.
async function readFirefoxBookmarks(): Promise<FavoriteItem[]> {
  return [];
}

ipcMain.handle('get-bookmarks', async (): Promise<FavoriteItem[]> => {
  const [chrome, edge, brave, firefox] = await Promise.all([
    readChromiumBookmarks(chromeBookmarksPath, 'chrome'),
    readChromiumBookmarks(edgeBookmarksPath, 'edge'),
    readChromiumBookmarks(braveBookmarksPath, 'brave'),
    readFirefoxBookmarks()
  ]);

  return [...chrome, ...edge, ...brave, ...firefox];
});

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
});
