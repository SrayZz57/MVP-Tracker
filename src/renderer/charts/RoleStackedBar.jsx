import { useTranslation } from 'react-i18next';

export const ROLE_COLORS = {
  Duelliste: '#3987e5',
  Initiateur: '#d95926',
  Contrôleur: '#199e70',
  Sentinelle: '#c98500',
};

function RoleStackedBar({ rows }) {
  const { t } = useTranslation();
  if (!rows || rows.length === 0) {
    return <p>{t('charts.notEnoughData')}</p>;
  }

  return (
    <div>
      <div className="stacked-bar">
        {rows.map((r) => (
          <span
            key={r.role}
            className="stacked-bar-segment"
            style={{ width: `${r.percent}%`, background: ROLE_COLORS[r.role] }}
            title={`${r.role} · ${r.percent.toFixed(0)}% (${t('charts.gamesCount', { count: r.games })})`}
          />
        ))}
      </div>
      <div className="stacked-bar-legend">
        {rows.map((r) => (
          <span key={r.role} className="stacked-bar-legend-item">
            <span className="stacked-bar-swatch" style={{ background: ROLE_COLORS[r.role] }} />
            {r.role} · {r.percent.toFixed(0)}% ({r.games})
          </span>
        ))}
      </div>
    </div>
  );
}

export default RoleStackedBar;
