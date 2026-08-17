import { useEffect, useState } from 'react';

// Ordre fixe (jamais recyclé) — 4 premiers slots de la palette catégorielle
// validée CVD (voir dataviz skill) contre la surface sombre de l'appli.
export const ROLE_COLORS = {
  Duelliste: '#3987e5',
  Initiateur: '#d95926',
  Contrôleur: '#199e70',
  Sentinelle: '#c98500',
};

function RoleStackedBar({ rows }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!rows || rows.length === 0) {
    return <p>Pas encore assez de données.</p>;
  }

  return (
    <div>
      <div className="stacked-bar">
        {rows.map((r) => (
          <span
            key={r.role}
            className="stacked-bar-segment"
            style={{ width: mounted ? `${r.percent}%` : '0%', background: ROLE_COLORS[r.role] }}
            title={`${r.role} — ${r.percent.toFixed(0)}% (${r.games} parties)`}
          />
        ))}
      </div>
      <div className="stacked-bar-legend">
        {rows.map((r) => (
          <span key={r.role} className="stacked-bar-legend-item">
            <span className="stacked-bar-swatch" style={{ background: ROLE_COLORS[r.role] }} />
            {r.role} — {r.percent.toFixed(0)}% ({r.games})
          </span>
        ))}
      </div>
    </div>
  );
}

export default RoleStackedBar;
