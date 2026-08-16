import { agentUsageOnMap, weaponKillsOnMap, mapSideStats, excludeDeathmatch } from './valorantStats.js';
import { useMapImages } from './mapImages.js';
import { useWeaponIcons } from './weaponIcons.js';

function MapDetailModal({ mapName, matches, settings, agentIcons, onClose }) {
  const mapImages = useMapImages();
  const weaponIcons = useWeaponIcons();
  const mapSplash = mapImages.get(mapName);

  const rankedMatches = excludeDeathmatch(matches);
  const agentUsage = agentUsageOnMap(rankedMatches, settings.name, settings.tag, mapName);
  const weaponKills = weaponKillsOnMap(rankedMatches, settings.name, settings.tag, mapName);
  const sides = mapSideStats(matches, settings.name, settings.tag, mapName);

  const maxWeaponCount = weaponKills[0]?.[1] ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div className="modal-banner" style={mapSplash ? { backgroundImage: `url(${mapSplash})` } : undefined}>
          <div className="modal-banner-text">
            <h2>{mapName}</h2>
          </div>
        </div>

        <div className="card">
          <h3>Attaque / Défense</h3>
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{sides.attackWinrate === null ? '?' : `${sides.attackWinrate.toFixed(0)}%`}</div>
              <div className="label">Winrate en attaque ({sides.attackRounds} rounds)</div>
            </div>
            <div className="stat-tile">
              <div className="value">{sides.defenseWinrate === null ? '?' : `${sides.defenseWinrate.toFixed(0)}%`}</div>
              <div className="label">Winrate en défense ({sides.defenseRounds} rounds)</div>
            </div>
          </div>
          {sides.unknownRounds > 0 && (
            <p className="label" style={{ marginTop: '0.5rem' }}>
              {sides.unknownRounds} round(s) non déterminables (pas de pose de spike ni de fin par le temps).
            </p>
          )}
        </div>

        <div className="card">
          <h3>Agents joués sur cette map</h3>
          {agentUsage.length === 0 ? (
            <p>Aucune donnée.</p>
          ) : (
            agentUsage.map(({ character, count, percent }) => (
              <p key={character}>
                {agentIcons.get(character) && <img src={agentIcons.get(character)} alt="" className="agent-icon" />}
                {character} — {percent.toFixed(0)}% ({count} matchs)
              </p>
            ))
          )}
        </div>

        <div className="card">
          <h3>Kills par arme sur cette map</h3>
          {weaponKills.length === 0 ? (
            <p>Aucune donnée.</p>
          ) : (
            weaponKills.map(([weapon, count]) => (
              <div key={weapon} className="weapon-bar-row">
                <span className="name">
                  {weaponIcons.get(weapon) && <img src={weaponIcons.get(weapon)} alt="" className="weapon-icon" />}
                  {weapon}
                </span>
                <span className="weapon-bar-track">
                  <span className="weapon-bar-fill" style={{ width: `${(count / maxWeaponCount) * 100}%` }} />
                </span>
                <span className="weapon-bar-count">{count} kills</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MapDetailModal;
