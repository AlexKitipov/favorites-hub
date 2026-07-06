export type SourceBrowser = 'chrome' | 'edge' | 'firefox' | 'brave';

export interface FavoriteItem {
  id: string;
  title: string;
  url: string;
  sourceBrowser: SourceBrowser;
  faviconUrl?: string;
}
