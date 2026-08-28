import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMapMinimaps } from './mapImages.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';
import { mapStatsForAgent, excludeDeathmatch, groupStats } from './valorantStats.js';
import { analyzeComposition, scoreComposition } from './compAnalysis.js';
import { getAgentMapTier, MAP_TIER_SOURCE_DATE } from './mapAgentTiers.js';
import CountUp from './CountUp.jsx';
import PlatformFilterToggle from './PlatformFilterToggle.jsx';
import usePlatformFilter from './usePlatformFilter.js';
import CollapsibleCard from './CollapsibleCard.jsx';

const SLOT_COUNT = 5;
const TIER_LABELS = { S: 'S', A: 'A', B: 'B' };
const NOTE_ICONS = { warning: '⚠️', info: 'ℹ️', good: '✅' };

function scoreColor(value) {
  if (value >= 75) return '#3ddc84';
  if (value >= 55) return 'var(--warning)';
  return 'var(--accent)';
}

function CompositionBuilder({ settings, matches, mySettings, myMatches }) {
  const { t } = useTranslation();
  const minimaps = useMapMinimaps();
  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const [selectedMap, setSelectedMap] = useState('');
  const [slots, setSlots] = useState(Array(SLOT_COUNT).fill(''));
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);

  const mapNames = useMemo(() => [...minimaps.keys()].sort(), [minimaps]);
  const agentNames = useMemo(() => [...agentIcons.keys()].sort(), [agentIcons]);

  const analysis = useMemo(() => analyzeComposition(slots, agentRoles), [slots, agentRoles]);
  const score = useMemo(
    () => scoreComposition(slots, selectedMap, agentRoles, getAgentMapTier),
    [slots, selectedMap, agentRoles],
  );

  const rankedMatches = useMemo(() => excludeDeathmatch(filteredMatches), [filteredMatches]);

  const personalStats = useMemo(() => {
    if (!selectedMap) return [];
    return slots
      .filter(Boolean)
      .map((agent) => {
        const rows = mapStatsForAgent(rankedMatches, settings.name, settings.tag, agent);
        const onThisMap = rows.find((r) => r.key === selectedMap);
        return { agent, stats: onThisMap ?? null };
      });
  }, [slots, selectedMap, rankedMatches, settings.name, settings.tag]);

  const handleSlotChange = (index, value) => {
    setSlots((prev) => prev.map((v, i) => (i === index ? value : v)));
  };

  // Tes agents les plus joués, en accès rapide — toujours ceux du compte
  // lié (même en composant pour la map/l'historique de quelqu'un d'autre),
  // pas ceux du joueur actuellement affiché.
  const myRankedMatches = useMemo(() => excludeDeathmatch(myMatches ?? matches), [myMatches, matches]);
  const ownerSettings = mySettings ?? settings;
  const mostPlayedAgents = useMemo(
    () => groupStats(myRankedMatches, ownerSettings.name, ownerSettings.tag, (match, me) => me.character).slice(0, 8),
    [myRankedMatches, ownerSettings.name, ownerSettings.tag],
  );

  const handleQuickPick = (agentName) => {
    setSlots((prev) => {
      const emptyIndex = prev.findIndex((v) => !v);
      if (emptyIndex === -1) return prev;
      return prev.map((v, i) => (i === emptyIndex ? agentName : v));
    });
  };

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <CollapsibleCard id="composition.builder" title={t('composition.title')}>
        <p className="label">{t('composition.description')}</p>

        <div className="filter-bar">
          <select value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
            <option value="">{t('composition.chooseMap')}</option>
            {mapNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        <div className="comp-slots">
          {slots.map((value, index) => {
            const tier = value && selectedMap ? getAgentMapTier(value, selectedMap) : null;
            return (
              <div key={index} className={`comp-slot ${value ? 'filled' : ''}`}>
                <div className="comp-slot-icon">
                  {value && agentIcons.get(value) ? (
                    <img src={agentIcons.get(value)} alt={value} />
                  ) : (
                    <span>{index + 1}</span>
                  )}
                  {tier && <span className={`comp-slot-tier tier-${tier}`}>{TIER_LABELS[tier]}</span>}
                </div>
                <select value={value} onChange={(e) => handleSlotChange(index, e.target.value)}>
                  <option value="">{t('composition.chooseAgent')}</option>
                  {agentNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>

        {mostPlayedAgents.length > 0 && (
          <div className="comp-quickpicks">
            <span className="stats-scope-label">{t('composition.mostPlayedAgents')}</span>
            <div className="comp-quickpick-list">
              {mostPlayedAgents.map((row) => (
                <button
                  key={row.key}
                  className="comp-quickpick-chip"
                  disabled={slots.includes(row.key)}
                  onClick={() => handleQuickPick(row.key)}
                  title={
                    t('composition.quickpickGames', { count: row.games }) +
                    (row.winrate !== null ? t('composition.quickpickWinrateSuffix', { percent: row.winrate.toFixed(0) }) : '')
                  }
                >
                  {agentIcons.get(row.key) && <img src={agentIcons.get(row.key)} alt="" />}
                  {row.key}
                  <span className="comp-quickpick-games">{row.games}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </CollapsibleCard>

      {score && (
        <div className="card comp-score-card">
          <div className="comp-score-main">
            <div
              className="comp-score-ring"
              style={{
                background: `conic-gradient(${scoreColor(score.overall)} ${score.overall * 3.6}deg, var(--surface-alt) 0deg)`,
              }}
            >
              <div className="comp-score-ring-inner">
                <div className="comp-score-value" style={{ color: scoreColor(score.overall) }}>
                  <CountUp value={score.overall} />
                </div>
                <div className="comp-score-max">/100</div>
              </div>
            </div>
            <div className="label">{t('composition.compoScore', { map: selectedMap })}</div>
          </div>
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{score.roleScore}</div>
              <div className="label">{t('composition.roleBalance')}</div>
            </div>
            <div className="stat-tile">
              <div className="value">{score.mapFitScore === null ? '?' : score.mapFitScore}</div>
              <div className="label">{t('composition.mapFit')}</div>
            </div>
          </div>
          <p className="label comp-disclaimer">{t('composition.disclaimer', { date: MAP_TIER_SOURCE_DATE })}</p>
        </div>
      )}

      <CollapsibleCard id="composition.balance" title={t('composition.compoBalanceTitle')}>
        <div className="stat-tiles">
          {Object.entries(analysis.counts).map(([role, count]) => (
            <div key={role} className="stat-tile">
              <div className="value">{count}</div>
              <div className="label">{role}</div>
            </div>
          ))}
        </div>
        {analysis.notes.length === 0 ? (
          <p className="label" style={{ marginTop: '0.75rem' }}>
            {t('composition.chooseAgentsForNotes')}
          </p>
        ) : (
          <div className="comp-notes">
            {analysis.notes.map((note, i) => (
              <div key={i} className={`comp-note comp-note-${note.level}`}>
                <span className="comp-note-icon">{NOTE_ICONS[note.level] ?? 'ℹ️'}</span>
                {t(note.textKey)}
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>

      {selectedMap && personalStats.length > 0 && (
        <CollapsibleCard id="composition.experience" title={t('composition.yourExperienceOn', { map: selectedMap })}>
          {personalStats.map(({ agent, stats }) => (
            <div key={agent} className="stat-bar-row">
              <span className="stat-bar-label">
                {agentIcons.get(agent) && <img src={agentIcons.get(agent)} alt="" className="stat-bar-icon" />}
                {agent}
              </span>
              {stats ? (
                <>
                  <span className="stat-bar-track">
                    <span
                      className={`stat-bar-fill ${stats.winrate === null ? '' : stats.winrate >= 50 ? 'good' : 'bad'}`}
                      style={{ width: `${stats.winrate ?? 4}%` }}
                    />
                  </span>
                  <span className="stat-bar-value">
                    {stats.winrate === null ? '?' : `${stats.winrate.toFixed(0)}%`}
                  </span>
                  <span className="stat-bar-meta">
                    {t('composition.gamesKdaMeta', {
                      count: stats.games,
                      k: stats.avgKills.toFixed(1),
                      d: stats.avgDeaths.toFixed(1),
                      a: stats.avgAssists.toFixed(1),
                    })}
                  </span>
                </>
              ) : (
                <span className="stat-bar-meta">{t('composition.neverPlayed')}</span>
              )}
            </div>
          ))}
        </CollapsibleCard>
      )}
    </div>
  );
}

export default CompositionBuilder;
