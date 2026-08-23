import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

const DEFAULT_WIDTH = 600;
const HEIGHT = 240;
const PADDING = 24;

function LineChart({ data, color = '#ff4655', unit = '' }) {
  const { t } = useTranslation();
  const [hovered, setHovered] = useState(null);
  const wrapRef = useRef(null);
  const [width, setWidth] = useState(DEFAULT_WIDTH);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!data || data.length === 0) {
    return <p>{t('charts.notEnoughDataForChart')}</p>;
  }

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const points = data.map((d, i) => {
    const x = data.length === 1 ? width / 2 : PADDING + (i / (data.length - 1)) * (width - PADDING * 2);
    const y = HEIGHT - PADDING - ((d.value - min) / range) * (HEIGHT - PADDING * 2);
    return { x, y, label: d.label, value: d.value };
  });

  const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x} ${HEIGHT - PADDING} L ${points[0].x} ${HEIGHT - PADDING} Z`;
  const gradientId = `line-gradient-${color.replace('#', '')}`;

  return (
    <div className="line-chart-wrap" ref={wrapRef}>
      <svg viewBox={`0 0 ${width} ${HEIGHT}`} className="line-chart">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        <text x={PADDING} y={14} className="line-chart-axis">{max.toFixed(1)}{unit}</text>
        <text x={PADDING} y={HEIGHT - PADDING + 16} className="line-chart-axis">{min.toFixed(1)}{unit}</text>

        <path d={areaPath} fill={`url(#${gradientId})`} stroke="none" />
        <path d={linePath} fill="none" stroke={color} strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />

        {hovered !== null && (
          <line
            x1={points[hovered].x}
            y1={PADDING}
            x2={points[hovered].x}
            y2={HEIGHT - PADDING}
            className="line-chart-hover-line"
          />
        )}

        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={hovered === i ? 5.5 : 3.5} fill={color} />
            <circle
              cx={p.x}
              cy={p.y}
              r="12"
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'pointer' }}
            />
          </g>
        ))}
      </svg>

      {hovered !== null && (
        <div
          className="line-chart-tooltip"
          style={{ left: `${points[hovered].x}px`, top: `${points[hovered].y}px` }}
        >
          <strong>{points[hovered].value.toFixed(2)}{unit}</strong>
          <span>{points[hovered].label}</span>
        </div>
      )}
    </div>
  );
}

export default LineChart;
