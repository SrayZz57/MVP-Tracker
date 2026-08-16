import { useMemo } from 'react';
import { deathTimingStats, clutchStats, economyImpactStats } from './valorantStats.js';

function TacticalAnalysis({ settings, matches }) {
  const timing = useMemo(() => deathTimingStats(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);
  const clutch = useMemo(() => clutchStats(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);
  const economy = useMemo(() => economyImpactStats(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>⏱️ Timing des morts ({timing.total} mort(s) analysée(s))</h3>
        {timing.total === 0 ? (
          <p>Pas encore de données.</p>
        ) : (
          timing.buckets.map((b) => (
            <div key={b.id} className="stat-bar-row">
              <span className="stat-bar-label">{b.label}</span>
              <span className="stat-bar-track">
                <span className="stat-bar-fill" style={{ width: `${b.percent ?? 4}%` }} />
              </span>
              <span className="stat-bar-value">{b.percent === null ? '?' : `${b.percent.toFixed(0)}%`}</span>
              <span className="stat-bar-meta">{b.count} mort(s)</span>
            </div>
          ))
        )}
        <p className="label" style={{ marginTop: '0.5rem' }}>
          Beaucoup de morts en entrée (0-20s) = tu prends l'initiative tôt (parfois trop). Beaucoup en fin de round
          = tu tiens tes positions mais te fais peut-être surprendre en fin de temps.
        </p>
      </div>

      <div className="card">
        <h3>🎯 Clutchs</h3>
        {clutch.attempts === 0 ? (
          <p>Aucune situation de clutch détectée pour l'instant.</p>
        ) : (
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{clutch.attempts}</div>
              <div className="label">Tentatives</div>
            </div>
            <div className="stat-tile">
              <div className="value">{clutch.wins}</div>
              <div className="label">Gagnés</div>
            </div>
            <div className="stat-tile">
              <div className="value">{clutch.winrate === null ? '?' : `${clutch.winrate.toFixed(0)}%`}</div>
              <div className="label">Winrate en clutch</div>
            </div>
          </div>
        )}
        <p className="label" style={{ marginTop: '0.5rem' }}>
          Un clutch = tu es le dernier vivant de ton équipe alors qu'au moins un adversaire est encore en vie.
        </p>
      </div>

      <div className="card">
        <h3>💰 Impact de l'économie</h3>
        {economy.every((t) => t.rounds === 0) ? (
          <p>Pas encore de données.</p>
        ) : (
          economy.map((t) => (
            <div key={t.id} className="stat-bar-row">
              <span className="stat-bar-label">{t.label}</span>
              <span className="stat-bar-track">
                <span
                  className={`stat-bar-fill ${t.winrate === null ? '' : t.winrate >= 50 ? 'good' : 'bad'}`}
                  style={{ width: `${t.winrate ?? 4}%` }}
                />
              </span>
              <span className="stat-bar-value">{t.winrate === null ? '?' : `${t.winrate.toFixed(0)}%`}</span>
              <span className="stat-bar-meta">{t.rounds} round(s)</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TacticalAnalysis;
