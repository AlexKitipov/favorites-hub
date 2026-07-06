// Placeholder for a future tab. When implemented, this will likely follow
// the same shape as FavoritesPage: a `useRecentAppsLoader` hook returning
// `RecentApp[]` (see src/types/future.ts), plus a grid of cards showing
// name, icon, and lastUsed.
export function RecentAppsPage() {
  return (
    <section className="placeholder-page">
      <p className="placeholder-page__title">Recent Apps</p>
      <p className="placeholder-page__hint">
        Not implemented yet. This will list recently launched programs, backed by a
        RecentApp[] data source (see src/types/future.ts).
      </p>
    </section>
  );
}
