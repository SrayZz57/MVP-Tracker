import { useMemo, useState } from 'react';
import { useAgentsData } from './agentIcons.js';
import { useWeaponsData } from './weaponIcons.js';
import { useMapsData, useMapMinimaps } from './mapImages.js';
import { useRankLadder } from './rankData.js';

const CATEGORIES = [
  { id: 'agents', label: '🧑‍🚀 Agents' },
  { id: 'weapons', label: '🔫 Armes' },
  { id: 'maps', label: '🗺️ Maps' },
  { id: 'ranks', label: '🏅 Rangs' },
];

const WEAPON_CATEGORY_ORDER = ['Pistols', 'SMGs', 'Shotguns', 'Rifles', 'Sniper Rifles', 'Heavy Weapons'];
const WEAPON_CATEGORY_LABELS = {
  Pistols: 'Pistolets',
  SMGs: 'Mitraillettes',
  Shotguns: 'Fusils à pompe',
  Rifles: "Fusils d'assaut",
  'Sniper Rifles': 'Fusils de précision',
  'Heavy Weapons': 'Armes lourdes',
};

const PLACEABLE_SLOTS = ['Ability1', 'Ability2', 'Grenade', 'Ultimate'];

function agentAccent(agent) {
  const hex = agent.backgroundGradientColors?.[0];
  return hex ? `#${hex.slice(0, 6)}` : '#ff4655';
}

