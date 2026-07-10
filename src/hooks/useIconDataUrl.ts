import { useEffect, useState } from 'react';
import { isElectron } from './useElectronDataLoader';

// Icon extraction (electron/services/windows/icons.ts) spawns a PowerShell
// process per unique path, so this is intentionally lazy (only called for
// cards actually rendered, not the whole list up front) and cached per
// component instance — the main-process side also caches by path, so
// re-renders/re-mounts of the same item are cheap too.
export function useIconDataUrl(targetPath: string | undefined): string | null {
  const [iconUrl, setIconUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!targetPath || !isElectron()) {
      setIconUrl(null);
      return;
    }

    let cancelled = false;
    window.api!.getIcon(targetPath).then((url) => {
      if (!cancelled) setIconUrl(url);
    });

    return () => {
      cancelled = true;
    };
  }, [targetPath]);

  return iconUrl;
}
