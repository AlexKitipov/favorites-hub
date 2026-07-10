# PR: Real bookmark parsing (Chrome/Edge/Brave/Firefox) + Windows integration (Recent Apps, Recent Files, Installed Programs)

## Summary

This PR does two things:

1. **Corrects a misconception, not a bug.** The app was *not* only loading Edge bookmarks — `useFavoritesLoader` / `electron/main.ts` already aggregated Chrome, Edge, and Brave (all via the shared Chromium JSON parser), with Firefox explicitly marked `TODO` pending a SQLite driver. That said, seeing all four sources actually implemented is clearly the goal, so:
2. **Implements the previously-TODO Firefox bookmark support**, and **adds three new data sources** (Recent Apps, Recent Files, Installed Programs) with a matching Electron IPC surface, refactoring `electron/main.ts` from a single file into a `services/` layer so each data source is independently readable and testable.

No behavior regresses: Chrome/Edge/Brave bookmark reading is unchanged (moved, not rewritten), and every tab still works with mock data when running outside Electron (`npm run dev`).

---

## New files

```
.gitignore                                        # was missing — node_modules/dist were unprotected
electron/types.ts                                  # main-process type mirror
electron/services/bookmarks/chromium.ts             # Chrome/Edge/Brave JSON parser (extracted from main.ts)
electron/services/bookmarks/firefox.ts              # NEW — places.sqlite via better-sqlite3
electron/services/bookmarks/index.ts                # getAllBookmarks() aggregator
electron/services/windows/registry.ts               # reg.exe wrapper (query key / list subkeys)
electron/services/windows/recentApps.ts             # NEW — UserAssist registry → RecentApp[]
electron/services/windows/recentFiles.ts            # NEW — Recent shell folder → RecentFile[]
electron/services/windows/installedPrograms.ts       # NEW — Uninstall registry keys → InstalledProgram[]
electron/services/windows/icons.ts                  # NEW — PowerShell icon extraction, cached
src/hooks/useElectronDataLoader.ts                  # generic "IPC, else mock" hook factory
src/hooks/useRecentAppsLoader.ts                    # NEW
src/hooks/useRecentFilesLoader.ts                   # NEW
src/hooks/useInstalledProgramsLoader.ts              # NEW
src/hooks/useIconDataUrl.ts                          # NEW — lazy per-card icon resolution
src/components/EntityCard.tsx                        # NEW — shared card UI for the 3 non-bookmark tabs
```

## Modified files

```
electron/main.ts            # 114 lines shorter — now just window setup + ipcMain.handle(...) wiring
electron/preload.ts          # window.api extended: getRecentApps/getRecentFiles/getInstalledPrograms/getIcon
package.json                 # + better-sqlite3, @types/better-sqlite3, @electron/rebuild, postinstall rebuild step
src/hooks/useFavoritesLoader.ts        # rewritten on top of useElectronDataLoader (was ~140 lines of inline comments, now ~45)
src/components/RecentAppsPage.tsx      # placeholder → real data via useRecentAppsLoader
src/components/RecentFilesPage.tsx     # placeholder → real data via useRecentFilesLoader
src/components/AllProgramsPage.tsx     # placeholder → real data + search via useInstalledProgramsLoader
src/types/electron.d.ts      # window.api type extended to match preload.ts
README.md                    # full rewrite — see below
```

**Diff stat** (excluding the auto-generated `package-lock.json`):

```
25 files changed, 1089 insertions(+), 302 deletions(-)
```

The full unified diff is attached as `CHANGES.patch` in this delivery — apply with `git apply CHANGES.patch` from the repo root, or use it as a reference; it's large (~1700 lines) mostly because of the new service files, so it isn't inlined here in full.

---

## 1. Favorites logic — technical review

