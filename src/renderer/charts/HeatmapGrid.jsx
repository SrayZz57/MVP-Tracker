import { useEffect, useState } from 'react';
import { PERIODS } from '../performanceCharts.js';

function sequentialColor(value) {
  const alpha = 0.18 + (Math.min(100, Math.max(0, value)) / 100) * 0.72;
  return `rgba(57, 135, 229, ${alpha})`;
}

function HeatmapGrid({ grid }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="heatmap-grid-chart">
      <div className="heatmap-grid-row heatmap-grid-header">
        <span className="heatmap-grid-row-label" />
        {PERIODS.map((p) => (
          <span key={p.id} className="heatmap-grid-col-label">
            {p.icon} {p.label}
          </span>
        ))}
      </div>
      {grid.map((row, rowIndex) => (
        <div key={row.day} className="heatmap-grid-row">
          <span className="heatmap-grid-row-label">{row.day}</span>
          {row.periods.map((cell, colIndex) => {
            const delay = (rowIndex * PERIODS.length + colIndex) * 22;
            return (
              <div
                key={cell.id}
                className={`heatmap-grid-cell ${cell.games === 0 ? 'empty' : ''}`}
                style={{
                  background: cell.winrate === null ? undefined : sequentialColor(cell.winrate),
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? 'scale(1)' : 'scale(0.8)',
                  transitionDelay: `${delay}ms`,
                }}
                title={cell.games > 0 ? `${cell.games} partie(s) — ${cell.winrate.toFixed(0)}% winrate` : 'Aucune donnée'}
              >
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
