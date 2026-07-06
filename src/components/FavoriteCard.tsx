import type { FavoriteItem } from '../types/favorites';

interface FavoriteCardProps {
  item: FavoriteItem;
}

const BROWSER_LABELS: Record<FavoriteItem['sourceBrowser'], string> = {
  chrome: 'Chrome',
  edge: 'Edge',
  firefox: 'Firefox',
  brave: 'Brave'
};

function openUrl(url: string) {
  if (window.api) {
    // Running inside Electron: open in the OS default browser rather than
    // navigating the Electron window itself.
    window.api.openExternal(url);
  } else {
    // Plain browser mode fallback.
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

export function FavoriteCard({ item }: FavoriteCardProps) {
  return (
    <button
      className="favorite-card"
      onClick={() => openUrl(item.url)}
      title={item.url}
    >
      <span className={`favorite-card__browser-dot favorite-card__browser-dot--${item.sourceBrowser}`} />
      <span className="favorite-card__icon-wrap">
        {item.faviconUrl ? (
          <img
            className="favorite-card__icon"
            src={item.faviconUrl}
            alt=""
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.visibility = 'hidden';
            }}
          />
        ) : (
          <span className="favorite-card__icon-fallback">{item.title.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="favorite-card__title">{item.title}</span>
      <span className="favorite-card__browser-label">{BROWSER_LABELS[item.sourceBrowser]}</span>
    </button>
  );
}
