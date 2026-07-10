import type { RecentFile } from '../types/future';
import { useElectronDataLoader } from './useElectronDataLoader';

interface UseRecentFilesLoaderResult {
  files: RecentFile[];
  isLoading: boolean;
  error: string | null;
}

function loadMockRecentFiles(): RecentFile[] {
  const now = Date.now();
  return [
    { name: 'Q3-report', path: 'C:\\Users\\Alex\\Documents\\Q3-report.docx', type: 'DOCX', lastOpened: new Date(now - 20 * 60 * 1000) },
    { name: 'roadmap', path: 'C:\\Users\\Alex\\Documents\\roadmap.xlsx', type: 'XLSX', lastOpened: new Date(now - 2 * 60 * 60 * 1000) },
    { name: 'architecture-diagram', path: 'C:\\Users\\Alex\\Pictures\\architecture-diagram.png', type: 'PNG', lastOpened: new Date(now - 26 * 60 * 60 * 1000) }
  ];
}

async function loadElectronRecentFiles(): Promise<RecentFile[]> {
  // Backed by the Windows "Recent" shell folder — see
  // electron/services/windows/recentFiles.ts.
  return window.api!.getRecentFiles();
}

export function useRecentFilesLoader(): UseRecentFilesLoaderResult {
  const { data, isLoading, error } = useElectronDataLoader(loadElectronRecentFiles, loadMockRecentFiles);
  return { files: data, isLoading, error };
}
