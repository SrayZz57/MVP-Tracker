import { findMe, weaponKillsFor } from './valorantStats.js';
import { useMapImages } from './mapImages.js';

function TeamColumn({ title, players, agentIcons, className }) {
  return (
    <div className={`team-column ${className}`}>
      <h4>{title}</h4>
      {players.map((p) => (
        <div key={p.puuid} className="team-player">
          {agentIcons.get(p.character) && <img src={agentIcons.get(p.character)} alt="" className="agent-icon" />}
          <span className="team-player-name">{p.name}#{p.tag}</span>
          <span className="team-player-stats">
            {p.stats?.kills ?? '?'}/{p.stats?.deaths ?? '?'}/{p.stats?.assists ?? '?'} — {p.stats?.score ?? '?'} pts
          </span>
        </div>
      ))}
    </div>
  );
}

function MatchDetailModal({ match, settings, agentIcons, onClose }) {
  const mapImages = useMapImages();
  const me = findMe(match, settings.name, settings.tag);

  const allPlayers = match?.players?.all_players || [];
  const redTeam = allPlayers.filter((p) => p.team === 'Red');
  const blueTeam = allPlayers.filter((p) => p.team === 'Blue');

  const weaponCounts = new Map();
  if (me) {
    weaponKillsFor(match, me.puuid).forEach((weapon) => {
      weaponCounts.set(weapon, (weaponCounts.get(weapon) || 0) + 1);
    });
  }

  const mapSplash = mapImages.get(match?.metadata?.map);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div className="modal-banner" style={mapSplash ? { backgroundImage: `url(${mapSplash})` } : undefined}>
          <div className="modal-banner-text">
            <h2>{match?.metadata?.map ?? '?'}</h2>
            <p>{match?.metadata?.mode ?? '?'}</p>
          </div>
        </div>

        <div className="card">
          <h3>Joueurs</h3>
          <div className="team-columns">
            <TeamColumn title="Équipe Rouge" players={redTeam} agentIcons={agentIcons} className="team-red" />
            <TeamColumn title="Équipe Bleue" players={blueTeam} agentIcons={agentIcons} className="team-blue" />
          </div>
        </div>

        <div className="card">
          <h3>Mes kills par arme sur ce match</h3>
          {weaponCounts.size === 0 ? (
            <p>Aucun kill enregistré.</p>
          ) : (
            [...weaponCounts.entries()]
              .sort((a, b) => b[1] - a[1])
              .map(([weapon, count]) => (
                <p key={weapon}>{weapon} — {count} kills</p>
              ))
          )}
        </div>

        <div className="card">
          <h3>Round par round</h3>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Résultat</th>
                <th>Fin</th>
                <th>Mes kills</th>
                <th>Dégâts</th>
                <th>Score</th>
                <th>Mort ?</th>
                <th>Mon économie</th>
              </tr>
            </thead>
            <tbody>
              {(match?.rounds || []).map((round, index) => {
                const myRoundStats = round.player_stats?.find((p) => p.player_puuid === me?.puuid);
                const won = me?.team && round.winning_team === me.team;
                const died = me
                  ? round.player_stats?.some((p) =>
                      p.kill_events?.some((k) => k.victim_puuid === me.puuid),
                    )
                  : false;
                return (
                  <tr key={index}>
                    <td>{index + 1}</td>
                    <td className={won ? 'result-win-text' : 'result-loss-text'}>
                      {won ? 'Gagné' : 'Perdu'}
                    </td>
                    <td>{round.end_type ?? '?'}</td>
                    <td>{myRoundStats?.kills ?? '?'}</td>
                    <td>{myRoundStats?.damage ?? '?'}</td>
                    <td>{myRoundStats?.score ?? '?'}</td>
                    <td className={died ? 'result-loss-text' : 'result-win-text'}>{died ? 'Oui' : 'Non'}</td>
                    <td>
                      {myRoundStats?.economy
                        ? `${myRoundStats.economy.loadout_value}¤ (${myRoundStats.economy.weapon?.name ?? '?'})`
                        : '?'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default MatchDetailModal;
