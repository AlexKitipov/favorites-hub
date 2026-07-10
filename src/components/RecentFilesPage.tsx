import { useRecentFilesLoader } from '../hooks/useRecentFilesLoader';
import { EntityCard } from './EntityCard';

function openInExplorer(filePath: string) {
  if (window.api) {
    window.api.openExternal(filePath);
  }
}

export function RecentFilesPage() {
  const { files, isLoading, error } = useRecentFilesLoader();

  if (isLoading) return <p className="favorites-page__status">Loading recent files…</p>;
  if (error) return <p className="favorites-page__status favorites-page__status--error">{error}</p>;
  if (files.length === 0) return <p className="favorites-page__status">No recent files found.</p>;

  return (
    <section className="favorites-page">
      <div className="favorites-grid">
        {files.map((file) => (
          <EntityCard
            key={file.path}
            title={file.name}
            subtitle={file.type}
            onClick={() => openInExplorer(file.path)}
          />
        ))}
      </div>
    </section>
  );
}
