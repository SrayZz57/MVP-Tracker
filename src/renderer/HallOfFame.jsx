import { useMemo } from 'react';
import { computeHallOfFame } from './hallOfFame.js';
import { useAgentIcons } from './agentIcons.js';

function formatDate(ms) {
  if (!ms) return '?';
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TrophyCard({ icon, title, value, valueLabel, context, agentIcon, empty }) {
  return (
    <div className={`trophy-card ${empty ? 'empty' : ''}`}>
      <div className="trophy-icon">{icon}</div>
      <div className="trophy-title">{title}</div>
      {empty ? (
        <p className="label">Pas encore débloqué — continue à jouer.</p>
      ) : (
        <>
          <div className="trophy-value">
            {value}
            {valueLabel && <span className="trophy-value-label">{valueLabel}</span>}
          </div>
          <div className="trophy-context">
            {agentIcon && <img src={agentIcon} alt="" className="trophy-context-icon" />}
            {context}
          </div>
        </>
      )}
    </div>
  );
}

function HallOfFame({ settings, matches }) {
  const agentIcons = useAgentIcons();
  const hof = useMemo(() => computeHallOfFame(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>🏆 Hall of Fame</h3>
        <p className="label">
          Tes meilleurs records personnels, détectés automatiquement dans ton historique de matchs — mis à jour dès
          qu'un nouveau record tombe.
        </p>
      </div>

      <div className="trophy-grid">
        <TrophyCard
          icon="💥"
          title="Meilleur ace"
          empty={!hof.bestAce}
          value={hof.bestAce?.kills}
          valueLabel="kills en un round"
          agentIcon={hof.bestAce && agentIcons.get(hof.bestAce.agent)}
          context={hof.bestAce && `${hof.bestAce.agent} — ${hof.bestAce.map}, round ${hof.bestAce.roundNumber} — ${formatDate(hof.bestAce.date)}`}
        />
        <TrophyCard
          icon="🔥"
          title="Plus longue série de victoires"
          empty={!hof.longestWinStreak}
          value={hof.longestWinStreak?.streak}
          valueLabel="victoires d'affilée"
          context={
            hof.longestWinStreak &&
            `Du ${formatDate(hof.longestWinStreak.startDate)} au ${formatDate(hof.longestWinStreak.endDate)}`
          }
        />
        <TrophyCard
          icon="🎯"
          title="Meilleur clutch"
          empty={!hof.bestClutch}
          value={hof.bestClutch && `1v${hof.bestClutch.enemies}`}
          valueLabel="gagné"
          agentIcon={hof.bestClutch && agentIcons.get(hof.bestClutch.agent)}
          context={hof.bestClutch && `${hof.bestClutch.agent} — ${hof.bestClutch.map}, round ${hof.bestClutch.roundNumber} — ${formatDate(hof.bestClutch.date)}`}
        />
        <TrophyCard
          icon="⭐"
          title="Meilleur KDA sur un match"
          empty={!hof.bestKda}
          value={hof.bestKda?.kda.toFixed(2)}
          valueLabel={hof.bestKda && `${hof.bestKda.kills}/${hof.bestKda.deaths}/${hof.bestKda.assists}`}
          agentIcon={hof.bestKda && agentIcons.get(hof.bestKda.agent)}
          context={hof.bestKda && `${hof.bestKda.agent} — ${hof.bestKda.map} — ${formatDate(hof.bestKda.date)}`}
        />
      </div>
    </div>
  );
}

export default HallOfFame;