**Why did it look like only Edge was loading?** It wasn't, structurally — `readChromiumBookmarks()` was already called for `chrome`, `edge`, and `brave` in the old `main.ts`, and `useFavoritesLoader` had no browser-specific special-casing. The most likely real-world explanation on a given test machine is simply that **Chrome/Brave weren't installed, or had no bookmarks in the default profile**, so `fs.readFile` on those paths failed, and each failure is caught and treated as "zero bookmarks from that browser" (by design — one missing browser shouldn't blank the whole page). Worth double-checking on the test machine: `%LocalAppData%\Google\Chrome\User Data\Default\Bookmarks` actually exists and has content.

**What changed here:**
- Chrome/Edge/Brave parsing: **extracted, not rewritten** — moved from `main.ts` into `electron/services/bookmarks/chromium.ts` as three thin exports (`readChromeBookmarks`, `readEdgeBookmarks`, `readBraveBookmarks`) over one shared recursive tree-walker.
- Firefox: **newly implemented** in `electron/services/bookmarks/firefox.ts` — resolves the active profile from `profiles.ini`, copies `places.sqlite` to a temp file (it's commonly locked while Firefox is running), and queries it with `better-sqlite3`.
- **Unified loader**: `getAllBookmarks()` in `services/bookmarks/index.ts` runs all four readers in parallel via `Promise.all` and flattens the result — this is the single function `main.ts` now calls for the `get-bookmarks` IPC channel.

See `electron/services/bookmarks/chromium.ts` and `firefox.ts` in the delivered project for the full parsing code (Chromium JSON tree walk, and the Firefox SQL query respectively).

## 2. Windows integration

| Feature | Source | File |
|---|---|---|
| Recent Apps | `HKCU\...\Explorer\UserAssist\{GUID}\Count` (ROT13 names + binary run-count/FILETIME) | `electron/services/windows/recentApps.ts` |
| Recent Files | `%AppData%\Microsoft\Windows\Recent` (`.lnk` shortcuts, plain `fs`) | `electron/services/windows/recentFiles.ts` |
| Installed Programs | `Uninstall` registry keys (HKLM 64-bit, HKLM WOW6432Node, HKCU) | `electron/services/windows/installedPrograms.ts` |
| Icon extraction | PowerShell + `System.Drawing.Icon.ExtractAssociatedIcon`, base64 PNG, cached | `electron/services/windows/icons.ts` |

**Caveats flagged in code comments** (worth reading before relying on these in production):
- The UserAssist binary layout (offsets for run count / last-run FILETIME) follows the commonly documented Windows 7+ format from DFIR references, but Microsoft has never published it and it's changed before — **validate against a real machine**.
- Recent Files currently returns the `.lnk` shortcut's own path, not the resolved target — resolving that needs either a binary `.lnk` parser or a `WScript.Shell` COM call (same PowerShell-bridge pattern as `icons.ts`).
- Installed Programs does one `reg.exe` call per product key (~1-3s for 100+ apps) — fine for a one-time load, but worth caching if this needs to feel instant.

## 3. Electron integration

`electron/main.ts` is now just window setup + six `ipcMain.handle(...)` one-liners delegating to `services/`. `electron/preload.ts` exposes:

```ts
interface FavoritesElectronAPI {
  getBookmarks: () => Promise<FavoriteItem[]>;
  getRecentApps: () => Promise<RecentApp[]>;
  getRecentFiles: () => Promise<RecentFile[]>;
  getInstalledPrograms: () => Promise<InstalledProgram[]>;
  getIcon: (targetPath: string) => Promise<string | null>;
  openExternal: (url: string) => Promise<void>;
}
```

`contextIsolation: true`, `nodeIntegration: false` — unchanged from before, still no direct `fs`/`child_process` access from the renderer.

React side: every tab's data hook (`useFavoritesLoader`, `useRecentAppsLoader`, `useRecentFilesLoader`, `useInstalledProgramsLoader`) is now a ~15-line wrapper around one shared `useElectronDataLoader(electronFn, mockFn)` hook, which handles the `window.api` presence check, loading/error state, and cancellation consistently across all four.

## 4. Architecture improvements

- **`electron/main.ts`**: 114 lines shorter. Was one file mixing window setup, IPC wiring, and all bookmark-parsing logic; now it's wiring-only.
- **New `services/` layer**: `bookmarks/` and `windows/` each group related readers behind small, single-purpose modules — easier to unit-test in isolation than the old monolithic `main.ts`.
- **`registry.ts`**: one shared `reg.exe` wrapper (`queryKey`, `listSubkeys`) instead of every registry-reading feature reimplementing its own parsing.
- **`useElectronDataLoader.ts`**: removed ~100 lines of duplicated loading-state boilerplate across the four data hooks.
- **`EntityCard.tsx`**: one shared card component for Recent Apps / Recent Files / All Programs (mirrors `FavoriteCard`'s layout without duplicating it) — `FavoriteCard` stays separate since it has browser-specific concerns (colored source dot, favicon URLs) that don't apply elsewhere.
- **`TabsContainer.tsx` / `App.tsx`**: left as-is — the existing "tabs array + switch statement" design already worked well for a 4th (and easily a 5th) tab with zero structural changes needed.

## 5. README.md

Fully rewritten — project overview, full architecture with the new `services/` layout, tab system explanation, how to run (`npm install` / `npm run dev` / `npm run electron:dev` / `npm run electron:package`), the mock-vs-Electron data flow (with an IPC sequence sketch), and an updated roadmap. See the delivered `README.md`.

---

## Suggested commit sequence

```
git commit -m "chore: add missing .gitignore"

git commit -m "refactor(electron): extract Chromium bookmark parsing into services/bookmarks/chromium.ts"

git commit -m "feat(electron): implement Firefox bookmark reading via places.sqlite

Resolves the active profile from profiles.ini, copies places.sqlite to a
temp file to avoid lock contention with a running Firefox, and queries it
with better-sqlite3. Adds better-sqlite3 + @types/better-sqlite3 +
@electron/rebuild (postinstall rebuild step) to package.json."

git commit -m "feat(electron): add Windows registry helper (services/windows/registry.ts)"

git commit -m "feat(electron): add Recent Apps via UserAssist registry key"

git commit -m "feat(electron): add Recent Files via the Windows Recent shell folder"

git commit -m "feat(electron): add Installed Programs via Uninstall registry keys"

git commit -m "feat(electron): add PowerShell-based icon extraction, cached by path"

git commit -m "refactor(electron): slim main.ts down to window setup + IPC wiring

All bookmark/registry/filesystem logic now lives in electron/services/.
main.ts registers one ipcMain.handle(...) per service call."

git commit -m "feat(preload): expose getRecentApps/getRecentFiles/getInstalledPrograms/getIcon on window.api"

git commit -m "refactor(hooks): introduce useElectronDataLoader and rebuild useFavoritesLoader on top of it"

git commit -m "feat(hooks): add useRecentAppsLoader, useRecentFilesLoader, useInstalledProgramsLoader"

git commit -m "feat(components): add shared EntityCard, wire real data into RecentAppsPage/RecentFilesPage/AllProgramsPage"

git commit -m "docs: rewrite README with full architecture, data flow, and roadmap"
```

## Testing performed

- `npx tsc -b` (renderer) — clean
- `npx tsc -p tsconfig.electron.json` (main process + all new services) — clean
- `npx vite build` — clean production build
- **Not tested**: actual runtime behavior of the registry/UserAssist/icon-extraction code on a real Windows machine (this delivery was built and type-checked in a Linux sandbox with no Windows registry to query against). Please treat `recentApps.ts` in particular as needing a validation pass — see the caveats noted in its file header.
