import { weaponKillsForAgent, mapStatsForAgent, agentPlaytimeMs, agentTotalKills } from './valorantStats.js';
import { useAgentPortraits } from './agentIcons.js';

function formatPlaytime(ms) {
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function AgentDetailModal({ character, matches, settings, onClose }) {
  const portraits = useAgentPortraits();
  const portrait = portraits.get(character);

  const weaponKills = weaponKillsForAgent(matches, settings.name, settings.tag, character);
  const mapStats = mapStatsForAgent(matches, settings.name, settings.tag, character);
  const playtimeMs = agentPlaytimeMs(matches, settings.name, settings.tag, character);
  const totalKills = agentTotalKills(matches, settings.name, settings.tag, character);

  const maxWeaponCount = weaponKills[0]?.[1] ?? 0;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div
          className="modal-banner agent-banner"
          style={portrait ? { backgroundImage: `url(${portrait})` } : undefined}
        >
          <div className="modal-banner-text">
            <h2>{character}</h2>
          </div>
        </div>

        <div className="card">
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{totalKills}</div>
              <div className="label">Kills au total</div>
            </div>
            <div className="stat-tile">
              <div className="value">{formatPlaytime(playtimeMs)}</div>
              <div className="label">Temps de jeu</div>
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
                <span className="name">{weapon}</span>
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
          <table>
            <thead>
              <tr>
                <th>Map</th>
                <th>Parties</th>
                <th>Winrate</th>
                <th>K/D/A moyen</th>
              </tr>
            </thead>
            <tbody>
              {mapStats.map((row) => (
                <tr key={row.key}>
                  <td>{row.key}</td>
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

        <p className="label">
          Note : l'API ne distingue pas les assistances faites via une capacité de celles faites à l'arme —
          seul le total d'assistances est disponible, déjà affiché ailleurs dans l'app.
        </p>
      </div>
    </div>
  );
}

export default AgentDetailModal;
