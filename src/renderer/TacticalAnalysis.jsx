import { useMemo } from 'react';
import { deathTimingStats, clutchStats, economyImpactStats, duelDistanceStats } from './valorantStats.js';
import PostMortemHistory from './PostMortemHistory.jsx';
import LoadingState from './LoadingState.jsx';

const TIMING_ICONS = { early: '🏃', mid: '⚔️', late: '⏳' };
const ECONOMY_ICONS = { eco: '🥖', semi: '💵', full: '💰' };
const DISTANCE_ICONS = { close: '🔫', mid: '🎯', long: '🔭', verylong: '🏹' };

function clutchColor(winrate) {
  if (winrate === null) return 'var(--text)';
  if (winrate >= 50) return '#3ddc84';
  if (winrate >= 25) return 'var(--warning)';
  return 'var(--accent)';
}

function TacticalAnalysis({ settings, matches, loading }) {
  const timing = useMemo(() => deathTimingStats(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);
  const clutch = useMemo(() => clutchStats(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);
  const economy = useMemo(() => economyImpactStats(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);
  const distance = useMemo(() => duelDistanceStats(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);

  if (matches.length === 0) {
    if (loading) return <LoadingState />;
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
              <span className="stat-bar-label">{TIMING_ICONS[b.id]} {b.label}</span>
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
        <h3>📏 Duels par distance</h3>
        {distance.rows.every((r) => r.total === 0) ? (
          <p>Pas encore assez de données.</p>
        ) : (
          <>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value">
                  {distance.avgKillDistance === null ? '?' : `${distance.avgKillDistance.toFixed(1)}m`}
                </div>
                <div className="label">Distance moyenne de tes kills</div>
              </div>
              <div className="stat-tile">
                <div className="value">
                  {distance.avgDeathDistance === null ? '?' : `${distance.avgDeathDistance.toFixed(1)}m`}
                </div>
                <div className="label">Distance moyenne de tes morts</div>
              </div>
              <div className="stat-tile">
                <div className="value" style={{ color: distance.dropOff !== null && distance.dropOff > 0 ? 'var(--accent)' : undefined }}>
                  {distance.dropOff === null ? '?' : `${distance.dropOff > 0 ? '-' : '+'}${Math.abs(distance.dropOff).toFixed(0)} pts`}
                </div>
                <div className="label">Écart winrate courte → longue distance</div>
              </div>
            </div>

            {distance.rows.map((r) => (
              <div key={r.id} className="stat-bar-row" style={{ marginTop: '0.75rem' }}>
                <span className="stat-bar-label">{DISTANCE_ICONS[r.id]} {r.label}</span>
                <span className="stat-bar-track">
                  <span
                    className={`stat-bar-fill ${r.winrate === null ? '' : r.winrate >= 50 ? 'good' : 'bad'}`}
                    style={{ width: `${r.winrate ?? 4}%` }}
                  />
                </span>
                <span className="stat-bar-value">{r.winrate === null ? '?' : `${r.winrate.toFixed(0)}%`}</span>
                <span className="stat-bar-meta">{r.kills} kill(s) / {r.deaths} mort(s)</span>
              </div>
            ))}

            <p className="label" style={{ marginTop: '0.75rem' }}>
              Riot n'expose pas les tirs manqués, donc impossible de calculer une vraie précision de tir. Ce qui est
              affiché ici est le taux de victoire en duel (tes kills vs tes morts) selon la distance qui te séparait
              de l'adversaire au moment du kill — le meilleur indicateur disponible pour voir si ton aim tient à
              distance. Distance approximative (basée sur les unités du moteur du jeu, ≈ 1 unité = 1 cm).
            </p>
          </>
        )}
      </div>

      <div className="card comp-score-card">
        <h3>🎯 Clutchs</h3>
        {clutch.attempts === 0 ? (
          <p>Aucune situation de clutch détectée pour l'instant.</p>
        ) : (
          <>
            <div className="comp-score-main">
              <div className="comp-score-value" style={{ color: clutchColor(clutch.winrate) }}>
                {clutch.winrate === null ? '?' : clutch.winrate.toFixed(0)}
                <span className="comp-score-max">%</span>
              </div>
              <div className="label">Winrate en clutch</div>
            </div>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value">{clutch.attempts}</div>
                <div className="label">Tentatives</div>
              </div>
              <div className="stat-tile">
                <div className="value">{clutch.wins}</div>
                <div className="label">Gagnés</div>
              </div>
            </div>
          </>
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
              <span className="stat-bar-label">{ECONOMY_ICONS[t.id]} {t.label}</span>
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

      <PostMortemHistory />
    </div>
  );
}

export default TacticalAnalysis;
