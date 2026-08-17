import { useMemo } from 'react';
import { computeRankMomentum } from './rankMomentum.js';

function fmt(value, suffix = '') {
  return value === null ? '?' : `${value.toFixed(value < 10 ? 2 : 0)}${suffix}`;
}

function RankMomentumCard({ settings, matches }) {
  const momentum = useMemo(
    () => computeRankMomentum(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  if (!momentum.ready) {
    return (
      <div className="card">
        <h3>📈 Progression</h3>
        <p className="label">
          Encore {momentum.minGames - momentum.gamesAnalyzed} match(s) classé(s) avant de pouvoir comparer ta forme
          récente à ton niveau habituel.
        </p>
      </div>
    );
  }

  return (
    <div className={`card ${momentum.trending ? 'highlight-card' : ''}`}>
      <h3>📈 Progression</h3>
      {momentum.trending ? (
        <p className="warning" style={{ fontWeight: 600 }}>
          🚀 Tes performances dépassent nettement ta moyenne habituelle depuis un moment — tu es peut-être prêt à
          monter.
        </p>
      ) : (
        <p className="label">Ta forme récente est dans la continuité de ta moyenne habituelle.</p>
      )}

      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="value">
            {fmt(momentum.recentStats.kd)} <span className="label">vs {fmt(momentum.baselineStats.kd)}</span>
          </div>
          <div className="label">K/D récent vs habituel</div>
        </div>
        <div className="stat-tile">
          <div className="value">
            {fmt(momentum.recentStats.winrate, '%')} <span className="label">vs {fmt(momentum.baselineStats.winrate, '%')}</span>
          </div>
          <div className="label">Winrate récent vs habituel</div>
        </div>
        <div className="stat-tile">
          <div className="value">
            {fmt(momentum.recentStats.hsPercent, '%')} <span className="label">vs {fmt(momentum.baselineStats.hsPercent, '%')}</span>
          </div>
          <div className="label">Précision récente vs habituelle</div>
        </div>
      </div>

      <p className="label" style={{ marginTop: '0.75rem' }}>
        Comparaison sur tes 10 derniers matchs classés vs les précédents — pas de moyenne de joueurs de ton rang
        (donnée non disponible publiquement), juste toi comparé à toi-même.
      </p>
    </div>
  );
}

export default RankMomentumCard;
