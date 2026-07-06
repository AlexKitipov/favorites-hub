import { contextBridge, ipcRenderer } from 'electron';

// Mirrors src/types/favorites.ts — see the note in electron/main.ts about
// why this isn't a shared import across the two build targets.
type SourceBrowser = 'chrome' | 'edge' | 'firefox' | 'brave';

interface FavoriteItem {
  id: string;
  title: string;
  url: string;
  sourceBrowser: SourceBrowser;
}

// Everything exposed here becomes available in the renderer as `window.api`.
// contextIsolation is on (see main.ts), so this is the only bridge between
// the untrusted renderer and privileged Node/Electron APIs — keep it narrow.
contextBridge.exposeInMainWorld('api', {
  getBookmarks: (): Promise<FavoriteItem[]> => ipcRenderer.invoke('get-bookmarks'),

  // Opens a URL with the OS's default browser instead of navigating the
  // Electron window itself. Used by FavoriteCard when running inside Electron.
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url)
});
