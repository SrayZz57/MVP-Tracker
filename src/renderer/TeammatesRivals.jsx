import { useMemo } from 'react';
import { computeTeammateSynergy, computeNemesis } from './socialStats.js';
import { useAgentIcons } from './agentIcons.js';

const GRAPH_SIZE = 480;
const CENTER = GRAPH_SIZE / 2;
const RADIUS = 180;
const MAX_NODES = 8;

function synergyColor(winrate) {
  if (winrate >= 60) return '#3ddc84';
  if (winrate >= 45) return 'var(--warning)';
  return 'var(--accent)';
}

function SynergyGraph({ teammates }) {
  const shown = teammates.slice(0, MAX_NODES);

  if (shown.length === 0) {
    return <p>Pas encore assez de matchs avec les mêmes coéquipiers pour dégager un réseau.</p>;
  }

  const maxGames = Math.max(...shown.map((t) => t.games));

  return (
    <svg viewBox={`0 0 ${GRAPH_SIZE} ${GRAPH_SIZE}`} className="synergy-graph">
      {shown.map((t, i) => {
        const angle = (2 * Math.PI * i) / shown.length - Math.PI / 2;
        const x = CENTER + RADIUS * Math.cos(angle);
        const y = CENTER + RADIUS * Math.sin(angle);
        return (
          <line
            key={`line-${t.puuid}`}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke={synergyColor(t.winrate)}
            strokeWidth={2 + (t.games / maxGames) * 4}
            opacity={0.55}
          />
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={26} fill="var(--accent)" opacity={0.9} />
      <text x={CENTER} y={CENTER + 45} textAnchor="middle" className="synergy-label synergy-label-you">
        Toi
      </text>

      {shown.map((t, i) => {
        const angle = (2 * Math.PI * i) / shown.length - Math.PI / 2;
        const x = CENTER + RADIUS * Math.cos(angle);
        const y = CENTER + RADIUS * Math.sin(angle);
        const color = synergyColor(t.winrate);
        const nodeRadius = 18 + (t.games / maxGames) * 16;
        return (
          <g key={t.puuid}>
            <circle cx={x} cy={y} r={nodeRadius} fill={color} opacity={0.85} />
            <text x={x} y={y + 4} textAnchor="middle" className="synergy-label synergy-node-value">
              {t.winrate.toFixed(0)}%
            </text>
            <text x={x} y={y + nodeRadius + 16} textAnchor="middle" className="synergy-label">
              {t.name}
            </text>
            <text x={x} y={y + nodeRadius + 30} textAnchor="middle" className="synergy-label synergy-label-meta">
              {t.games} parties
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function TeammatesRivals({ settings, matches }) {
  const agentIcons = useAgentIcons();
  const teammates = useMemo(
    () => computeTeammateSynergy(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );
  const nemesis = useMemo(
    () => computeNemesis(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>🤝 Synergie d'équipe</h3>
        <p className="label">
          Ton winrate avec chacun de tes coéquipiers récurrents (au moins 2 parties ensemble) — plus le lien est
          épais et vert, mieux ça se passe quand vous êtes dans la même équipe.
        </p>
        <div className="synergy-graph-wrap">
          <SynergyGraph teammates={teammates} />
        </div>
      </div>

      <div className="card">
        <h3>⚔️ Tes nemesis — agents</h3>
        <p className="label">Les agents adverses contre qui ton ratio kills/morts est le plus faible.</p>
        {nemesis.agents.length === 0 ? (
          <p>Pas encore assez de duels enregistrés contre un même agent.</p>
        ) : (
          nemesis.agents.slice(0, 8).map((n) => (
            <div key={n.agent} className="stat-bar-row">
              <span className="stat-bar-label">
                {agentIcons.get(n.agent) && <img src={agentIcons.get(n.agent)} alt="" className="stat-bar-icon" />}
                {n.agent}
              </span>
              <span className="stat-bar-track">
                <span
                  className={`stat-bar-fill ${n.kd >= 1 ? 'good' : 'bad'}`}
                  style={{ width: `${Math.min(100, (n.kd / 2) * 100)}%` }}
                />
              </span>
              <span className="stat-bar-value">{n.kd.toFixed(2)}</span>
              <span className="stat-bar-meta">{n.kills} kills / {n.deaths} morts</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h3>🎭 Tes nemesis — joueurs</h3>
        <p className="label">Les adversaires croisés plusieurs fois contre qui ton winrate est le plus faible.</p>
        {nemesis.players.length === 0 ? (
          <p>Pas encore assez de matchs contre les mêmes adversaires.</p>
        ) : (
          nemesis.players.slice(0, 8).map((n) => (
            <div key={n.puuid} className="stat-bar-row">
              <span className="stat-bar-label">{n.name}</span>
              <span className="stat-bar-track">
                <span
                  className={`stat-bar-fill ${n.winrate >= 50 ? 'good' : 'bad'}`}
                  style={{ width: `${n.winrate}%` }}
                />
              </span>
              <span className="stat-bar-value">{n.winrate.toFixed(0)}%</span>
              <span className="stat-bar-meta">{n.games} match(s) croisés</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default TeammatesRivals;
