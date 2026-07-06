# ⭐ Favorites Hub
A modern, fast and minimal **Electron + React + TypeScript** desktop application that displays all your browser bookmarks in one unified, elegant interface.  
Built with **Vite**, **Electron IPC**, and a clean modular architecture.

---

## 🚀 Features

- **Unified bookmarks view**  
  Automatically loads bookmarks from:
  - Google Chrome  
  - Microsoft Edge  
  - Brave (Chromium-compatible)  
  - Firefox (planned – SQLite `places.sqlite` integration)

- **Electron-powered filesystem access**  
  Real bookmark loading via `ipcMain.handle('get-bookmarks')`:
  - Reads Chromium bookmark JSON trees  
  - Recursively parses folders and URLs  
  - Normalizes results into a shared `FavoriteItem` type

- **Secure IPC bridge**  
  `preload.ts` exposes a minimal, safe API:
  ```ts
  window.api.getBookmarks()
  window.api.openExternal(url)
  ```

- **Responsive UI**  
  Clean dark graphite theme with amber accents, optimized for desktop and small screens.

- **Modular tab system**  
  Adding a new tab requires only:
  - A new entry in `TABS` (in `App.tsx`)
  - A new component rendered in the switch-case

- **Electron production-ready build**  
  - `base: './'` for correct `file://` loading  
  - Separate `tsconfig.electron.json` for main/preload  
  - Output to `dist-electron/`

---

## 🧩 Project Structure

```
favorites-hub/
│
├── electron/
│   ├── main.ts          # Electron main process (BrowserWindow + IPC)
│   ├── preload.ts       # Secure contextBridge API
│   └── tsconfig.electron.json
│
├── src/
│   ├── hooks/
│   │   └── useFavoritesLoader.ts   # Loads real bookmarks via window.api
│   ├── components/
│   │   └── FavoriteCard.tsx        # Opens links via Electron or window.open
│   ├── pages/
│   │   ├── FavoritesPage.tsx
│   │   ├── RecentAppsPage.tsx
│   │   ├── RecentFilesPage.tsx
│   │   └── AllProgramsPage.tsx
│   ├── types/
│   │   └── electron.d.ts           # Global type for window.api
│   └── App.tsx
│
├── vite.config.ts
├── tsconfig.json
├── package.json
└── README.md
```

---

## 🔧 Installation

```bash
git clone https://github.com/AlexKitipov/favorites-hub
cd favorites-hub
npm install
```

---

## 🛠 Development

Start Vite + Electron together:

```bash
npm run electron:dev
```

This runs:
- Vite dev server  
- Electron main process (watch mode)  
- Preload compilation  

---

## 📦 Production Build

```bash
npm run electron:package
```

This produces:
- `dist/` – Vite renderer build  
- `dist-electron/` – Electron main + preload  
- Fully functional production Electron app

---

## 🔒 Security

- `contextIsolation: true`  
- `nodeIntegration: false`  
- Only explicit APIs are exposed to the renderer  
- No direct filesystem access from React

---

## 🗺 Roadmap

- Firefox bookmark loading via `places.sqlite`
- Recent Apps (Windows Registry + Start Menu)
- Recent Files (Jump Lists + MRU)
- Installed Programs (Registry Uninstall keys)
- Custom bookmark categories
- Search and filtering

---

## 📄 License

MIT License  
Copyright © 2026 AlexKitipov
