import { useTranslation } from 'react-i18next';

function sequentialColor(value) {
  const alpha = 0.35 + (Math.min(100, Math.max(0, value)) / 100) * 0.65;
  return `rgba(57, 135, 229, ${alpha})`;
}

function AnimatedBarList({ rows }) {
  const { t } = useTranslation();
  if (!rows || rows.length === 0) {
    return <p>{t('charts.notEnoughData')}</p>;
  }

  return (
    <div>
      {rows.map((row) => (
        <div key={row.key} className="stat-bar-row">
          <span className="stat-bar-label">{row.key}</span>
          <span className="stat-bar-track">
            <span
              className="stat-bar-fill"
              style={{ width: `${row.value}%`, background: sequentialColor(row.value) }}
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
