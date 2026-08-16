import { useMemo } from 'react';
import NetworkMonitor from '../NetworkMonitor.jsx';
import { pingCorrelation } from '../valorantStats.js';

function NetworkTab({ settings, matches, pingSamples }) {
  const pingStats = useMemo(
    () => pingCorrelation(matches, pingSamples, settings.name, settings.tag),
    [matches, pingSamples, settings.name, settings.tag],
  );

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
          <>
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
            <p className="label" style={{ marginTop: '0.5rem' }}>
              Soit {((pingStats.deathsNearSpike / pingStats.deathsAnalyzed) * 100).toFixed(0)}% de tes morts
              analysées qui ont eu lieu pendant un pic de ping (ping 30% au-dessus de la moyenne de la partie).
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export default NetworkTab;
