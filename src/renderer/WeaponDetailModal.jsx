import { weaponDetailStats } from './valorantStats.js';
import { useAgentIcons } from './agentIcons.js';
import { useMapMinimaps } from './mapImages.js';

function WeaponDetailModal({ weapon, weaponIcon, matches, settings, onClose }) {
  const agentIcons = useAgentIcons();
  const minimaps = useMapMinimaps();
  const stats = weaponDetailStats(matches, settings.name, settings.tag, weapon);

  const maxMapCount = stats.byMap[0]?.[1] ?? 0;
  const maxAgentCount = stats.byAgent[0]?.[1] ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div className="agent-modal-header">
          {weaponIcon && <img src={weaponIcon} alt="" className="agent-modal-avatar weapon-modal-avatar" />}
          <h2>{weapon}</h2>
        </div>

        <div className="card">
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{stats.totalKills}</div>
              <div className="label">Kills au total</div>
            </div>
            <div className="stat-tile">
              <div className="value">{stats.avgDistance === null ? '?' : `${stats.avgDistance.toFixed(0)}m`}</div>
              <div className="label">Distance moyenne des kills</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Kills par map</h3>
          {stats.byMap.length === 0 ? (
            <p>Aucune donnée.</p>
          ) : (
            stats.byMap.map(([map, count]) => (
              <div key={map} className="weapon-bar-row">
                <span className="name">
                  {minimaps.get(map) && <img src={minimaps.get(map)} alt="" className="weapon-icon" />}
                  {map}
                </span>
                <span className="weapon-bar-track">
                  <span className="weapon-bar-fill" style={{ width: `${(count / maxMapCount) * 100}%` }} />
                </span>
                <span className="weapon-bar-count">{count} kills</span>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <h3>Kills par agent</h3>
          {stats.byAgent.length === 0 ? (
            <p>Aucune donnée.</p>
          ) : (
            stats.byAgent.map(([agent, count]) => (
              <div key={agent} className="weapon-bar-row">
                <span className="name">
                  {agentIcons.get(agent) && <img src={agentIcons.get(agent)} alt="" className="weapon-icon" />}
                  {agent}
                </span>
                <span className="weapon-bar-track">
                  <span className="weapon-bar-fill" style={{ width: `${(count / maxAgentCount) * 100}%` }} />
                </span>
                <span className="weapon-bar-count">{count} kills</span>
              </div>
            ))
          )}
        </div>

        <p className="label">
          Riot ne rattache pas les tirs (tête/corps/jambes) à une arme précise — seule la précision globale, tous
          armes confondues, est disponible (déjà affichée dans "Stats globales").
        </p>
      </div>
    </div>
  );
}

export default WeaponDetailModal;
