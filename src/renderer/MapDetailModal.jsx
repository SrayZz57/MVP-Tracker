import { useTranslation } from 'react-i18next';
import { agentUsageOnMap, weaponKillsOnMap, mapSideStats, excludeDeathmatch } from './valorantStats.js';
import { useMapImages } from './mapImages.js';
import { useWeaponIcons } from './weaponIcons.js';
import Button from './ui/Button';

function MapDetailModal({ mapName, matches, settings, agentIcons, onClose }) {
  const { t } = useTranslation();
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
        <Button variant="ghost" className="modal-close" onClick={onClose}>{t('detail.close')}</Button>

        <div className="modal-banner" style={mapSplash ? { backgroundImage: `url(${mapSplash})` } : undefined}>
          <div className="modal-banner-text">
            <h2>{mapName}</h2>
          </div>
        </div>

        <div className="card">
          <h3>{t('detail.attackDefense')}</h3>
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{sides.attackWinrate === null ? '?' : `${sides.attackWinrate.toFixed(0)}%`}</div>
              <div className="label">{t('detail.attackWinrate', { count: sides.attackRounds })}</div>
            </div>
            <div className="stat-tile">
              <div className="value">{sides.defenseWinrate === null ? '?' : `${sides.defenseWinrate.toFixed(0)}%`}</div>
              <div className="label">{t('detail.defenseWinrate', { count: sides.defenseRounds })}</div>
            </div>
          </div>
          {sides.unknownRounds > 0 && (
            <p className="label" style={{ marginTop: '0.5rem' }}>
              {t('detail.unknownRounds', { count: sides.unknownRounds })}
            </p>
          )}
        </div>

        <div className="card">
          <h3>{t('detail.agentsOnMap')}</h3>
          {agentUsage.length === 0 ? (
            <p>{t('detail.noData')}</p>
          ) : (
            agentUsage.map(({ character, count, percent }) => (
              <p key={character}>
                {agentIcons.get(character) && <img src={agentIcons.get(character)} alt="" className="agent-icon" />}
                {character} · {t('detail.agentUsageLine', { percent: percent.toFixed(0), count })}
              </p>
            ))
          )}
        </div>

        <div className="card">
          <h3>{t('detail.killsByWeaponOnMap')}</h3>
          {weaponKills.length === 0 ? (
            <p>{t('detail.noData')}</p>
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
                <span className="weapon-bar-count">{t('detail.killsCount', { count })}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default MapDetailModal;
