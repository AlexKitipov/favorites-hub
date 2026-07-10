import { contextBridge, ipcRenderer } from 'electron';
import type { FavoriteItem, RecentApp, RecentFile, InstalledProgram } from './types';

// Everything exposed here becomes available in the renderer as `window.api`.
// contextIsolation is on (see main.ts), so this is the only bridge between
// the untrusted renderer and privileged Node/Electron APIs — keep it narrow,
// one method per IPC channel, no raw ipcRenderer access.
contextBridge.exposeInMainWorld('api', {
  getBookmarks: (): Promise<FavoriteItem[]> => ipcRenderer.invoke('get-bookmarks'),
  getRecentApps: (): Promise<RecentApp[]> => ipcRenderer.invoke('get-recent-apps'),
  getRecentFiles: (): Promise<RecentFile[]> => ipcRenderer.invoke('get-recent-files'),
  getInstalledPrograms: (): Promise<InstalledProgram[]> => ipcRenderer.invoke('get-installed-programs'),

  // Returns a "data:image/png;base64,..." URL, or null if extraction failed.
  getIcon: (targetPath: string): Promise<string | null> => ipcRenderer.invoke('get-icon', targetPath),

  // Opens a URL/path with the OS's default handler instead of navigating the
  // Electron window itself.
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke('open-external', url)
});