function AgentGrid({ agents, onSelect }) {
  return (
    <div className="wiki-agent-grid">
      {agents.map((agent) => {
        const accent = agentAccent(agent);
        return (
          <div
            key={agent.uuid}
            className="wiki-agent-card"
            style={{ backgroundImage: `url(${agent.fullPortrait})`, borderColor: `${accent}66` }}
            onClick={() => onSelect(agent)}
          >
            <div className="wiki-agent-card-overlay" style={{ background: `linear-gradient(to top, ${accent}e6 0%, ${accent}33 45%, transparent 75%)` }}>
              <div className="wiki-agent-card-role">
                {agent.role?.displayIcon && <img src={agent.role.displayIcon} alt="" />}
                {agent.role?.displayName ?? '?'}
              </div>
              <div className="wiki-agent-card-name">{agent.displayName}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function AgentModal({ agent, onClose }) {
  const abilities = agent.abilities.filter((a) => PLACEABLE_SLOTS.includes(a.slot) && a.displayIcon);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div className="agent-modal-header" style={{ borderColor: `${agentAccent(agent)}66` }}>
          <img src={agent.displayIcon} alt="" className="agent-modal-avatar" style={{ borderColor: agentAccent(agent) }} />
          <div>
            <h2>{agent.displayName}</h2>
            <p className="label">{agent.role?.displayName}</p>
          </div>
        </div>

        {agent.description && (
          <div className="card">
            <p>{agent.description}</p>
          </div>
        )}

        <div className="card">
          <h3>Capacités</h3>
          <div className="wiki-ability-list">
            {abilities.map((ability) => (
              <div key={ability.slot} className="wiki-ability-row">
                <img src={ability.displayIcon} alt="" className="wiki-ability-icon" />
                <div>
                  <div className="wiki-ability-name">{ability.displayName}</div>
                  <p className="label">{ability.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function WeaponGrid({ weaponsByCategory, onSelect }) {
  return (
    <>
      {WEAPON_CATEGORY_ORDER.map((category) => {
        const weapons = weaponsByCategory.get(category);
        if (!weapons || weapons.length === 0) return null;
        return (
          <div key={category} className="card">
            <h3>{WEAPON_CATEGORY_LABELS[category] ?? category}</h3>
            <div className="wiki-grid wiki-grid-compact">
              {weapons.map((weapon) => (
                <div key={weapon.uuid} className="wiki-card wiki-card-compact" onClick={() => onSelect(weapon)}>
                  <img src={weapon.displayIcon} alt="" className="wiki-weapon-icon" />
                  <div className="wiki-card-title">{weapon.displayName}</div>
                  <div className="wiki-card-subtitle">{weapon.shopData.cost} crédits</div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </>
  );
}

function WeaponModal({ weapon, onClose }) {
  const stats = weapon.weaponStats;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div className="modal-banner" style={{ backgroundImage: `url(${weapon.displayIcon})`, backgroundSize: 'contain' }}>
          <div className="modal-banner-text">
            <h2>{weapon.displayName}</h2>
            <p>{WEAPON_CATEGORY_LABELS[weapon.shopData.category] ?? weapon.shopData.category} — {weapon.shopData.cost} crédits</p>
          </div>
        </div>

        {stats ? (
          <>
            <div className="card">
              <div className="stat-tiles">
                <div className="stat-tile">
                  <div className="value">{stats.fireRate}</div>
                  <div className="label">Cadence de tir (coups/s)</div>
                </div>
                <div className="stat-tile">
                  <div className="value">{stats.magazineSize}</div>
                  <div className="label">Taille du chargeur</div>
                </div>
                <div className="stat-tile">
                  <div className="value">{stats.reloadTimeSeconds}s</div>
                  <div className="label">Temps de rechargement</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>Dégâts par distance</h3>
              <table>
                <thead>
                  <tr>
                    <th>Distance</th>
                    <th>Tête</th>
                    <th>Corps</th>
                    <th>Jambes</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.damageRanges.map((range) => (
                    <tr key={range.rangeStartMeters}>
                      <td>{range.rangeStartMeters}–{range.rangeEndMeters === 0 ? '∞' : range.rangeEndMeters}m</td>
                      <td>{range.headDamage.toFixed(0)}</td>
                      <td>{range.bodyDamage.toFixed(0)}</td>
                      <td>{range.legDamage.toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p>Pas de statistiques détaillées pour cette arme.</p>
        )}
      </div>
    </div>
  );
}

function MapGrid({ maps, onSelect }) {
  return (
    <div className="wiki-map-grid">
      {maps.map((map) => (
        <div
          key={map.uuid}
          className="wiki-map-card"
          style={{ backgroundImage: `url(${map.splash})` }}
          onClick={() => onSelect(map)}
        >
          <div className="wiki-map-card-overlay">
            <div className="wiki-map-card-name">{map.displayName}</div>
            <div className="wiki-map-card-meta">
              <span>{map.tacticalDescription}</span>
              {map.coordinates && <span>{map.coordinates}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MapModal({ map, minimapUrl, onClose }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>✕ Fermer</button>

        <div className="modal-banner" style={{ backgroundImage: `url(${map.splash})` }}>
          <div className="modal-banner-text">
            <h2>{map.displayName}</h2>
            <p>{map.tacticalDescription} — {map.coordinates}</p>
          </div>
        </div>

        {map.narrativeDescription && (
          <div className="card">
            <p>{map.narrativeDescription}</p>
          </div>
        )}

        {minimapUrl && (
          <div className="card">
            <h3>Minimap</h3>
            <img src={minimapUrl} alt="" className="wiki-minimap" />
          </div>
        )}
      </div>
    </div>
  );
}

function RankLadder({ ladder }) {
  return (
    <div className="wiki-rank-ladder">
      {[...ladder].reverse().map((tier) => (
        <div key={tier.tier} className="wiki-rank-row" style={{ borderLeftColor: tier.color }}>
          <img src={tier.icon} alt="" className="wiki-rank-icon" />
          <span className="wiki-rank-name">{tier.tierName}</span>
        </div>
      ))}
    </div>
  );
}

function Wiki() {
  const [category, setCategory] = useState('agents');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [selectedWeapon, setSelectedWeapon] = useState(null);
  const [selectedMap, setSelectedMap] = useState(null);

  const agents = useAgentsData();
  const weapons = useWeaponsData();
  const maps = useMapsData();
  const minimaps = useMapMinimaps();
  const rankLadder = useRankLadder();

  const sortedAgents = useMemo(() => [...agents].sort((a, b) => a.displayName.localeCompare(b.displayName)), [agents]);

  const weaponsByCategory = useMemo(() => {
    const map = new Map();
    weapons.forEach((w) => {
      const cat = w.shopData.category;
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat).push(w);
    });
    map.forEach((list) => list.sort((a, b) => a.shopData.cost - b.shopData.cost));
    return map;
  }, [weapons]);

  const sortedMaps = useMemo(() => [...maps].sort((a, b) => a.displayName.localeCompare(b.displayName)), [maps]);

  return (
    <div>
      <div className="card">
        <h3>📖 Wiki Valorant</h3>
        <p className="label">
          Toutes les infos de référence — agents, armes, maps et rangs — pour découvrir ou revoir les bases sans
          sortir de l'appli.
        </p>
        <div className="filter-bar">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={c.id === category ? 'strategy-tool active' : 'strategy-tool'}
              onClick={() => setCategory(c.id)}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {category === 'agents' && (
        <div className="card">
          <AgentGrid agents={sortedAgents} onSelect={setSelectedAgent} />
        </div>
      )}

      {category === 'weapons' && <WeaponGrid weaponsByCategory={weaponsByCategory} onSelect={setSelectedWeapon} />}

      {category === 'maps' && (
        <div className="card">
          <MapGrid maps={sortedMaps} onSelect={setSelectedMap} />
        </div>
      )}

      {category === 'ranks' && (
        <div className="card">
          <p className="label">Du plus haut au plus bas.</p>
          <RankLadder ladder={rankLadder} />
        </div>
      )}

      {selectedAgent && <AgentModal agent={selectedAgent} onClose={() => setSelectedAgent(null)} />}
      {selectedWeapon && <WeaponModal weapon={selectedWeapon} onClose={() => setSelectedWeapon(null)} />}
      {selectedMap && (
        <MapModal map={selectedMap} minimapUrl={minimaps.get(selectedMap.displayName)} onClose={() => setSelectedMap(null)} />
      )}
    </div>
  );
}

export default Wiki;
