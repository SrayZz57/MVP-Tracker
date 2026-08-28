import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentsData } from './agentIcons.js';
import { useWeaponsData } from './weaponIcons.js';
import { useMapsData, useMapMinimaps } from './mapImages.js';
import { useRankLadder } from './rankData.js';

const CATEGORIES = [
  { id: 'agents', labelKey: 'wiki.categories.agents' },
  { id: 'weapons', labelKey: 'wiki.categories.weapons' },
  { id: 'maps', labelKey: 'wiki.categories.maps' },
  { id: 'ranks', labelKey: 'wiki.categories.ranks' },
];

const WEAPON_CATEGORY_ORDER = ['Pistols', 'SMGs', 'Shotguns', 'Rifles', 'Sniper Rifles', 'Heavy Weapons'];

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
  const { t } = useTranslation();
  const abilities = agent.abilities.filter((a) => PLACEABLE_SLOTS.includes(a.slot) && a.displayIcon);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>{t('wiki.close')}</button>

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
          <h3>{t('wiki.abilities')}</h3>
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
  const { t } = useTranslation();
  return (
    <>
      {WEAPON_CATEGORY_ORDER.map((category) => {
        const weapons = weaponsByCategory.get(category);
        if (!weapons || weapons.length === 0) return null;
        return (
          <div key={category} className="card">
            <h3>{t(`wiki.weaponCategories.${category}`, { defaultValue: category })}</h3>
            <div className="wiki-grid wiki-grid-compact">
              {weapons.map((weapon) => (
                <div key={weapon.uuid} className="wiki-card wiki-card-compact" onClick={() => onSelect(weapon)}>
                  <img src={weapon.displayIcon} alt="" className="wiki-weapon-icon" />
                  <div className="wiki-card-title">{weapon.displayName}</div>
                  <div className="wiki-card-subtitle">{t('wiki.credits', { cost: weapon.shopData.cost })}</div>
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
  const { t } = useTranslation();
  const stats = weapon.weaponStats;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>{t('wiki.close')}</button>

        <div className="modal-banner" style={{ backgroundImage: `url(${weapon.displayIcon})`, backgroundSize: 'contain' }}>
          <div className="modal-banner-text">
            <h2>{weapon.displayName}</h2>
            <p>{t(`wiki.weaponCategories.${weapon.shopData.category}`, { defaultValue: weapon.shopData.category })} — {t('wiki.credits', { cost: weapon.shopData.cost })}</p>
          </div>
        </div>

        {stats ? (
          <>
            <div className="card">
              <div className="stat-tiles">
                <div className="stat-tile">
                  <div className="value">{stats.fireRate}</div>
                  <div className="label">{t('wiki.fireRate')}</div>
                </div>
                <div className="stat-tile">
                  <div className="value">{stats.magazineSize}</div>
                  <div className="label">{t('wiki.magazineSize')}</div>
                </div>
                <div className="stat-tile">
                  <div className="value">{stats.reloadTimeSeconds}s</div>
                  <div className="label">{t('wiki.reloadTime')}</div>
                </div>
              </div>
            </div>

            <div className="card">
              <h3>{t('wiki.damageByDistance')}</h3>
              <table>
                <thead>
                  <tr>
                    <th>{t('wiki.distance')}</th>
                    <th>{t('wiki.head')}</th>
                    <th>{t('wiki.body')}</th>
                    <th>{t('wiki.legs')}</th>
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
          <p>{t('wiki.noWeaponStats')}</p>
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
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function MapModal({ map, minimapUrl, onClose }) {
  const { t } = useTranslation();
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}>{t('wiki.close')}</button>

        <div className="modal-banner" style={{ backgroundImage: `url(${map.splash})` }}>
          <div className="modal-banner-text">
            <h2>{map.displayName}</h2>
            <p>{map.tacticalDescription}</p>
          </div>
        </div>

        {map.narrativeDescription && (
          <div className="card">
            <p>{map.narrativeDescription}</p>
          </div>
        )}

        {minimapUrl && (
          <div className="card">
            <h3>{t('wiki.minimap')}</h3>
            <img src={minimapUrl} alt="" className="wiki-minimap" />
          </div>
        )}
      </div>
    </div>
  );
}

// Regroupe les paliers par division (Fer/Bronze/.../Immortel, 3 sous-paliers
// chacun) — Non classé et Radiant n'en ont qu'un seul. Ordre conservé tel que
// renvoyé par l'API (croissant), inversé à l'affichage pour aller du plus
// haut rang au plus bas.
function groupRankLadder(ladder) {
  const order = [];
  const byDivision = new Map();
  ladder.forEach((tier) => {
    if (!byDivision.has(tier.divisionName)) {
      byDivision.set(tier.divisionName, []);
      order.push(tier.divisionName);
    }
    byDivision.get(tier.divisionName).push(tier);
  });
  return order.map((division) => ({ division, tiers: byDivision.get(division) })).reverse();
}

function RankLadder({ ladder }) {
  const groups = useMemo(() => groupRankLadder(ladder), [ladder]);

  return (
    <div className="wiki-rank-ladder">
      {groups.map((group) => {
        const tiers = [...group.tiers].reverse();
        const color = tiers[0]?.color;
        return (
          <div key={group.division} className="wiki-rank-group" style={{ '--rank-color': color }}>
            <div className="wiki-rank-group-label">{group.division}</div>
            <div className="wiki-rank-group-tiers">
              {tiers.map((tier) => {
                const subLabel = tier.tierName.replace(group.division, '').trim();
                return (
                  <div key={tier.tier} className="wiki-rank-chip">
                    <img src={tier.icon} alt="" className="wiki-rank-icon" />
                    <span className="wiki-rank-name">{subLabel || tier.tierName}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Wiki() {
  const { t } = useTranslation();
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
        <h3>{t('wiki.title')}</h3>
        <p className="label">{t('wiki.description')}</p>
        <div className="filter-bar">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              className={c.id === category ? 'strategy-tool active' : 'strategy-tool'}
              onClick={() => setCategory(c.id)}
            >
              {t(c.labelKey)}
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
          <p className="label">{t('wiki.ranksHint')}</p>
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
