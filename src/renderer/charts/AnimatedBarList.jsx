import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function sequentialColor(value) {
  const alpha = 0.35 + (Math.min(100, Math.max(0, value)) / 100) * 0.65;
  return `rgba(57, 135, 229, ${alpha})`;
}

// Barres horizontales, teinte séquentielle unique (bleu) dont l'intensité
// porte la magnitude — cohérent avec le reste de l'appli (.stat-bar-row) mais
// avec une entrée animée et une couleur dédiée aux graphiques.
function AnimatedBarList({ rows }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!rows || rows.length === 0) {
    return <p>{t('charts.notEnoughData')}</p>;
  }

  return (
    <div>
      {rows.map((row, i) => (
        <div key={row.key} className="stat-bar-row">
          <span className="stat-bar-label">{row.key}</span>
          <span className="stat-bar-track">
            <span
              className="stat-bar-fill"
              style={{
                width: mounted ? `${row.value}%` : '0%',
                background: sequentialColor(row.value),
                transitionDelay: `${i * 60}ms`,
              }}
            />
          </span>
          <span className="stat-bar-value">{row.value.toFixed(0)}%</span>
          {row.meta && <span className="stat-bar-meta">{row.meta}</span>}
        </div>
      ))}
    </div>
  );
}

export default AnimatedBarList;
