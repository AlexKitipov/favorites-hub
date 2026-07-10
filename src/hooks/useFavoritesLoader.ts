import type { FavoriteItem } from '../types/favorites';
import { useElectronDataLoader } from './useElectronDataLoader';

interface UseFavoritesLoaderResult {
  favorites: FavoriteItem[];
  isLoading: boolean;
  error: string | null;
}

// Builds a favicon URL using Google's public favicon service.
function faviconFor(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch {
    return '';
  }
}

function loadMockFavorites(): FavoriteItem[] {
  const raw: Omit<FavoriteItem, 'faviconUrl'>[] = [
    { id: 'c1', title: 'GitHub', url: 'https://github.com', sourceBrowser: 'chrome' },
    { id: 'c2', title: 'MDN Web Docs', url: 'https://developer.mozilla.org', sourceBrowser: 'chrome' },
    { id: 'c3', title: 'React Docs', url: 'https://react.dev', sourceBrowser: 'chrome' },
    { id: 'e1', title: 'Stack Overflow', url: 'https://stackoverflow.com', sourceBrowser: 'edge' },
    { id: 'e2', title: 'TypeScript Docs', url: 'https://www.typescriptlang.org', sourceBrowser: 'edge' },
    { id: 'f1', title: 'Firefox Add-ons', url: 'https://addons.mozilla.org', sourceBrowser: 'firefox' },
    { id: 'f2', title: 'Hacker News', url: 'https://news.ycombinator.com', sourceBrowser: 'firefox' },
    { id: 'b1', title: 'Brave Search', url: 'https://search.brave.com', sourceBrowser: 'brave' },
    { id: 'b2', title: 'Vite', url: 'https://vitejs.dev', sourceBrowser: 'brave' },
    { id: 'c4', title: 'Figma', url: 'https://figma.com', sourceBrowser: 'chrome' },
    { id: 'e3', title: 'Azure Portal', url: 'https://portal.azure.com', sourceBrowser: 'edge' },
    { id: 'f3', title: 'CSS Tricks', url: 'https://css-tricks.com', sourceBrowser: 'firefox' }
  ];

  return raw.map((item) => ({ ...item, faviconUrl: faviconFor(item.url) }));
}

async function loadElectronFavorites(): Promise<FavoriteItem[]> {
  // window.api.getBookmarks() aggregates Chrome, Edge, Brave, and Firefox in
  // the main process — see electron/services/bookmarks/index.ts.
  const items = await window.api!.getBookmarks();
  return items.map((item) => ({ ...item, faviconUrl: faviconFor(item.url) }));
}

export function useFavoritesLoader(): UseFavoritesLoaderResult {
  const { data, isLoading, error } = useElectronDataLoader(loadElectronFavorites, loadMockFavorites);
  return { favorites: data, isLoading, error };
}
