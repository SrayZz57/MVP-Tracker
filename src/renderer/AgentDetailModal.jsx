import {
  weaponKillsForAgent,
  mapStatsForAgent,
  agentPlaytimeSeconds,
  agentTotalKills,
  groupStats,
  excludeDeathmatch,
} from './valorantStats.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';
import { useWeaponIcons } from './weaponIcons.js';
import { useMapMinimaps } from './mapImages.js';

function formatPlaytime(seconds) {
  const totalMinutes = Math.round(seconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function AgentDetailModal({ character, matches, settings, onClose }) {
  const icons = useAgentIcons();
  const icon = icons.get(character);
  const roles = useAgentRoles();
  const role = roles.get(character);
  const weaponIcons = useWeaponIcons();
  const minimaps = useMapMinimaps();

  const weaponKills = weaponKillsForAgent(matches, settings.name, settings.tag, character);
  const mapStats = mapStatsForAgent(matches, settings.name, settings.tag, character);
  const playtimeSeconds = agentPlaytimeSeconds(matches, settings.name, settings.tag, character);
  const totalKills = agentTotalKills(matches, settings.name, settings.tag, character);

  const overall = groupStats(
    excludeDeathmatch(matches),
    settings.name,
    settings.tag,
    (match, me) => (me.character === character ? character : null),
  )[0];

  const maxWeaponCount = weaponKills[0]?.[1] ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div className="agent-modal-header">
          {icon && <img src={icon} alt="" className="agent-modal-avatar" />}
          <div>
            <h2>{character}</h2>
            {role?.roleName && (
              <div className="agent-modal-role">
                {role.roleIcon && <img src={role.roleIcon} alt="" />}
                {role.roleName}
              </div>
            )}
          </div>
        </div>

        <div className="card">
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{overall?.games ?? 0}</div>
              <div className="label">Parties jouées</div>
            </div>
            <div className="stat-tile">
              <div className="value" style={{ color: overall?.winrate === null || overall?.winrate === undefined ? undefined : overall.winrate >= 50 ? '#3ddc84' : 'var(--accent)' }}>
                {overall?.winrate === null || overall?.winrate === undefined ? '?' : `${overall.winrate.toFixed(0)}%`}
              </div>
              <div className="label">Winrate</div>
            </div>
            <div className="stat-tile">
              <div className="value">
                {overall ? `${overall.avgKills.toFixed(1)}/${overall.avgDeaths.toFixed(1)}/${overall.avgAssists.toFixed(1)}` : '?'}
              </div>
              <div className="label">K/D/A moyen</div>
            </div>
            <div className="stat-tile">
              <div className="value">{formatPlaytime(playtimeSeconds)}</div>
              <div className="label">Temps de jeu ({totalKills} kills)</div>
            </div>
          </div>
        </div>

        <div className="card">
          <h3>Armes les plus utilisées</h3>
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

        <div className="card">
          <h3>Winrate par map</h3>
          {mapStats.length === 0 ? (
            <p>Aucune donnée.</p>
          ) : (
            mapStats.map((row) => (
              <div key={row.key} className="stat-bar-row">
                <span className="stat-bar-label">
                  {minimaps.get(row.key) && <img src={minimaps.get(row.key)} alt="" className="stat-bar-icon" />}
                  {row.key}
                </span>
                <span className="stat-bar-track">
                  <span
                    className={`stat-bar-fill ${row.winrate === null ? '' : row.winrate >= 50 ? 'good' : 'bad'}`}
                    style={{ width: `${row.winrate ?? 4}%` }}
                  />
                </span>
                <span className="stat-bar-value">{row.winrate === null ? '?' : `${row.winrate.toFixed(0)}%`}</span>
                <span className="stat-bar-meta">
                  {row.games} partie(s) — {row.avgKills.toFixed(1)}/{row.avgDeaths.toFixed(1)}/{row.avgAssists.toFixed(1)}
                </span>
              </div>
            ))
          )}
        </div>

        <p className="label">
          Note : l'API ne distingue pas les assistances faites via une capacité de celles faites à l'arme —
          seul le total d'assistances est disponible, déjà affiché ailleurs dans l'app.
        </p>
      </div>
    </div>
  );
}

export default AgentDetailModal;
