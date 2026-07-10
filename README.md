# ⭐ Favorites Hub

A Windows desktop start page — built with **React + TypeScript + Vite + Electron** — that brings together everything you'd otherwise go hunting for across File Explorer and multiple browsers: your **bookmarks**, **recently used apps**, **recently opened files**, and **installed programs**, in one fast, keyboard-friendly grid.

---

## 1. Project Overview

### What it does

Favorites Hub opens to a single page with four tabs:

| Tab | Shows |
|---|---|
| **Favorites** | Bookmarks aggregated from Chrome, Edge, Brave, and Firefox |
| **Recent Apps** | Recently launched programs (Windows UserAssist) |
| **Recent Files** | Recently opened files (Windows Recent shell folder) |
| **All Programs** | Everything installed on the machine, searchable |

Click any card to open it — a URL opens in your default browser, a file opens with its default app, an app launches directly.

### Main features

- **Real, unified bookmark loading** — not a mock: Chrome, Edge, and Brave bookmark JSON files, plus Firefox's `places.sqlite`, are all parsed and merged into one list with a favicon per item.
- **Filter + search** on Favorites (by browser) and All Programs (by name).
- **Windows-native data**, read via Electron's main process — no cloud sync, no third-party account, nothing leaves the machine.
- **Icon extraction** for apps/programs via a small PowerShell bridge, cached per session.
- **Runs standalone in a browser too** — without Electron, every tab falls back to representative mock data, so the UI is still fully explorable (e.g. for UI development, or a quick demo).

### Technologies used

- **React 18 + TypeScript** — UI
- **Vite** — dev server & renderer build
- **Electron** — desktop shell, filesystem/registry access via IPC
- **sql.js** — reads Firefox's `places.sqlite` (SQLite compiled to WebAssembly — no native compilation, works on any machine without a C++ build toolchain)
- Windows `reg.exe` and PowerShell (`System.Drawing`), invoked via `child_process` — registry reads and icon extraction, with no native Windows-API addon required

---

## 2. Architecture

### Folder structure

```
favorites-hub/
├── electron/                     # Electron main process (Node context, compiled separately)
│   ├── main.ts                   # Window creation + IPC wiring only
│   ├── preload.ts                # contextBridge — exposes window.api to the renderer
│   ├── types.ts                  # Mirrors src/types/* for the main-process side
│   └── services/
│       ├── bookmarks/
│       │   ├── chromium.ts       # Chrome / Edge / Brave — shared JSON tree parser
│       │   ├── firefox.ts        # Firefox — places.sqlite via sql.js (WASM)
│       │   └── index.ts          # getAllBookmarks() — merges all four sources
│       └── windows/
│           ├── registry.ts       # Thin wrapper around reg.exe (query/list subkeys)
│           ├── recentApps.ts     # UserAssist registry → RecentApp[]
│           ├── recentFiles.ts    # "Recent" shell folder → RecentFile[]
│           ├── installedPrograms.ts  # Uninstall registry keys → InstalledProgram[]
│           └── icons.ts          # PowerShell-based icon extraction, cached
│
├── src/                          # React renderer (Vite/ESM, browser context)
│   ├── main.tsx / App.tsx / App.css
│   ├── types/
│   │   ├── favorites.ts          # FavoriteItem
│   │   ├── future.ts             # RecentApp, RecentFile, InstalledProgram
│   │   └── electron.d.ts         # window.api type declaration
│   ├── components/
│   │   ├── TabsContainer.tsx     # Pure tab switcher, knows nothing about tab content
│   │   ├── FavoritesPage.tsx / FavoriteCard.tsx
│   │   ├── RecentAppsPage.tsx / RecentFilesPage.tsx / AllProgramsPage.tsx
│   │   └── EntityCard.tsx        # Shared card UI for the three non-bookmark tabs
│   └── hooks/
│       ├── useElectronDataLoader.ts   # Generic "Electron IPC, else mock" loader
│       ├── useFavoritesLoader.ts
│       ├── useRecentAppsLoader.ts
│       ├── useRecentFilesLoader.ts
│       ├── useInstalledProgramsLoader.ts
│       └── useIconDataUrl.ts     # Lazy per-card icon resolution
│
├── package.json / vite.config.ts / tsconfig.json / tsconfig.electron.json
```

### Role of each directory

