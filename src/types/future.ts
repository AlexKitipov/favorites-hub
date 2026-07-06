// Type definitions for tabs that are scaffolded but not yet implemented.
// These are used by the placeholder pages (RecentAppsPage, RecentFilesPage,
// AllProgramsPage) so the shape of future data is already agreed on and the
// components/hooks that will eventually load real data can be typed now.

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
