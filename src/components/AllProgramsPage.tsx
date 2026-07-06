// Placeholder for a future tab. When implemented, this will likely follow
// the same shape as FavoritesPage: a `useInstalledProgramsLoader` hook
// returning `InstalledProgram[]` (see src/types/future.ts), plus a
// searchable grid of installed applications.
export function AllProgramsPage() {
  return (
    <section className="placeholder-page">
      <p className="placeholder-page__title">All Programs</p>
      <p className="placeholder-page__hint">
        Not implemented yet. This will list installed programs, backed by an
        InstalledProgram[] data source (see src/types/future.ts).
      </p>
    </section>
  );
}
