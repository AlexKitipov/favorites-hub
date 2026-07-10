import { app, BrowserWindow, ipcMain, shell } from 'electron';
import path from 'node:path';

import { getAllBookmarks } from './services/bookmarks';
import { getRecentApps } from './services/windows/recentApps';
import { getRecentFiles } from './services/windows/recentFiles';
import { getInstalledPrograms } from './services/windows/installedPrograms';
import { getIconAsDataUrl } from './services/windows/icons';

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
// IPC handlers — each mirrors one method on the `window.api` surface exposed
// by preload.ts. Keeping the actual data-reading logic in electron/services/
// means this file stays a plain "wire it up" layer.
// ---------------------------------------------------------------------------

ipcMain.handle('get-bookmarks', () => getAllBookmarks());
ipcMain.handle('get-recent-apps', () => getRecentApps());
ipcMain.handle('get-recent-files', () => getRecentFiles());
ipcMain.handle('get-installed-programs', () => getInstalledPrograms());
ipcMain.handle('get-icon', (_event, targetPath: string) => getIconAsDataUrl(targetPath));

ipcMain.handle('open-external', async (_event, url: string) => {
  await shell.openExternal(url);
});
