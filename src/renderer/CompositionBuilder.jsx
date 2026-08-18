import { useMemo, useState } from 'react';
import { useMapMinimaps } from './mapImages.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';
import { mapStatsForAgent, excludeDeathmatch } from './valorantStats.js';
import { analyzeComposition, scoreComposition } from './compAnalysis.js';
import { getAgentMapTier, MAP_TIER_SOURCE_DATE } from './mapAgentTiers.js';

const SLOT_COUNT = 5;
const TIER_LABELS = { S: 'S', A: 'A', B: 'B' };
const NOTE_ICONS = { warning: '⚠️', info: 'ℹ️', good: '✅' };

function scoreColor(value) {
  if (value >= 75) return '#3ddc84';
  if (value >= 55) return 'var(--warning)';
  return 'var(--accent)';
}

function CompositionBuilder({ settings, matches }) {
  const minimaps = useMapMinimaps();
  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const [selectedMap, setSelectedMap] = useState('');
  const [slots, setSlots] = useState(Array(SLOT_COUNT).fill(''));

  const mapNames = useMemo(() => [...minimaps.keys()].sort(), [minimaps]);
  const agentNames = useMemo(() => [...agentIcons.keys()].sort(), [agentIcons]);

  const analysis = useMemo(() => analyzeComposition(slots, agentRoles), [slots, agentRoles]);
  const score = useMemo(
    () => scoreComposition(slots, selectedMap, agentRoles, getAgentMapTier),
    [slots, selectedMap, agentRoles],
  );

  const rankedMatches = useMemo(() => excludeDeathmatch(matches), [matches]);

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

  return (
    <div>
      <div className="card">
        <h3>🧩 Composition</h3>
        <p className="label">
          Choisis une map et 5 agents pour voir l'équilibre des rôles, un avis communautaire par agent/map, et
          comment tu performes toi-même avec ces agents sur cette map.
        </p>

        <div className="filter-bar">
          <select value={selectedMap} onChange={(e) => setSelectedMap(e.target.value)}>
            <option value="">— choisir une map —</option>
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
                  <option value="">— agent —</option>
                  {agentNames.map((name) => (
                    <option key={name} value={name}>{name}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      </div>

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
                  {score.overall}
                </div>
                <div className="comp-score-max">/100</div>
              </div>
            </div>
            <div className="label">Score de la compo sur {selectedMap}</div>
          </div>
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{score.roleScore}</div>
              <div className="label">Équilibre des rôles</div>
            </div>
            <div className="stat-tile">
              <div className="value">{score.mapFitScore === null ? '?' : score.mapFitScore}</div>
              <div className="label">Fit agents / map (avis communauté)</div>
            </div>
          </div>
          <p className="label comp-disclaimer">
            ⚠️ Score indicatif, pas une prédiction de winrate : moitié équilibre des rôles (règles générales), moitié
            avis communautaires sur les meilleurs agents par map, figés au {MAP_TIER_SOURCE_DATE}. La méta change à
            chaque patch — un agent non noté "S/A" n'est pas forcément mauvais, juste non cité comme meilleur choix
            par les sources consultées à cette date.
          </p>
        </div>
      )}

      <div className="card">
        <h3>Équilibre de la compo</h3>
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
            Choisis 5 agents pour voir les remarques.
          </p>
        ) : (
          <div className="comp-notes">
            {analysis.notes.map((note, i) => (
              <div key={i} className={`comp-note comp-note-${note.level}`}>
                <span className="comp-note-icon">{NOTE_ICONS[note.level] ?? 'ℹ️'}</span>
                {note.text}
              </div>
            ))}
          </div>
        )}
      </div>

      {selectedMap && personalStats.length > 0 && (
        <div className="card">
          <h3>Ton vécu sur {selectedMap}</h3>
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
                    {stats.games} partie(s) — K/D/A {stats.avgKills.toFixed(1)}/{stats.avgDeaths.toFixed(1)}/{stats.avgAssists.toFixed(1)}
                  </span>
                </>
              ) : (
                <span className="stat-bar-meta">Jamais joué cet agent sur cette map.</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default CompositionBuilder;
