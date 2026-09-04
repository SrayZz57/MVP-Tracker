import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Medal } from 'lucide-react';
import { computeTeammateSynergy, computeNemesis } from '../social/socialStats.js';
import { useAgentIcons } from '../data/agentIcons.js';
import { TeammatesRivalsSkeleton } from '../ui/skeletons.jsx';
import useLoadingGate from '../hooks/useLoadingGate.js';
import PlatformFilterToggle from '../ui/PlatformFilterToggle.jsx';
import usePlatformFilter from '../hooks/usePlatformFilter.js';
import CollapsibleCard from '../ui/CollapsibleCard.jsx';

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
      <User x={CENTER - 10} y={CENTER - 10} width={20} height={20} strokeWidth={1.75} className="synergy-label-you-emoji" />
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

const RANK_TIERS = ['gold', 'silver', 'bronze'];

function RankBadge({ rank }) {
  const tier = RANK_TIERS[rank] ?? null;
  return (
    <span className={`rival-rank ${tier ? `medal ${tier}` : ''}`}>
      {tier ? <Medal size={16} strokeWidth={1.75} /> : `#${rank + 1}`}
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
  const centerLabel = settings.puuid === myPuuid ? t('social.you') : settings.name;

  const loadingGate = useLoadingGate(loading && matches.length === 0);
  if (loadingGate.busy) return loadingGate.show ? <TeammatesRivalsSkeleton /> : null;
  if (matches.length === 0) return <p>{t('social.noMatchesYet')}</p>;

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <CollapsibleCard id="social.synergy" title={t('social.synergyTitle')}>
        <p className="label">{t('social.synergyHint')}</p>
        <div className="synergy-graph-wrap">
          <SynergyGraph teammates={teammates} myPuuid={myPuuid} centerLabel={centerLabel} t={t} />
        </div>
      </CollapsibleCard>

      <div className="nemesis-columns">
        <CollapsibleCard id="social.agentNemesis" title={t('social.agentNemesisTitle')}>
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
        </CollapsibleCard>

        <CollapsibleCard id="social.playerNemesis" title={t('social.playerNemesisTitle')}>
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
        </CollapsibleCard>
      </div>
    </div>
  );
}

export default TeammatesRivals;
