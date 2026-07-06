import { useEffect, useState } from 'react';
import type { FavoriteItem } from '../types/favorites';

interface UseFavoritesLoaderResult {
  favorites: FavoriteItem[];
  isLoading: boolean;
  error: string | null;
}

// Builds a favicon URL using Google's public favicon service.
// This works from a plain browser context without needing filesystem access
// to each browser's own favicon cache.
function faviconFor(url: string): string {
  try {
    const { hostname } = new URL(url);
    return `https://www.google.com/s2/favicons?sz=64&domain=${hostname}`;
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// MOCK DATA
// ---------------------------------------------------------------------------
// This is what the UI renders today. Replace `loadMockFavorites` with a real
// loader (see the two real-world strategies documented below) when ready.
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

// ---------------------------------------------------------------------------
// REAL LOADING
// ---------------------------------------------------------------------------
// A plain browser page (even one served by Vite) CANNOT read arbitrary files
// from the user's disk — that's blocked by browser security sandboxing. So
// this hook picks its data source at runtime:
//
//   - Running inside Electron: `window.api` is present (exposed by
//     electron/preload.ts via contextBridge). Real bookmarks are read in the
//     main process (electron/main.ts, full Node `fs` access) and returned
//     here over IPC — no filesystem code runs in the renderer itself.
//   - Running as a plain browser app (`npm run dev` without Electron):
//     `window.api` is undefined, so this falls back to mock data so the UI
//     still has something to render.
//
// Firefox support is a TODO on the Electron side (see the comment above
// `readFirefoxBookmarks` in electron/main.ts) since it needs a SQLite driver
// rather than a simple JSON read.
async function loadFavorites(): Promise<FavoriteItem[]> {
  if (window.api) {
    const items = await window.api.getBookmarks();
    return items.map((item) => ({ ...item, faviconUrl: faviconFor(item.url) }));
  }

  // Not running inside Electron — no real fs access available, use mock data.
  return loadMockFavorites();
}

export function useFavoritesLoader(): UseFavoritesLoaderResult {
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    loadFavorites()
      .then((items) => {
        if (cancelled) return;
        setFavorites(items);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load favorites');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { favorites, isLoading, error };
}
