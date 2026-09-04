import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, Info, CheckCircle2, Trash2 } from 'lucide-react';
import Icon from '../ui/Icon.jsx';
import { useMapMinimaps, useMapImages } from '../data/mapImages.js';
import { useAgentIcons, useAgentRoles } from '../data/agentIcons.js';
import { mapStatsForAgent, excludeDeathmatch, groupStats } from '../stats/valorantStats.js';
import { analyzeComposition, scoreComposition } from './compAnalysis.js';
import { getAgentMapTier, MAP_TIER_SOURCE_DATE } from './mapAgentTiers.js';
import { ROLE_COLORS } from '../charts/RoleStackedBar.jsx';
import { usePlayerCardArt } from '../data/rankData.js';
import { supabase } from '../account/supabaseClient.js';
import CountUp from '../ui/CountUp.jsx';
import PlatformFilterToggle from '../ui/PlatformFilterToggle.jsx';
import usePlatformFilter from '../hooks/usePlatformFilter.js';
import CollapsibleCard from '../ui/CollapsibleCard.jsx';
import Button from '../ui/Button';

const SLOT_COUNT = 5;
const TIER_LABELS = { S: 'S', A: 'A', B: 'B' };
const NOTE_ICONS = { warning: AlertTriangle, info: Info, good: CheckCircle2 };

function scoreColor(value) {
  if (value >= 75) return '#3ddc84';
  if (value >= 55) return 'var(--warning)';
  return 'var(--accent)';
}

function CompositionAuthor({ author }) {
  const avatarArt = usePlayerCardArt(author?.avatar_card_uuid);
  if (!author) return null;
  const name = author.display_name || (author.riot_name ? `${author.riot_name}#${author.riot_tag}` : null);
  if (!name) return null;

  return (
    <span className="comp-published-author">
      {avatarArt.icon ? (
        <img src={avatarArt.icon} alt="" className="comp-published-author-avatar" />
      ) : (
        <span className="comp-published-author-avatar comp-published-author-fallback">{name.charAt(0)}</span>
      )}
      {name}
    </span>
  );
}

