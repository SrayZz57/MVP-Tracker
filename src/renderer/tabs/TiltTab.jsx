import { useMemo } from 'react';
import { formStats, tiltStatus } from '../valorantStats.js';

function TiltTab({ settings, matches }) {
  const form = useMemo(
    () => formStats(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  const tilt = useMemo(
    () => tiltStatus(matches, settings.name, settings.tag, form),
    [matches, settings.name, settings.tag, form],
  );

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
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
  );
}

export default TiltTab;
