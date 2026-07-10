// Mirrors src/types/favorites.ts and src/types/future.ts. Duplicated here
// (rather than imported) because the Electron main process is compiled
// separately — CommonJS, Node context (see tsconfig.electron.json) — from
// the React renderer, which is ESM bundled by Vite. Keeping the main
// process free of cross-project imports avoids module-resolution mismatches
// between the two build setups.

export type SourceBrowser = 'chrome' | 'edge' | 'firefox' | 'brave';

export interface FavoriteItem {
  id: string;
  title: string;
  url: string;
  sourceBrowser: SourceBrowser;
}

export interface RecentApp {
  name: string;
  path: string;
  icon?: string;
  lastUsed: Date;
}

export interface RecentFile {
  name: string;
  path: string;
  type: string;
  lastOpened: Date;
}

export interface InstalledProgram {
  name: string;
  path: string;
  icon?: string;
}
