import { useEffect, useMemo, useRef, useState } from 'react';
import { useMapMinimaps, useMapCoordinates } from './mapImages.js';
import { deathLocationsOnMap } from './valorantStats.js';

const CANVAS_SIZE = 640;
const POINT_RADIUS = 26;

const MODES = [
  { id: 'deaths', label: '💀 Où je meurs' },
  { id: 'kills', label: '🔫 Où je kill' },
];

const SIDES = [
  { id: 'all', label: 'Tous les côtés' },
  { id: 'attack', label: '⚔️ Attaque' },
  { id: 'defense', label: '🛡️ Défense' },
];

function Heatmap({ settings, matches }) {
  const minimaps = useMapMinimaps();
  const mapCoordinates = useMapCoordinates();
  const [selectedMap, setSelectedMap] = useState('');
  const [mode, setMode] = useState('deaths');
  const [side, setSide] = useState('all');
  const [weapon, setWeapon] = useState('');
  const canvasRef = useRef(null);

  const mapNames = useMemo(() => [...minimaps.keys()].sort(), [minimaps]);

  useEffect(() => {
    if (!selectedMap && mapNames.length > 0) {
      setSelectedMap(mapNames[0]);
    }
  }, [mapNames, selectedMap]);

  useEffect(() => {
    setWeapon('');
  }, [selectedMap, mode, side]);

  const allPoints = useMemo(
    () => (selectedMap ? deathLocationsOnMap(matches, settings.name, settings.tag, selectedMap, mode) : []),
    [matches, settings.name, settings.tag, selectedMap, mode],
  );

  const sideFilteredPoints = useMemo(
    () => (side === 'all' ? allPoints : allPoints.filter((p) => p.side === side)),
    [allPoints, side],
  );

  const weaponNames = useMemo(
    () => [...new Set(sideFilteredPoints.map((p) => p.weapon).filter(Boolean))].sort(),
    [sideFilteredPoints],
  );

  const points = useMemo(
    () => (weapon === '' ? sideFilteredPoints : sideFilteredPoints.filter((p) => p.weapon === weapon)),
    [sideFilteredPoints, weapon],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    const imageUrl = minimaps.get(selectedMap);
    const coords = mapCoordinates.get(selectedMap);
    if (!canvas || !imageUrl || !coords) return;

    let cancelled = false;
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (cancelled) return;
      canvas.width = CANVAS_SIZE;
      canvas.height = CANVAS_SIZE;
      ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
      ctx.drawImage(img, 0, 0, CANVAS_SIZE, CANVAS_SIZE);

      const color = mode === 'kills' ? '61, 220, 132' : '255, 70, 85';
      ctx.globalCompositeOperation = 'lighter';
      points.forEach((p) => {
        const fx = coords.xMultiplier * p.y + coords.xScalarToAdd;
        const fy = coords.yMultiplier * p.x + coords.yScalarToAdd;
        const px = fx * CANVAS_SIZE;
        const py = fy * CANVAS_SIZE;
        const gradient = ctx.createRadialGradient(px, py, 0, px, py, POINT_RADIUS);
        gradient.addColorStop(0, `rgba(${color}, 0.35)`);
        gradient.addColorStop(1, `rgba(${color}, 0)`);
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(px, py, POINT_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalCompositeOperation = 'source-over';
    };
    img.src = imageUrl;

    return () => {
      cancelled = true;
    };
  }, [selectedMap, minimaps, mapCoordinates, points, mode]);

  return (
    <div>
      <div className="card">
        <h3>🔥 Heatmap</h3>
        <p className="label">
          Visualise où tu meurs (ou tues) le plus souvent sur chaque map, à partir de tous tes matchs en cache.
        </p>

        <div className="filter-bar">
          <select value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
            {mapNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          {MODES.map((m) => (
            <button
              key={m.id}
              className={m.id === mode ? 'strategy-tool active' : 'strategy-tool'}
              onClick={() => setMode(m.id)}
            >
              {m.label}
            </button>
          ))}
        </div>

        <div className="filter-bar">
          {SIDES.map((s) => (
            <button
              key={s.id}
              className={s.id === side ? 'strategy-tool active' : 'strategy-tool'}
              onClick={() => setSide(s.id)}
            >
              {s.label}
            </button>
          ))}
          <select value={weapon} onChange={(e) => setWeapon(e.target.value)}>
            <option value="">Toutes les armes</option>
            {weaponNames.map((w) => (
              <option key={w} value={w}>{w}</option>
            ))}
          </select>
          <span className="heatmap-point-count">📍 {points.length} point(s) analysé(s)</span>
          <div className="heatmap-legend">
            <span>faible</span>
            <span className={`heatmap-legend-bar ${mode}`} />
            <span>élevé</span>
          </div>
        </div>

        <div className="heatmap-canvas-wrap">
          <canvas ref={canvasRef} />
        </div>
      </div>
    </div>
  );
}

export default Heatmap;
