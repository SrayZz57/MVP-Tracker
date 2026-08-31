import { useTranslation } from 'react-i18next';
import { Star } from 'lucide-react';
import Icon from '../Icon.jsx';
import { PERIODS } from '../performanceCharts.js';
import { dayLabelKey } from '../valorantStats.js';

function sequentialColor(value) {
  const alpha = 0.18 + (Math.min(100, Math.max(0, value)) / 100) * 0.72;
  return `rgba(57, 135, 229, ${alpha})`;
}

const MIN_GAMES_FOR_PEAK = 3;

function HeatmapGrid({ grid }) {
  const { t } = useTranslation();
  // Met en avant le créneau avec le meilleur winrate, à condition d'avoir un
  // minimum d'échantillon, sinon un 100% sur 1 seule partie ressortirait
  // comme "meilleur créneau" de façon trompeuse.
  let peakId = null;
  let peakWinrate = -1;
  grid.forEach((row) =>
    row.periods.forEach((cell) => {
      if (cell.games >= MIN_GAMES_FOR_PEAK && cell.winrate > peakWinrate) {
        peakWinrate = cell.winrate;
        peakId = `${row.day}-${cell.id}`;
      }
    }),
  );

  return (
    <div className="heatmap-grid-chart">
      <div className="heatmap-grid-row heatmap-grid-header">
        <span className="heatmap-grid-row-label" />
        {PERIODS.map((p) => (
          <span key={p.id} className="heatmap-grid-col-label">
            <Icon icon={p.icon} size={14} /> {t(`heatmap.periods.${p.id}`)}
          </span>
        ))}
      </div>
      {grid.map((row) => (
        <div key={row.day} className="heatmap-grid-row">
          <span className="heatmap-grid-row-label">{t(dayLabelKey(row.day))}</span>
          {row.periods.map((cell) => {
            const isPeak = `${row.day}-${cell.id}` === peakId;
            const tooltip =
              cell.games > 0
                ? t('heatmap.grid.gamesCount', { count: cell.games }) +
                  t('heatmap.grid.winrateSuffix', { percent: cell.winrate.toFixed(0) }) +
                  (isPeak ? t('heatmap.grid.peakSuffix') : '')
                : t('heatmap.grid.noData');
            return (
              <div
                key={cell.id}
                className={`heatmap-grid-cell ${cell.games === 0 ? 'empty' : ''} ${isPeak ? 'peak' : ''}`}
                style={{ background: cell.winrate === null ? undefined : sequentialColor(cell.winrate) }}
                title={tooltip}
              >
                {isPeak && <span className="heatmap-grid-cell-star"><Icon icon={Star} size={12} /></span>}
                {cell.winrate !== null ? `${cell.winrate.toFixed(0)}%` : '–'}
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

export default HeatmapGrid;