- **`/src/components`** — presentation only. Each tab has a `*Page.tsx` (data-fetching via a hook + layout) and, for Favorites, a dedicated `FavoriteCard`; the other three tabs share `EntityCard`. `TabsContainer` is intentionally dumb — it renders whatever `tabs` array it's given and reports clicks; it has no knowledge of what each tab contains.
- **`/src/hooks`** — all data-loading logic. Every hook follows the same shape: try Electron IPC, fall back to mock data, expose `{ data, isLoading, error }`. This is centralized in `useElectronDataLoader`, so each concrete hook is ~15 lines.
- **`/src/types`** — shared TypeScript contracts (`FavoriteItem`, `RecentApp`, `RecentFile`, `InstalledProgram`) plus the `window.api` ambient declaration, so the renderer is fully typed against what Electron actually exposes.
- **`/electron`** — everything that needs real OS access. Split into `services/bookmarks` (browser bookmark files) and `services/windows` (registry, shell folders, icon extraction), with `main.ts` reduced to just creating the window and registering one `ipcMain.handle(...)` per service call. This mirrors `src/types` on purpose but doesn't import from it — the main process compiles as CommonJS via a separate `tsconfig.electron.json`, so keeping it dependency-free of the renderer's ESM build avoids resolution issues.

### Tab system

`App.tsx` owns a single `activeTab: TabId` state (`'favorites' | 'recentApps' | 'recentFiles' | 'allPrograms'`) and a `TABS` array that's the single source of truth for what tabs exist and in what order. Switching is a plain `switch` statement rendering the matching page component — no router, since this is a single-window desktop app with no need for URL history. **Adding a new tab is two lines**: one entry in `TABS`, one `case` in the switch. `TabsContainer` never needs to change.

### FavoritesPage / useFavoritesLoader

`useFavoritesLoader` calls `window.api.getBookmarks()` when running in Electron (which internally calls `getAllBookmarks()` in the main process — Chrome + Edge + Brave + Firefox, aggregated) and falls back to a small in-memory mock list otherwise. `FavoritesPage` layers client-side filtering (by browser) and search (title/URL substring) on top of whatever list it received, and renders a responsive grid of `FavoriteCard`s. Clicking a card calls `window.api.openExternal(url)` in Electron, or `window.open` in plain-browser mode.

### Future expansion points

