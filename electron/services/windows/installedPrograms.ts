import type { InstalledProgram } from '../../types';
import { queryKey, listSubkeys } from './registry';

// The canonical list of "installed programs" (the same one Control Panel /
// Settings > Apps reads from) lives in the registry, not the Start Menu —
// Start Menu shortcuts are a reasonable secondary signal but plenty of
// installers don't create one, and some create several. These are the three
// standard locations, covering per-machine (32 and 64-bit) and per-user
// installs:
const UNINSTALL_KEYS = [
  'HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKLM\\SOFTWARE\\WOW6432Node\\Microsoft\\Windows\\CurrentVersion\\Uninstall',
  'HKCU\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Uninstall'
];

export async function getInstalledPrograms(): Promise<InstalledProgram[]> {
  const programs = new Map<string, InstalledProgram>();

  for (const uninstallKey of UNINSTALL_KEYS) {
    const productKeys = await listSubkeys(uninstallKey);

    // Reading each product's values is its own `reg query` call — for a
    // typical machine (50-150 entries under Uninstall) this is on the order
    // of a few seconds. Fine for a one-time load on app startup; if this
    // ever needs to be snappier, cache the result and refresh on an interval
    // instead of on every renderer request.
    const results = await Promise.all(
      productKeys.map(async (key) => {
        const { values } = await queryKey(key);
        const byName = Object.fromEntries(values.map((v) => [v.name, v.data]));
        return byName;
      })
    );

    for (const values of results) {
      const name = values.DisplayName;
      if (!name) continue; // Entries without a DisplayName are usually system components, not real apps.
      if (values.SystemComponent === '0x1') continue; // Explicitly flagged as "hidden" by its installer.

      // Prefer a real install path; fall back to the uninstall string's exe,
      // since DisplayIcon sometimes points at the exe too.
      const installLocation = values.InstallLocation || '';
      const icon = values.DisplayIcon ? values.DisplayIcon.split(',')[0] : undefined;

      if (!programs.has(name)) {
        programs.set(name, { name, path: installLocation, icon });
      }
    }
  }

  return Array.from(programs.values()).sort((a, b) => a.name.localeCompare(b.name));
}
