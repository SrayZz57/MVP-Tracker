import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeTeammateSynergy, computeNemesis } from './socialStats.js';
import { useAgentIcons } from './agentIcons.js';
import LoadingState from './LoadingState.jsx';
import PlatformFilterToggle from './PlatformFilterToggle.jsx';
import usePlatformFilter from './usePlatformFilter.js';

const GRAPH_SIZE = 480;
const CENTER = GRAPH_SIZE / 2;
const RADIUS = 180;
const MAX_NODES = 8;

function synergyColor(winrate) {
  if (winrate >= 60) return '#3ddc84';
  if (winrate >= 45) return 'var(--warning)';
  return 'var(--accent)';
}

function displayName(t, entry, myPuuid) {
  return entry.puuid === myPuuid ? t('social.you') : entry.name;
}

function SynergyGraph({ teammates, myPuuid, centerLabel, t }) {
  const shown = teammates.slice(0, MAX_NODES);

  if (shown.length === 0) {
    return <p>{t('social.notEnoughSynergyData')}</p>;
  }

  const maxGames = Math.max(...shown.map((tm) => tm.games));

  return (
    <svg viewBox={`0 0 ${GRAPH_SIZE} ${GRAPH_SIZE}`} className="synergy-graph">
      <defs>
        <radialGradient id="synergy-you-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="var(--accent-hover)" />
          <stop offset="100%" stopColor="var(--accent)" />
        </radialGradient>
        {shown.map((tm) => (
          <radialGradient key={`grad-${tm.puuid}`} id={`synergy-node-${tm.puuid}`} cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor={synergyColor(tm.winrate)} stopOpacity="1" />
            <stop offset="100%" stopColor={synergyColor(tm.winrate)} stopOpacity="0.72" />
          </radialGradient>
        ))}
      </defs>

      <circle cx={CENTER} cy={CENTER} r={RADIUS} className="synergy-ring" />
      <circle cx={CENTER} cy={CENTER} r={RADIUS * 0.55} className="synergy-ring synergy-ring-inner" />

      {shown.map((tm, i) => {
        const angle = (2 * Math.PI * i) / shown.length - Math.PI / 2;
        const x = CENTER + RADIUS * Math.cos(angle);
        const y = CENTER + RADIUS * Math.sin(angle);
        return (
          <line
            key={`line-${tm.puuid}`}
            x1={CENTER}
            y1={CENTER}
            x2={x}
            y2={y}
            stroke={synergyColor(tm.winrate)}
            strokeWidth={2 + (tm.games / maxGames) * 4}
            opacity={0.5}
            className="synergy-link"
          />
        );
      })}

      <circle cx={CENTER} cy={CENTER} r={28} fill="url(#synergy-you-glow)" className="synergy-node-you" />
      <text x={CENTER} y={CENTER + 5} textAnchor="middle" className="synergy-label synergy-label-you-emoji">
        🫵
      </text>
      <text x={CENTER} y={CENTER + 48} textAnchor="middle" className="synergy-label synergy-label-you">
        {centerLabel}
      </text>

      {shown.map((tm, i) => {
        const angle = (2 * Math.PI * i) / shown.length - Math.PI / 2;
        const x = CENTER + RADIUS * Math.cos(angle);
        const y = CENTER + RADIUS * Math.sin(angle);
        const nodeRadius = 18 + (tm.games / maxGames) * 16;
        return (
          <g key={tm.puuid} className="synergy-node">
            <circle cx={x} cy={y} r={nodeRadius} fill={`url(#synergy-node-${tm.puuid})`} />
            <circle cx={x} cy={y} r={nodeRadius} className="synergy-node-outline" />
            <text x={x} y={y + 4} textAnchor="middle" className="synergy-label synergy-node-value">
              {tm.winrate.toFixed(0)}%
            </text>
            <text x={x} y={y + nodeRadius + 17} textAnchor="middle" className="synergy-label">
              {displayName(t, tm, myPuuid)}
            </text>
            <text x={x} y={y + nodeRadius + 31} textAnchor="middle" className="synergy-label synergy-label-meta">
              {t('social.gamesCount', { count: tm.games })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RankBadge({ rank }) {
  const medal = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : null;
  return (
    <span className={`rival-rank ${medal ? 'medal' : ''}`}>
      {medal ?? `#${rank + 1}`}
    </span>
  );
}

function initials(name) {
  const base = (name || '?').replace(/#.*$/, '').trim();
  return base.slice(0, 2).toUpperCase();
}

function TeammatesRivals({ settings, matches, loading, myPuuid }) {
  const { t } = useTranslation();
  const agentIcons = useAgentIcons();
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);
  const teammates = useMemo(
    () => computeTeammateSynergy(filteredMatches, settings.name, settings.tag),
    [filteredMatches, settings.name, settings.tag],
  );
  const nemesis = useMemo(
    () => computeNemesis(filteredMatches, settings.name, settings.tag),
    [filteredMatches, settings.name, settings.tag],
  );
  // Le centre du graphe représente le tracker actuellement consulté — "Toi"
  // seulement quand c'est vraiment le cas, sinon le pseudo de l'autre joueur.
  const centerLabel = settings.puuid === myPuuid ? t('social.you') : settings.name;

  if (matches.length === 0) {
    if (loading) return <LoadingState />;
    return <p>{t('social.noMatchesYet')}</p>;
  }

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <div className="card">
        <h3>{t('social.synergyTitle')}</h3>
        <p className="label">{t('social.synergyHint')}</p>
        <div className="synergy-graph-wrap">
          <SynergyGraph teammates={teammates} myPuuid={myPuuid} centerLabel={centerLabel} t={t} />
        </div>
      </div>

      <div className="nemesis-columns">
        <div className="card">
          <h3>{t('social.agentNemesisTitle')}</h3>
          <p className="label">{t('social.agentNemesisHint')}</p>
          {nemesis.agents.length === 0 ? (
            <p>{t('social.notEnoughAgentDuels')}</p>
          ) : (
            nemesis.agents.slice(0, 8).map((n, i) => (
              <div key={n.agent} className="stat-bar-row rival-row">
                <RankBadge rank={i} />
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
                <span className="stat-bar-meta">{t('social.killsDeathsMeta', { kills: n.kills, deaths: n.deaths })}</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3>{t('social.playerNemesisTitle')}</h3>
          <p className="label">{t('social.playerNemesisHint')}</p>
          {nemesis.players.length === 0 ? (
            <p>{t('social.notEnoughRepeatOpponents')}</p>
          ) : (
            nemesis.players.slice(0, 8).map((n, i) => (
              <div key={n.puuid} className="stat-bar-row rival-row">
                <RankBadge rank={i} />
                <span className="rival-avatar">{initials(displayName(t, n, myPuuid))}</span>
                <span className="stat-bar-label rival-name">{displayName(t, n, myPuuid)}</span>
                <span className="stat-bar-track">
                  <span
                    className={`stat-bar-fill ${n.winrate >= 50 ? 'good' : 'bad'}`}
                    style={{ width: `${n.winrate}%` }}
                  />
                </span>
                <span className="stat-bar-value">{n.winrate.toFixed(0)}%</span>
                <span className="stat-bar-meta">{t('social.crossedMatches', { count: n.games })}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default TeammatesRivals;