- **More browsers** — Vivaldi, Opera, Arc all use the same Chromium bookmark JSON format; add a path + call `readChromiumBookmarks` (see `electron/services/bookmarks/chromium.ts`).
- **Faster installed-programs load** — currently one `reg.exe` call per product key (~1-3s for 100+ apps). Could be cached to disk and refreshed on an interval instead of on every app launch.
- **True `.lnk` target resolution** for Recent Files (currently returns the shortcut's own path) — needs either a `.lnk` binary parser or a `WScript.Shell` COM call via the same PowerShell-bridge pattern used in `icons.ts`.
- **UserAssist format verification** — the binary offsets in `recentApps.ts` follow the commonly documented Windows 7+ layout, but Microsoft has changed this format across releases before; worth validating against a real machine before shipping.
- **Start Menu shortcut scanning** as a secondary/fallback source for All Programs, for apps that don't register an Uninstall key (portable apps, some dev tools).

---

## 3. How to Run the Project

```bash
# 1. Install dependencies
npm install
# (no native compilation step required — sql.js is pure WASM, and every
#  other Windows-integration feature shells out to reg.exe/PowerShell
#  instead of using a native Node addon)

# 2. Run as a plain browser app (mock data only, no Electron)
npm run dev
# → http://localhost:5173

# 3. Run the full desktop app (real bookmarks/registry/files access)
npm run electron:dev
```

`electron:dev` starts three things together: the Vite dev server, a `tsc --watch` compiling `electron/**/*.ts`, and Electron itself (waiting for both to be ready). Edit either the renderer or the main process and both hot-reload/relaunch appropriately.

> **Windows note:** the wait-then-launch step (`wait-on ... && npm run electron:start`) lives in its own `electron:wait-and-start` script rather than being inlined into the `concurrently` command. Combining `concurrently`'s `npm:script` shorthand with a `&&` inside one shell string breaks on Windows — `cmd.exe` (which `npm` scripts run through there) doesn't understand the `npm:` shorthand and errors with *"The filename, directory name, or volume label syntax is incorrect."* Keeping it as a real, standalone npm script sidesteps that.
>
> Separately, `electron:build` / `electron:dev` both run `scripts/write-electron-package-json.mjs` before Electron starts. This writes a `dist-electron/package.json` with `{ "type": "commonjs" }`, overriding the root `package.json`'s `"type": "module"` (needed for the Vite renderer) for just the compiled Electron output — without it, Node would try to load `dist-electron/main.js` as an ES module and fail with `require is not defined`.

### Building for distribution

```bash
npm run electron:package
```

This runs the full production build (`vite build` → `dist/`, `tsc -p tsconfig.electron.json` → `dist-electron/`) and launches the packaged app. For an installable `.exe`, wire in `electron-builder` or `electron-forge` on top of this — not included here.

### Troubleshooting

- **Packaging for distribution**: sql.js's `.wasm` file (`node_modules/sql.js/dist/sql-wasm.wasm`) is resolved at runtime via `require.resolve`, so it needs to actually ship inside `node_modules` in the packaged app — the default behavior of most Electron packagers (electron-builder, electron-forge) already includes `node_modules` unless you've explicitly excluded it. If you see a "cannot find module" error for `sql-wasm.wasm` in a packaged build, check your packager's file-inclusion config first.

---

## 4. How the Data Flow Works

### Mock data (no Electron)

Every hook in `src/hooks` checks `isElectron()` (`window.api !== undefined`). When false — running via plain `npm run dev` — each hook returns a small hardcoded array shaped exactly like the real data, so every page renders and is fully interactive without ever touching the filesystem.

### Real data (Electron)

```
renderer (React)              preload.ts              main.ts / services
─────────────────             ────────────             ──────────────────
useFavoritesLoader()
  window.api.getBookmarks() ─▶ ipcRenderer.invoke     ─▶ ipcMain.handle('get-bookmarks')
                                 ('get-bookmarks')          → getAllBookmarks()
                                                               ├─ readChromeBookmarks()   (JSON)
                                                               ├─ readEdgeBookmarks()     (JSON)
                                                               ├─ readBraveBookmarks()    (JSON)
                                                               └─ readFirefoxBookmarks()  (SQLite)
                              ◀── resolved FavoriteItem[] ◀──────────┘
```

- **Chrome / Edge / Brave**: all three store bookmarks as JSON at `%LocalAppData%\<Vendor>\<Browser>\User Data\Default\Bookmarks`, with the same tree shape (`roots.bookmark_bar` / `roots.other` / `roots.synced`, folders vs. `type: "url"` nodes). One shared recursive walker in `chromium.ts` handles all three.
- **Firefox**: bookmarks live in a SQLite database (`places.sqlite`), not JSON. `firefox.ts` first resolves the active profile from `profiles.ini` (profile folder names are randomized), copies `places.sqlite` to a temp file (it's often locked while Firefox is running), and queries it with `sql.js` (SQLite compiled to WebAssembly — chosen specifically because it needs no native compilation step, unlike a native addon such as `better-sqlite3`):
  ```sql
  SELECT moz_bookmarks.title, moz_places.url
  FROM moz_bookmarks
  JOIN moz_places ON moz_bookmarks.fk = moz_places.id
  WHERE moz_bookmarks.type = 1 AND moz_places.url IS NOT NULL
  ```
- **Recent Apps**: read from the `UserAssist` registry key (`HKCU\...\Explorer\UserAssist\{GUID}\Count`). Value names are ROT13-encoded; value data is a binary blob containing a run counter and a last-run `FILETIME`.
- **Recent Files**: `%AppData%\Microsoft\Windows\Recent` — Explorer keeps this folder populated with one `.lnk` shortcut per recently opened file. Read via plain `fs.readdir` + `fs.stat`, no registry involved.
- **Installed Programs**: enumerated from the three standard `Uninstall` registry keys (`HKLM` 64-bit, `HKLM\WOW6432Node` 32-bit, `HKCU` per-user), the same source Windows Settings → Apps uses.

### IPC surface

`electron/preload.ts` exposes exactly this on `window.api` (see `src/types/electron.d.ts` for the renderer-side type):

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

`contextIsolation` is enabled and `nodeIntegration` is disabled — the renderer never gets direct `fs`/`child_process` access, only these six methods.

---

## 5. Roadmap

- [x] Chrome / Edge bookmark parsing
- [x] Brave bookmark parsing
- [x] Firefox bookmark parsing (`places.sqlite`)
- [x] Recent Apps via Windows registry
- [x] Recent Files via Windows Recent folder
- [x] Installed Programs via Uninstall registry keys
- [x] Icon extraction for apps/programs
- [ ] Verify `UserAssist` binary offsets against a real Windows 10/11 machine
- [ ] Resolve actual `.lnk` targets for Recent Files (currently returns the shortcut path)
- [ ] Cache Installed Programs to disk, refresh on an interval instead of every launch
- [ ] Packaged installer (`electron-builder` / `electron-forge`)
- [ ] Drag-to-reorder favorites, per-tab pinning
- [ ] Dark/light theme toggle (currently dark-only)

---

## License

See [`LICENSE`](./LICENSE).
