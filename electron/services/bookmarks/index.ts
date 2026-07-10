import type { FavoriteItem } from '../../types';
import { readChromeBookmarks, readEdgeBookmarks, readBraveBookmarks } from './chromium';
import { readFirefoxBookmarks } from './firefox';

export async function getAllBookmarks(): Promise<FavoriteItem[]> {
  const [chrome, edge, brave, firefox] = await Promise.all([
    readChromeBookmarks(),
    readEdgeBookmarks(),
    readBraveBookmarks(),
    readFirefoxBookmarks()
  ]);

  return [...chrome, ...edge, ...brave, ...firefox];
}
