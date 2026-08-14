import { useEffect, useState } from 'react';
import { useHeroIcons } from '../heroIcons.js';

const ROLE_LABELS = { tank: 'Tank', damage: 'Attaque', support: 'Support' };
const ROLE_ORDER = ['tank', 'damage', 'support'];

function formatHeroName(key) {
  return key
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function formatPlaytime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.round((seconds % 3600) / 60);
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function OverwatchTab() {
  const heroIcons = useHeroIcons();
  const [name, setName] = useState('');
  const [tag, setTag] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchProfile = async (battleTag) => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.getOverwatchProfile(battleTag);
      setProfile(data);
    } catch (err) {
      setError(err.message);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    window.electronAPI.getOverwatchSettings().then((saved) => {
      if (!saved?.battleTag) return;
      const [savedName, savedTag] = saved.battleTag.split('#');
      setName(savedName ?? '');
      setTag(savedTag ?? '');
      fetchProfile(saved.battleTag);
    });
  }, []);

  const handleSubmit = (event) => {
    event.preventDefault();
    fetchProfile(`${name.trim()}#${tag.trim()}`);
  };

  const roleRows = profile
    ? ROLE_ORDER.filter((role) => profile.stats.roles[role]).map((role) => ({
        key: role,
        ...profile.stats.roles[role],
      }))
    : [];

  const heroRows = profile
    ? Object.entries(profile.stats.heroes)
        .map(([key, stats]) => ({ key, ...stats }))
        .sort((a, b) => b.games_played - a.games_played)
    : [];

  const competitive = profile?.summary.competitive?.pc;

  return (
    <div>
      <div className="card">
        <h2>🟠 Overwatch</h2>
        <form onSubmit={handleSubmit} className="search-bar" style={{ marginTop: '0.75rem' }}>
          <div className="search-bar-riotid">
            <input placeholder="Pseudo" value={name} onChange={(e) => setName(e.target.value)} required />
            <span className="search-bar-hash">#</span>
            <input
              placeholder="Tag"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              required
              className="search-bar-tag"
            />
          </div>
          <button type="submit" disabled={loading}>
            {loading ? 'Recherche...' : '🔍 Rechercher'}
          </button>
        </form>
        {error && <p className="warning" style={{ marginTop: '0.5rem' }}>Erreur : {error}</p>}
      </div>

      {profile && (
        <>
          <div className="card">
            <div className="ow-profile-header">
              {profile.summary.avatar && <img src={profile.summary.avatar} alt="" className="ow-avatar" />}
              <div>
                <h3 style={{ marginBottom: 0 }}>{profile.summary.username}</h3>
                <p className="label">
                  {profile.summary.title ?? 'Sans titre'} — Endorsement {profile.summary.endorsement?.level ?? '?'}
                </p>
              </div>
            </div>

            {competitive && (
              <div className="ow-rank-row">
                {ROLE_ORDER.map((role) => {
                  const rank = competitive[role];
                  return (
                    <div key={role} className="ow-rank-badge">
                      {rank?.rank_icon && <img src={rank.rank_icon} alt="" />}
                      <span>{ROLE_LABELS[role]}</span>
                      <span className="label">
                        {rank ? `${rank.division} ${rank.tier}` : 'Non classé'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="card">
            <h3>Stats globales</h3>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value">{profile.stats.general.games_played}</div>
                <div className="label">Parties jouées</div>
              </div>
              <div className="stat-tile">
                <div className="value">{profile.stats.general.winrate}%</div>
                <div className="label">Winrate</div>
              </div>
              <div className="stat-tile">
                <div className="value">{profile.stats.general.kda}</div>
                <div className="label">KDA</div>
              </div>
              <div className="stat-tile">
                <div className="value">{formatPlaytime(profile.stats.general.time_played)}</div>
                <div className="label">Temps de jeu</div>
              </div>
            </div>
          </div>

          <div className="card">
            <h3>Stats par rôle</h3>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Parties</th>
                  <th>Winrate</th>
                  <th>KDA</th>
                </tr>
              </thead>
              <tbody>
                {roleRows.map((role) => (
                  <tr key={role.key}>
                    <td>{ROLE_LABELS[role.key]}</td>
                    <td>{role.games_played}</td>
                    <td>{role.winrate}%</td>
                    <td>{role.kda}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="card">
            <h3>Stats par héros</h3>
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Parties</th>
                  <th>Winrate</th>
                  <th>KDA</th>
                  <th>Dégâts moy.</th>
                  <th>Soin moy.</th>
                </tr>
              </thead>
              <tbody>
                {heroRows.map((hero) => (
                  <tr key={hero.key}>
                    <td>
                      {heroIcons.get(hero.key) && (
                        <img src={heroIcons.get(hero.key)} alt="" className="agent-icon" />
                      )}
                      {formatHeroName(hero.key)}
                    </td>
                    <td>{hero.games_played}</td>
                    <td>{hero.winrate}%</td>
                    <td>{hero.kda}</td>
                    <td>{Math.round(hero.average?.damage ?? 0)}</td>
                    <td>{Math.round(hero.average?.healing ?? 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default OverwatchTab;
