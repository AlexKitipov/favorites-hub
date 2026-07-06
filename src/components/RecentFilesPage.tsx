// Placeholder for a future tab. When implemented, this will likely follow
// the same shape as FavoritesPage: a `useRecentFilesLoader` hook returning
// `RecentFile[]` (see src/types/future.ts), plus a grid/list of cards
// showing name, type, and lastOpened.
export function RecentFilesPage() {
  return (
    <section className="placeholder-page">
      <p className="placeholder-page__title">Recent Files</p>
      <p className="placeholder-page__hint">
        Not implemented yet. This will list recently opened files, backed by a
        RecentFile[] data source (see src/types/future.ts).
      </p>
    </section>
  );
}