function CompositionBuilder({ settings, matches, mySettings, myMatches, myId, isAdmin }) {
  const { t } = useTranslation();
  const minimaps = useMapMinimaps();
  const mapSplashes = useMapImages();
  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const [selectedMap, setSelectedMap] = useState('');
  const [slots, setSlots] = useState(Array(SLOT_COUNT).fill(''));
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);

  const mapNames = useMemo(() => [...minimaps.keys()].sort(), [minimaps]);
  const agentNames = useMemo(() => [...agentIcons.keys()].sort(), [agentIcons]);

  const [publishedComps, setPublishedComps] = useState([]);
  const [loadingComps, setLoadingComps] = useState(false);
  const [note, setNote] = useState('');
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState(null);

  const [publishedMapFilter, setPublishedMapFilter] = useState('');

  async function loadPublishedComps(map) {
    setLoadingComps(true);
    let query = supabase
      .from('map_compositions')
      .select('id, map, agents, note, created_at, created_by, author:profiles(display_name, riot_name, riot_tag, avatar_card_uuid)')
      .order('created_at', { ascending: false });
    query = map ? query.eq('map', map) : query.limit(30);
    const { data, error } = await query;
    if (!error) setPublishedComps(data ?? []);
    setLoadingComps(false);
  }

  useEffect(() => {
    setPublishedMapFilter(selectedMap);
    setNote('');
    setPublishError(null);
  }, [selectedMap]);

  useEffect(() => {
    loadPublishedComps(publishedMapFilter);
  }, [publishedMapFilter]);

  const canPublish = Boolean(selectedMap) && slots.every(Boolean) && Boolean(myId);

  async function handlePublish() {
    if (!canPublish) return;
    setPublishing(true);
    setPublishError(null);
    const { error } = await supabase.from('map_compositions').insert({
      map: selectedMap,
      agents: slots,
      note: note.trim() || null,
      created_by: myId,
    });
    setPublishing(false);
    if (error) {
      setPublishError(error.message);
      return;
    }
    setNote('');
    if (publishedMapFilter === selectedMap) {
      loadPublishedComps(selectedMap);
    } else {
      setPublishedMapFilter(selectedMap);
    }
  }

  async function handleDeletePublished(id) {
    await supabase.from('map_compositions').delete().eq('id', id);
    loadPublishedComps(publishedMapFilter);
  }

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

      <CollapsibleCard collapsible={false} id="composition.builder" title={t('composition.title')}>
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
                <Button
                  variant="ghost"
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
                </Button>
              ))}
            </div>
          </div>
        )}
      </CollapsibleCard>

      <CollapsibleCard
        id="composition.published"
        title={publishedMapFilter ? t('composition.publishedTitle', { map: publishedMapFilter }) : t('composition.publishedTitleAll')}
      >
        <p className="label">{selectedMap ? t('composition.publishedIntro') : t('composition.publishedIntroAll')}</p>

        <div className="filter-bar">
          <select value={publishedMapFilter} onChange={(e) => setPublishedMapFilter(e.target.value)}>
            <option value="">{t('composition.allMaps')}</option>
            {mapNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
        </div>

        {selectedMap && (
          <>
            <div className="comp-publish-form">
              <textarea
                className="comp-publish-note"
                placeholder={t('composition.notePlaceholder')}
                value={note}
                maxLength={280}
                onChange={(e) => setNote(e.target.value)}
              />
              <Button
                variant="primary"
                className="refresh"
                onClick={handlePublish}
                disabled={!canPublish}
                loading={publishing}
                loadingLabel={t('composition.publishing')}
              >
                {t('composition.publish')}
              </Button>
            </div>
            {!slots.every(Boolean) && <p className="label">{t('composition.publishNeedsFullSlots')}</p>}
            {publishError && <p className="warning">{publishError}</p>}
          </>
        )}

        {loadingComps ? (
          <p className="label">{t('composition.loadingPublished')}</p>
        ) : publishedComps.length === 0 ? (
          <p className="label">{t('composition.noPublishedYet')}</p>
        ) : (
          <ul className="comp-published-list">
            {publishedComps.map((comp) => (
              <li
                key={comp.id}
                className="comp-published-item"
                style={mapSplashes.get(comp.map) ? { '--map-thumb': `url(${mapSplashes.get(comp.map)})` } : undefined}
              >
                <div className="comp-published-thumb" aria-hidden="true" />
                <div className="comp-published-header">
                  <span className="comp-published-map">{comp.map}</span>
                  <span className="label comp-published-date">
                    {new Date(comp.created_at).toLocaleDateString()}
                  </span>
                </div>
                <div className="comp-published-agents">
                  {comp.agents.map((agent, i) => {
                    const role = agentRoles.get(agent)?.roleName;
                    return (
                      <span
                        key={i}
                        className="comp-published-agent-icon"
                        style={{ '--role-color': ROLE_COLORS[role] ?? 'var(--border)' }}
                        title={role ? `${agent} · ${role}` : agent}
                      >
                        {agentIcons.get(agent) ? <img src={agentIcons.get(agent)} alt={agent} /> : agent.charAt(0)}
                      </span>
                    );
                  })}
                </div>
                {comp.note && <p className="comp-published-note">« {comp.note} »</p>}
                <div className="comp-published-footer">
                  <CompositionAuthor author={comp.author} />
                  {(comp.created_by === myId || isAdmin) && (
                    <Button
                      variant="icon"
                      type="button"
                      className="strategy-tool icon-only danger"
                      title={t(comp.created_by === myId ? 'composition.deletePublished' : 'composition.deletePublishedAdmin')}
                      aria-label={t(comp.created_by === myId ? 'composition.deletePublished' : 'composition.deletePublishedAdmin')}
                      onClick={() => handleDeletePublished(comp.id)}
                    >
                      <Icon icon={Trash2} size={14} />
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
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

      <CollapsibleCard collapsible={false} id="composition.balance" title={t('composition.compoBalanceTitle')}>
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
                <span className="comp-note-icon"><Icon icon={NOTE_ICONS[note.level] ?? Info} size={16} /></span>
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
