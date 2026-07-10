import { writeFileSync, mkdirSync } from 'node:fs';

// dist-electron/*.js is compiled with "module": "CommonJS" (see
// tsconfig.electron.json) — main.ts/preload.ts/services use require() and
// module.exports under the hood. But the project's root package.json has
// "type": "module" (needed for the Vite/React renderer side), and Node
// determines a .js file's module system from the *nearest* ancestor
// package.json. Without this file, dist-electron/main.js would inherit
// "type": "module" from the root and fail on startup with something like
// "ReferenceError: require is not defined in ES module scope".
//
// Dropping a minimal package.json here overrides that for everything under
// dist-electron/ (including nested subfolders like services/), with zero
// changes needed to any import path or file extension elsewhere in the
// Electron source.
mkdirSync('dist-electron', { recursive: true });
writeFileSync('dist-electron/package.json', JSON.stringify({ type: 'commonjs' }, null, 2) + '\n');
console.log('[electron] wrote dist-electron/package.json ({ "type": "commonjs" })');
