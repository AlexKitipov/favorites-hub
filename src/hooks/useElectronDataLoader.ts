import { useEffect, useState } from 'react';

interface DataLoaderResult<T> {
  data: T[];
  isLoading: boolean;
  error: string | null;
}

export function isElectron(): boolean {
  return typeof window !== 'undefined' && window.api !== undefined;
}

// Shared shape for every tab's data hook: try the real Electron IPC call
// first, fall back to mock data when running as a plain browser app (no
// `window.api`), and normalize loading/error state the same way everywhere.
//
// Each concrete hook (useFavoritesLoader, useRecentAppsLoader, ...) just
// supplies its own `electronLoader` + `mockLoader` and gets consistent
// { data, isLoading, error } behavior for free.
export function useElectronDataLoader<T>(
  electronLoader: () => Promise<T[]>,
  mockLoader: () => T[] | Promise<T[]>
): DataLoaderResult<T> {
  const [data, setData] = useState<T[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setIsLoading(true);
    Promise.resolve(isElectron() ? electronLoader() : mockLoader())
      .then((items) => {
        if (cancelled) return;
        setData(items);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : 'Failed to load data');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- loaders are stable per call site
  }, []);

  return { data, isLoading, error };
}
