import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

// Node has no built-in Windows registry API, and adding a native module
// (e.g. `winreg`, `regedit`) means dealing with prebuilt binaries per Node/
// Electron ABI version. Shelling out to the `reg.exe` that ships with every
// Windows install avoids that entirely, at the cost of slightly uglier
// output parsing.

export interface RegistryValue {
  name: string;
  type: string;
  data: string;
}

// `reg query "<key>"` (no /s) lists the value entries directly under that
// key, plus a blank-line-separated list of immediate subkey paths. Value
// lines look like:
//   "    DisplayName    REG_SZ    Some App"
// Subkey lines are just the full path, e.g.:
//   "HKEY_LOCAL_MACHINE\...\Uninstall\{GUID}"
export async function queryKey(fullKeyPath: string): Promise<{ values: RegistryValue[]; subkeys: string[] }> {
  try {
    const { stdout } = await execFileAsync('reg', ['query', fullKeyPath]);
    const lines = stdout.split(/\r?\n/).filter((l) => l.length > 0);

    const values: RegistryValue[] = [];
    const subkeys: string[] = [];

    for (const line of lines) {
      if (line.startsWith(fullKeyPath) || /^[A-Z]+_[A-Z]+\\/.test(line.trim())) {
        // A line that IS a key path (not indented) is a subkey listing.
        if (line.trim() !== fullKeyPath) subkeys.push(line.trim());
        continue;
      }
      // Value lines are indented with 4 spaces: "    Name    REG_TYPE    Data"
      const match = line.match(/^\s{4}(\S.*?)\s{4}(REG_\S+)\s{4}(.*)$/);
      if (match) {
        values.push({ name: match[1], type: match[2], data: match[3] });
      }
    }

    return { values, subkeys };
  } catch (err) {
    // Key not found, or reg.exe unavailable (non-Windows dev machine) —
    // treat as "no data" rather than throwing, so callers can aggregate
    // across many keys without one missing key failing everything.
    return { values: [], subkeys: [] };
  }
}

// Recursively lists every subkey path under `fullKeyPath`, one level at a
// time (breadth-first) up to `maxDepth`. Used for things like the Uninstall
// key, which is a flat list of GUID/product-code subkeys.
export async function listSubkeys(fullKeyPath: string): Promise<string[]> {
  const { subkeys } = await queryKey(fullKeyPath);
  return subkeys;
}
