import { useMemo } from 'react';
import NetworkMonitor from '../NetworkMonitor.jsx';
import { pingCorrelation } from '../valorantStats.js';

const RADIUS = 52;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function PingGauge({ percent }) {
  const offset = CIRCUMFERENCE * (1 - percent / 100);
  const color = percent >= 30 ? 'var(--accent)' : percent >= 15 ? 'var(--warning)' : '#3ddc84';

  return (
    <div className="ping-gauge">
      <svg viewBox="0 0 120 120">
        <circle className="ping-gauge-track" cx="60" cy="60" r={RADIUS} />
        <circle
          className="ping-gauge-fill"
          cx="60"
          cy="60"
          r={RADIUS}
          style={{ stroke: color, strokeDasharray: CIRCUMFERENCE, strokeDashoffset: offset }}
        />
      </svg>
      <div className="ping-gauge-center">
        <div className="value" style={{ color }}>{percent.toFixed(0)}%</div>
        <div className="label">morts en pic</div>
      </div>
    </div>
  );
}

function NetworkTab({ settings, matches, pingSamples }) {
  const pingStats = useMemo(
    () => pingCorrelation(matches, pingSamples, settings.name, settings.tag),
    [matches, pingSamples, settings.name, settings.tag],
  );

  const percent = pingStats.deathsAnalyzed > 0 ? (pingStats.deathsNearSpike / pingStats.deathsAnalyzed) * 100 : 0;

  return (
    <div>
      <NetworkMonitor />

      <div className="card">
        <h3>💀 Corrélation ping / morts</h3>
        {pingStats.deathsAnalyzed === 0 ? (
          <p>
            Pas encore assez de données réseau pendant tes matchs pour calculer une corrélation
            (il faut avoir l'appli ouverte pendant que tu joues).
          </p>
        ) : (
          <div className="ping-correlation-layout">
            <PingGauge percent={percent} />
            <div className="ping-correlation-details">
              <div className="stat-tiles">
                <div className="stat-tile">
                  <div className="value">{pingStats.deathsAnalyzed}</div>
                  <div className="label">Morts analysées au total</div>
                </div>
                <div className="stat-tile">
                  <div className="value">{pingStats.deathsNearSpike}</div>
                  <div className="label">Pendant un pic de ping</div>
                </div>
              </div>
              <p className="label" style={{ marginTop: '0.75rem' }}>
                Soit {percent.toFixed(0)}% de tes morts analysées qui ont eu lieu pendant un pic de ping (ping 30%
                au-dessus de la moyenne de la partie).
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default NetworkTab;
