import { useMemo, useState } from 'react';
import { useInstalledProgramsLoader } from '../hooks/useInstalledProgramsLoader';
import { EntityCard } from './EntityCard';

export function AllProgramsPage() {
  const { programs, isLoading, error } = useInstalledProgramsLoader();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q.length === 0) return programs;
    return programs.filter((p) => p.name.toLowerCase().includes(q));
  }, [programs, query]);

  return (
    <section className="favorites-page">
      <div className="favorites-page__toolbar">
        <input
          className="search-bar"
          type="search"
          placeholder="Search installed programs…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search installed programs"
        />
      </div>

      {isLoading && <p className="favorites-page__status">Loading installed programs…</p>}
      {error && <p className="favorites-page__status favorites-page__status--error">{error}</p>}
      {!isLoading && !error && filtered.length === 0 && (
        <p className="favorites-page__status">No programs match this search.</p>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="favorites-grid">
          {filtered.map((program) => (
            <EntityCard key={program.name} title={program.name} subtitle="Installed" iconPath={program.icon} />
          ))}
        </div>
      )}
    </section>
  );
}
