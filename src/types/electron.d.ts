import type { FavoriteItem } from './favorites';
import type { RecentApp, RecentFile, InstalledProgram } from './future';

// Declares the shape of `window.api`, exposed by electron/preload.ts via
// contextBridge. Only present when the app is running inside Electron —
// always guard with `window.api?.` (or the `isElectron()` helper in
// src/hooks/useElectronDataLoader.ts) in the renderer, since the same code
// also runs as a plain browser app during `npm run dev`.
export interface FavoritesElectronAPI {
  getBookmarks: () => Promise<FavoriteItem[]>;
  getRecentApps: () => Promise<RecentApp[]>;
  getRecentFiles: () => Promise<RecentFile[]>;
  getInstalledPrograms: () => Promise<InstalledProgram[]>;
  getIcon: (targetPath: string) => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    api?: FavoritesElectronAPI;
  }
}
