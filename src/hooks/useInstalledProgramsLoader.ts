import type { InstalledProgram } from '../types/future';
import { useElectronDataLoader } from './useElectronDataLoader';

interface UseInstalledProgramsLoaderResult {
  programs: InstalledProgram[];
  isLoading: boolean;
  error: string | null;
}

function loadMockInstalledPrograms(): InstalledProgram[] {
  return [
    { name: 'Google Chrome', path: 'C:\\Program Files\\Google\\Chrome\\Application' },
    { name: 'Visual Studio Code', path: 'C:\\Program Files\\Microsoft VS Code' },
    { name: 'Node.js', path: 'C:\\Program Files\\nodejs' },
    { name: 'Slack', path: 'C:\\Users\\Alex\\AppData\\Local\\slack' }
  ];
}

async function loadElectronInstalledPrograms(): Promise<InstalledProgram[]> {
  // Backed by the Windows Uninstall registry keys — see
  // electron/services/windows/installedPrograms.ts.
  return window.api!.getInstalledPrograms();
}

export function useInstalledProgramsLoader(): UseInstalledProgramsLoaderResult {
  const { data, isLoading, error } = useElectronDataLoader(loadElectronInstalledPrograms, loadMockInstalledPrograms);
  return { programs: data, isLoading, error };
}
