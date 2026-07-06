import type { FavoriteItem } from './favorites';

// Declares the shape of `window.api`, exposed by electron/preload.ts via
// contextBridge. Only present when the app is running inside Electron —
// always guard with `window.api?.` in the renderer, since the same code
// also runs as a plain browser app during `npm run dev`.
export interface FavoritesElectronAPI {
  getBookmarks: () => Promise<FavoriteItem[]>;
  openExternal: (url: string) => Promise<void>;
}

declare global {
  interface Window {
    api?: FavoritesElectronAPI;
  }
}
