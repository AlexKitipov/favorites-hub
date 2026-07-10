import { useIconDataUrl } from '../hooks/useIconDataUrl';

interface EntityCardProps {
  title: string;
  subtitle: string;
  iconPath?: string;
  onClick?: () => void;
}

// Generic version of FavoriteCard's layout (icon tile + title + small label)
// for anything that isn't a browser bookmark: recent apps, recent files,
// installed programs. FavoriteCard stays separate since it has
// browser-specific concerns (the colored source dot, favicon URLs instead of
// extracted exe icons) that don't apply here.
export function EntityCard({ title, subtitle, iconPath, onClick }: EntityCardProps) {
  const iconUrl = useIconDataUrl(iconPath);

  return (
    <button className="favorite-card" onClick={onClick} title={subtitle} disabled={!onClick}>
      <span className="favorite-card__icon-wrap">
        {iconUrl ? (
          <img className="favorite-card__icon" src={iconUrl} alt="" loading="lazy" />
        ) : (
          <span className="favorite-card__icon-fallback">{title.charAt(0).toUpperCase()}</span>
        )}
      </span>
      <span className="favorite-card__title">{title}</span>
      <span className="favorite-card__browser-label">{subtitle}</span>
    </button>
  );
}
