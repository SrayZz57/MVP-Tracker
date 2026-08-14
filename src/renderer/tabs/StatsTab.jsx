import { useMemo, useState } from 'react';
import {
  findMe,
  resultLabel,
  hitStats,
  weaponKillsFor,
  groupStats,
  weaponKillsForAgent,
  agentTotalKills,
} from '../valorantStats.js';
import { useAgentIcons, useAgentPortraits } from '../agentIcons.js';
import { useMapImages } from '../mapImages.js';
import MatchDetailModal from '../MatchDetailModal.jsx';
import MapDetailModal from '../MapDetailModal.jsx';
import AgentDetailModal from '../AgentDetailModal.jsx';

function renderGroupTable(title, rows, iconFor, onRowClick) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Parties</th>
            <th>Winrate</th>
            <th>K/D/A moyen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className={onRowClick ? 'clickable' : ''} onClick={() => onRowClick?.(row.key)}>
              <td>
                {iconFor?.(row.key) && <img src={iconFor(row.key)} alt="" className="agent-icon" />}
                {row.key}
              </td>
              <td>{row.games}</td>
              <td>{row.winrate === null ? '?' : `${row.winrate.toFixed(0)}%`}</td>
              <td>
                {row.avgKills.toFixed(1)}/{row.avgDeaths.toFixed(1)}/{row.avgAssists.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function renderAgentCards(rows, portraits, matches, settings, onRowClick) {
  return (
    <div className="card">
      <h3>Stats par agent</h3>
      <div className="map-card-list">
        {rows.map((row) => {
          const image = portraits.get(row.key);
          const topWeapon = weaponKillsForAgent(matches, settings.name, settings.tag, row.key)[0];
          const kills = agentTotalKills(matches, settings.name, settings.tag, row.key);
          return (
            <div
              key={row.key}
              className="map-card agent-card"
              style={image ? { backgroundImage: `url(${image})` } : undefined}
              onClick={() => onRowClick(row.key)}
            >
              <div className="map-card-overlay">
                <div className="map-card-title">{row.key}</div>
                <div className="map-card-stats">
                  {row.games} parties — {row.winrate === null ? '?' : `${row.winrate.toFixed(0)}%`} winrate — K/D/A{' '}
                  {row.avgKills.toFixed(1)}/{row.avgDeaths.toFixed(1)}/{row.avgAssists.toFixed(1)}
                  {' — '}{kills} kills{topWeapon && ` — arme préférée : ${topWeapon[0]}`}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function renderMapCards(rows, mapImages, onRowClick) {
  return (
    <div className="card">
      <h3>Stats par map</h3>
      <div className="map-card-list">
        {rows.map((row) => {
          const image = mapImages.get(row.key);
          return (
            <div
              key={row.key}
              className="map-card"
              style={image ? { backgroundImage: `url(${image})` } : undefined}
              onClick={() => onRowClick(row.key)}
            >
              <div className="map-card-overlay">
                <div className="map-card-title">{row.key}</div>
                <div className="map-card-stats">
                  {row.games} parties — {row.winrate === null ? '?' : `${row.winrate.toFixed(0)}%`} winrate — K/D/A{' '}
                  {row.avgKills.toFixed(1)}/{row.avgDeaths.toFixed(1)}/{row.avgAssists.toFixed(1)}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatsTab({ settings, matches }) {
  const agentIcons = useAgentIcons();
  const agentPortraits = useAgentPortraits();
  const mapImages = useMapImages();
  const [selectedMatch, setSelectedMatch] = useState(null);
  const [selectedMap, setSelectedMap] = useState(null);
  const [selectedAgent, setSelectedAgent] = useState(null);

  const globalStats = useMemo(() => {
    let totalHeadshots = 0;
    let totalBodyshots = 0;
    let totalLegshots = 0;
    const weaponCounts = new Map();

    matches.forEach((match) => {
      const me = findMe(match, settings.name, settings.tag);
      if (!me) return;

      const { headshots, bodyshots, legshots } = hitStats(me);
      totalHeadshots += headshots;
      totalBodyshots += bodyshots;
      totalLegshots += legshots;

      weaponKillsFor(match, me.puuid).forEach((weapon) => {
        weaponCounts.set(weapon, (weaponCounts.get(weapon) || 0) + 1);
      });
    });

    const totalShots = totalHeadshots + totalBodyshots + totalLegshots;

    return {
      hsPercent: totalShots > 0 ? (totalHeadshots / totalShots) * 100 : null,
      bsPercent: totalShots > 0 ? (totalBodyshots / totalShots) * 100 : null,
      lsPercent: totalShots > 0 ? (totalLegshots / totalShots) * 100 : null,
      weaponRanking: [...weaponCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [matches, settings.name, settings.tag]);

  const agentStats = useMemo(
    () => groupStats(matches, settings.name, settings.tag, (match, me) => me.character),
    [matches, settings.name, settings.tag],
  );

  const mapStats = useMemo(
    () => groupStats(matches, settings.name, settings.tag, (match) => match.metadata?.map),
    [matches, settings.name, settings.tag],
  );

  const modeStats = useMemo(
    () => groupStats(matches, settings.name, settings.tag, (match) => match.metadata?.mode),
    [matches, settings.name, settings.tag],
  );

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>Stats globales ({matches.length} matchs)</h3>
        <div className="stat-tiles">
          <div className="stat-tile">
            <div className="value">{globalStats.hsPercent === null ? '?' : `${globalStats.hsPercent.toFixed(1)}%`}</div>
            <div className="label">Tête</div>
          </div>
          <div className="stat-tile">
            <div className="value">{globalStats.bsPercent === null ? '?' : `${globalStats.bsPercent.toFixed(1)}%`}</div>
            <div className="label">Corps</div>
          </div>
          <div className="stat-tile">
            <div className="value">{globalStats.lsPercent === null ? '?' : `${globalStats.lsPercent.toFixed(1)}%`}</div>
            <div className="label">Jambes</div>
          </div>
        </div>

        <h3 style={{ marginTop: '1.25rem' }}>Armes les plus utilisées</h3>
        {globalStats.weaponRanking.length === 0 ? (
          <p>Aucune donnée d'arme pour l'instant.</p>
        ) : (
          (() => {
            const maxCount = globalStats.weaponRanking[0][1];
            return globalStats.weaponRanking.map(([weapon, count]) => (
              <div key={weapon} className="weapon-bar-row">
                <span className="name">{weapon}</span>
                <span className="weapon-bar-track">
                  <span className="weapon-bar-fill" style={{ width: `${(count / maxCount) * 100}%` }} />
                </span>
                <span className="weapon-bar-count">{count} kills</span>
              </div>
            ));
          })()
        )}
      </div>

      {renderAgentCards(agentStats, agentPortraits, matches, settings, (name) => setSelectedAgent(name))}
      {renderMapCards(mapStats, mapImages, (mapName) => setSelectedMap(mapName))}
      {renderGroupTable('Stats par mode', modeStats)}

      <div className="card">
        <h3>Historique de matchs</h3>
        <div className="match-list">
          {matches.map((match) => {
            const me = findMe(match, settings.name, settings.tag);
            const { hsPercent, bsPercent, lsPercent } = hitStats(me);
            const label = resultLabel(match, me);
            const resultClass = label === 'Victoire' ? 'match-win' : label === 'Défaite' ? 'match-loss' : '';
            return (
              <div
                key={match.metadata?.matchid}
                className={`match-row ${resultClass} clickable`}
                onClick={() => setSelectedMatch(match)}
              >
                <span className="match-info">
                  {match.metadata?.mode ?? '?'} — {match.metadata?.map ?? '?'} — {' '}
                  {me?.character && agentIcons.get(me.character) && (
                    <img src={agentIcons.get(me.character)} alt="" className="agent-icon" />
                  )}
                  {me?.character ?? '?'} — {' '}
                  {me?.stats?.kills ?? '?'}/{me?.stats?.deaths ?? '?'}/{me?.stats?.assists ?? '?'}
                  {hsPercent !== null &&
                    ` — Tête ${hsPercent.toFixed(0)}% / Corps ${bsPercent.toFixed(0)}% / Jambes ${lsPercent.toFixed(0)}%`}
                </span>
                <span className={`result-badge ${resultClass}`}>{label}</span>
              </div>
            );
          })}
        </div>
      </div>

      {selectedMatch && (
        <MatchDetailModal
          match={selectedMatch}
          settings={settings}
          agentIcons={agentIcons}
          onClose={() => setSelectedMatch(null)}
        />
      )}

      {selectedMap && (
        <MapDetailModal
          mapName={selectedMap}
          matches={matches}
          settings={settings}
          agentIcons={agentIcons}
          onClose={() => setSelectedMap(null)}
        />
      )}

      {selectedAgent && (
        <AgentDetailModal
          character={selectedAgent}
          matches={matches}
          settings={settings}
          onClose={() => setSelectedAgent(null)}
        />
      )}
    </div>
  );
}

export default StatsTab;
