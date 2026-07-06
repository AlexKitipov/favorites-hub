import { useMemo, useState } from 'react';
import { useFavoritesLoader } from '../hooks/useFavoritesLoader';
import type { SourceBrowser } from '../types/favorites';
import { FavoriteCard } from './FavoriteCard';

type BrowserFilter = 'all' | SourceBrowser;

const FILTERS: { id: BrowserFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'chrome', label: 'Chrome' },
  { id: 'edge', label: 'Edge' },
  { id: 'firefox', label: 'Firefox' },
  { id: 'brave', label: 'Brave' }
];

export function FavoritesPage() {
  const { favorites, isLoading, error } = useFavoritesLoader();
  const [filter, setFilter] = useState<BrowserFilter>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return favorites.filter((item) => {
      const matchesBrowser = filter === 'all' || item.sourceBrowser === filter;
      const matchesQuery =
        q.length === 0 ||
        item.title.toLowerCase().includes(q) ||
        item.url.toLowerCase().includes(q);
      return matchesBrowser && matchesQuery;
    });
  }, [favorites, filter, query]);

  return (
    <section className="favorites-page">
      <div className="favorites-page__toolbar">
        <div className="browser-filter" role="group" aria-label="Filter by browser">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              className={`browser-filter__chip ${filter === f.id ? 'browser-filter__chip--active' : ''}`}
              onClick={() => setFilter(f.id)}
            >
              {f.label}
            </button>
          ))}
        </div>

        <input
          className="search-bar"
          type="search"
          placeholder="Search by title or URL…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search favorites"
        />
      </div>

      {isLoading && <p className="favorites-page__status">Loading favorites…</p>}
      {error && <p className="favorites-page__status favorites-page__status--error">{error}</p>}

      {!isLoading && !error && filtered.length === 0 && (
        <p className="favorites-page__status">No favorites match this search.</p>
      )}

      {!isLoading && !error && filtered.length > 0 && (
        <div className="favorites-grid">
          {filtered.map((item) => (
            <FavoriteCard key={item.id} item={item} />
          ))}
        </div>
      )}
    </section>
  );
}
