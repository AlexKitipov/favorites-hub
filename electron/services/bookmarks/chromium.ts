import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import type { FavoriteItem, SourceBrowser } from '../../types';

type ChromiumBrowser = Extract<SourceBrowser, 'chrome' | 'edge' | 'brave'>;

const CHROMIUM_PROFILE_DIRS: Record<ChromiumBrowser, string[]> = {
  chrome: ['Google', 'Chrome'],
  edge: ['Microsoft', 'Edge'],
  brave: ['BraveSoftware', 'Brave-Browser']
};

function bookmarksPathFor(browser: ChromiumBrowser): string {
  return path.join(os.homedir(), 'AppData', 'Local', ...CHROMIUM_PROFILE_DIRS[browser], 'User Data', 'Default', 'Bookmarks');
}

// Chromium-based browsers (Chrome, Edge, Brave) all store bookmarks as JSON
// with the same tree shape: { roots: { bookmark_bar, other, synced }, ... }.
// Folders have `type: "folder"` + `children`; actual bookmarks have
// `type: "url"` + `name` + `url`.
async function readChromiumBookmarks(browser: ChromiumBrowser): Promise<FavoriteItem[]> {
  const bookmarksFilePath = bookmarksPathFor(browser);

  try {
    const raw = await fs.readFile(bookmarksFilePath, 'utf-8');
    const json = JSON.parse(raw);
    const items: FavoriteItem[] = [];

    function walk(node: any) {
      if (!node) return;
      if (node.type === 'url' && typeof node.url === 'string') {
        items.push({
          id: typeof node.guid === 'string' ? node.guid : `${browser}-${items.length}`,
          title: typeof node.name === 'string' && node.name.length > 0 ? node.name : node.url,
          url: node.url,
          sourceBrowser: browser
        });
      } else if (Array.isArray(node.children)) {
        node.children.forEach(walk);
      }
    }

    const roots = json.roots ?? {};
    Object.values(roots).forEach(walk);

    return items;
  } catch (err) {
    // Missing file (browser not installed, or never used on this machine) or
    // unreadable JSON — treat as "no bookmarks from this browser" rather than
    // failing the whole aggregation.
    console.warn(`[bookmarks] Could not read ${browser} bookmarks at ${bookmarksFilePath}:`, err);
    return [];
  }
}

export async function readChromeBookmarks(): Promise<FavoriteItem[]> {
  return readChromiumBookmarks('chrome');
}

export async function readEdgeBookmarks(): Promise<FavoriteItem[]> {
  return readChromiumBookmarks('edge');
}

export async function readBraveBookmarks(): Promise<FavoriteItem[]> {
  return readChromiumBookmarks('brave');
}
