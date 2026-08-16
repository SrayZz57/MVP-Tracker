import { useMemo } from 'react';
import { findMe, resultLabel, formStats, tiltStatus } from '../valorantStats.js';

const STREAK_DOTS_COUNT = 10;

function TiltTab({ settings, matches }) {
  const form = useMemo(
    () => formStats(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  const tilt = useMemo(
    () => tiltStatus(matches, settings.name, settings.tag, form),
    [matches, settings.name, settings.tag, form],
  );

  const recentResults = useMemo(
    () =>
      matches.slice(0, STREAK_DOTS_COUNT).map((match) => {
        const me = findMe(match, settings.name, settings.tag);
        return { id: match.metadata?.matchid, label: resultLabel(match, me), map: match.metadata?.map };
      }),
    [matches, settings.name, settings.tag],
  );

  const last3KdRatio = form.overallKd && tilt.last3Kd !== null ? tilt.last3Kd / form.overallKd : null;

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className={`card tilt-card ${tilt.isTilted ? '' : 'calm'}`}>
        <h3>{tilt.isTilted ? '⚠️ Signes de tilt détectés' : '✅ Pas de signe de tilt'}</h3>
        {tilt.isTilted ? (
          <p className="warning">
            {tilt.lossStreakTilt && `${form.streakCount} défaites d'affilée. `}
            {tilt.perfDegradation &&
              `Perf en baisse sur les 3 derniers matchs (K/D ${tilt.last3Kd.toFixed(2)} vs moyenne ${form.overallKd.toFixed(2)}). `}
            Une pause pourrait aider.
          </p>
        ) : (
          <p>Continue comme ça, rien à signaler pour l'instant.</p>
        )}
      </div>

      <div className="card">
        <h3>🎯 Derniers résultats</h3>
        <div className="streak-dots">
          {recentResults.map((r) => (
            <span
              key={r.id}
              className={`streak-dot ${r.label === 'Victoire' ? 'win' : r.label === 'Défaite' ? 'loss' : 'neutral'}`}
              title={`${r.map ?? '?'} — ${r.label}`}
            />
          ))}
        </div>
        <p className="label" style={{ marginTop: '0.5rem' }}>
          Du plus récent (à gauche) au plus ancien (à droite) — vert = victoire, rouge = défaite.
        </p>
      </div>

      <div className="card">
        <h3>📊 Ce qui est surveillé</h3>
        <div className="stat-tiles">
          <div className="stat-tile">
            <div className="value" style={{ color: tilt.lossStreakTilt ? 'var(--accent)' : undefined }}>
              {form.streakType === 'Défaite' ? form.streakCount : 0}
            </div>
            <div className="label">Défaites d'affilée (seuil : 3)</div>
          </div>
          <div className="stat-tile">
            <div className="value" style={{ color: tilt.perfDegradation ? 'var(--accent)' : undefined }}>
              {tilt.last3Kd === null ? '?' : tilt.last3Kd.toFixed(2)}
            </div>
            <div className="label">K/D sur les 3 derniers matchs</div>
          </div>
          <div className="stat-tile">
            <div className="value">{last3KdRatio === null ? '?' : `${(last3KdRatio * 100).toFixed(0)}%`}</div>
            <div className="label">...de ta moyenne générale (seuil : 70%)</div>
          </div>
        </div>
      </div>

      <div className="card">
        <h3>ℹ️ Comment ça marche</h3>
        <p>Un signe de tilt est détecté si l'une de ces deux conditions est vraie :</p>
        <ul>
          <li>3 défaites d'affilée ou plus</li>
          <li>Ton K/D sur les 3 derniers matchs est inférieur à 70% de ta moyenne générale</li>
        </ul>
      </div>
    </div>
  );
}

export default TiltTab;
