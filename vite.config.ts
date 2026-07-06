import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Vite config for Favorites Hub.
//
// - `npm run dev`: runs as a plain browser app at http://localhost:5173.
// - `npm run electron:dev`: Electron's BrowserWindow points at that same dev
//   server URL (see electron/main.ts + the "electron:dev" script), so no
//   special dev handling is needed here beyond the fixed port below.
// - `npm run build`: produces dist/index.html, which electron/main.ts loads
//   directly via `win.loadFile()` (a file:// URL) in production. `base: './'`
//   makes all asset references relative so that works — with the default
//   absolute base ('/'), assets would 404 under file://.
export default defineConfig({
  plugins: [react()],
  base: './',
  server: {
    port: 5173,
    strictPort: true
  }
});
