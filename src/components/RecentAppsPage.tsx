import { useRecentAppsLoader } from '../hooks/useRecentAppsLoader';
import { EntityCard } from './EntityCard';

function formatRelativeTime(date: Date): string {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.round(diffMs / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.round(hours / 24)}d ago`;
}

function launchApp(appPath: string) {
  if (window.api) {
    // shell.openExternal also handles launching a local .exe, same as
    // double-clicking it in Explorer.
    window.api.openExternal(appPath);
  }
}

export function RecentAppsPage() {
  const { apps, isLoading, error } = useRecentAppsLoader();

  if (isLoading) return <p className="favorites-page__status">Loading recent apps…</p>;
  if (error) return <p className="favorites-page__status favorites-page__status--error">{error}</p>;
  if (apps.length === 0) return <p className="favorites-page__status">No recent apps found.</p>;

  return (
    <section className="favorites-page">
      <div className="favorites-grid">
        {apps.map((app) => (
          <EntityCard key={app.path} title={app.name} subtitle={formatRelativeTime(app.lastUsed)} iconPath={app.path} onClick={() => launchApp(app.path)} />
        ))}
      </div>
    </section>
  );
}
