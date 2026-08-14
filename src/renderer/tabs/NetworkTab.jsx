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
        <h3>Corrélation ping / morts</h3>
        {pingStats.deathsAnalyzed === 0 ? (
          <p>
            Pas encore assez de données réseau pendant tes matchs pour calculer une corrélation
            (il faut avoir l'appli ouverte pendant que tu joues).
          </p>
        ) : (
          <p>
            {pingStats.deathsNearSpike} sur {pingStats.deathsAnalyzed} morts analysées ont eu lieu
            pendant un pic de ping (30% au-dessus de la moyenne de la partie).
          </p>
        )}
      </div>
    </div>
  );
}

export default NetworkTab;
