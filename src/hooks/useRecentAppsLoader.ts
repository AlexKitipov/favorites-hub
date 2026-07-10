import type { RecentApp } from '../types/future';
import { useElectronDataLoader } from './useElectronDataLoader';

interface UseRecentAppsLoaderResult {
  apps: RecentApp[];
  isLoading: boolean;
  error: string | null;
}

function loadMockRecentApps(): RecentApp[] {
  const now = Date.now();
  return [
    { name: 'Visual Studio Code', path: 'C:\\Program Files\\Microsoft VS Code\\Code.exe', lastUsed: new Date(now - 10 * 60 * 1000) },
    { name: 'Slack', path: 'C:\\Users\\Alex\\AppData\\Local\\slack\\slack.exe', lastUsed: new Date(now - 45 * 60 * 1000) },
    { name: 'Figma', path: 'C:\\Users\\Alex\\AppData\\Local\\Figma\\Figma.exe', lastUsed: new Date(now - 3 * 60 * 60 * 1000) }
  ];
}

async function loadElectronRecentApps(): Promise<RecentApp[]> {
  // Backed by the Windows UserAssist registry key — see
  // electron/services/windows/recentApps.ts for the decoding details.
  return window.api!.getRecentApps();
}

export function useRecentAppsLoader(): UseRecentAppsLoaderResult {
  const { data, isLoading, error } = useElectronDataLoader(loadElectronRecentApps, loadMockRecentApps);
  return { apps: data, isLoading, error };
}
