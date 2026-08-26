import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { deathTimingStats, clutchStats, economyImpactStats, duelDistanceStats } from './valorantStats.js';
import PostMortemHistory from './PostMortemHistory.jsx';
import LoadingState from './LoadingState.jsx';
import PlatformFilterToggle from './PlatformFilterToggle.jsx';
import usePlatformFilter from './usePlatformFilter.js';

const TIMING_ICONS = { early: '🏃', mid: '⚔️', late: '⏳' };
const ECONOMY_ICONS = { eco: '🥖', semi: '💵', full: '💰' };
const DISTANCE_ICONS = { close: '🔫', mid: '🎯', long: '🔭', verylong: '🏹' };

function clutchColor(winrate) {
  if (winrate === null) return 'var(--text)';
  if (winrate >= 50) return '#3ddc84';
  if (winrate >= 25) return 'var(--warning)';
  return 'var(--accent)';
}

function TacticalAnalysis({ settings, matches, loading }) {
  const { t } = useTranslation();
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);
  const timing = useMemo(() => deathTimingStats(filteredMatches, settings.name, settings.tag), [filteredMatches, settings.name, settings.tag]);
  const clutch = useMemo(() => clutchStats(filteredMatches, settings.name, settings.tag), [filteredMatches, settings.name, settings.tag]);
  const economy = useMemo(() => economyImpactStats(filteredMatches, settings.name, settings.tag), [filteredMatches, settings.name, settings.tag]);
  const distance = useMemo(() => duelDistanceStats(filteredMatches, settings.name, settings.tag), [filteredMatches, settings.name, settings.tag]);

  if (matches.length === 0) {
    if (loading) return <LoadingState />;
    return <p>{t('analyse.noMatchesYet')}</p>;
  }

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <div className="card">
        <h3>{t('analyse.timingTitle', { count: timing.total })}</h3>
        {timing.total === 0 ? (
          <p>{t('analyse.noDataYet')}</p>
        ) : (
          timing.buckets.map((b) => (
            <div key={b.id} className="stat-bar-row">
              <span className="stat-bar-label">{TIMING_ICONS[b.id]} {t(`analyse.timingBuckets.${b.id}`)}</span>
              <span className="stat-bar-track">
                <span className="stat-bar-fill" style={{ width: `${b.percent ?? 4}%` }} />
              </span>
              <span className="stat-bar-value">{b.percent === null ? '?' : `${b.percent.toFixed(0)}%`}</span>
              <span className="stat-bar-meta">{t('analyse.deathsCount', { count: b.count })}</span>
            </div>
          ))
        )}
        <p className="label" style={{ marginTop: '0.5rem' }}>{t('analyse.timingHint')}</p>
      </div>

      <div className="card">
        <h3>{t('analyse.distanceTitle')}</h3>
        {distance.rows.every((r) => r.total === 0) ? (
          <p>{t('analyse.notEnoughData')}</p>
        ) : (
          <>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value">
                  {distance.avgKillDistance === null ? '?' : `${distance.avgKillDistance.toFixed(1)}m`}
                </div>
                <div className="label">{t('analyse.avgKillDistance')}</div>
              </div>
              <div className="stat-tile">
                <div className="value">
                  {distance.avgDeathDistance === null ? '?' : `${distance.avgDeathDistance.toFixed(1)}m`}
                </div>
                <div className="label">{t('analyse.avgDeathDistance')}</div>
              </div>
              <div className="stat-tile">
                <div className="value" style={{ color: distance.dropOff !== null && distance.dropOff > 0 ? 'var(--accent)' : undefined }}>
                  {distance.dropOff === null ? '?' : `${distance.dropOff > 0 ? '-' : '+'}${Math.abs(distance.dropOff).toFixed(0)} pts`}
                </div>
                <div className="label">{t('analyse.winrateGap')}</div>
              </div>
            </div>

            {distance.rows.map((r) => (
              <div key={r.id} className="stat-bar-row" style={{ marginTop: '0.75rem' }}>
                <span className="stat-bar-label">{DISTANCE_ICONS[r.id]} {t(`analyse.distanceBuckets.${r.id}`)}</span>
                <span className="stat-bar-track">
                  <span
                    className={`stat-bar-fill ${r.winrate === null ? '' : r.winrate >= 50 ? 'good' : 'bad'}`}
                    style={{ width: `${r.winrate ?? 4}%` }}
                  />
                </span>
                <span className="stat-bar-value">{r.winrate === null ? '?' : `${r.winrate.toFixed(0)}%`}</span>
                <span className="stat-bar-meta">{t('analyse.killsDeathsMeta', { kills: r.kills, deaths: r.deaths })}</span>
              </div>
            ))}

            <p className="label" style={{ marginTop: '0.75rem' }}>{t('analyse.distanceHint')}</p>
          </>
        )}
      </div>

      <div className="card comp-score-card">
        <h3>{t('analyse.clutchTitle')}</h3>
        {clutch.attempts === 0 ? (
          <p>{t('analyse.noClutch')}</p>
        ) : (
          <>
            <div className="comp-score-main">
              <div className="comp-score-value" style={{ color: clutchColor(clutch.winrate) }}>
                {clutch.winrate === null ? '?' : clutch.winrate.toFixed(0)}
                <span className="comp-score-max">%</span>
              </div>
              <div className="label">{t('analyse.clutchWinrate')}</div>
            </div>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value">{clutch.attempts}</div>
                <div className="label">{t('analyse.attempts')}</div>
              </div>
              <div className="stat-tile">
                <div className="value">{clutch.wins}</div>
                <div className="label">{t('analyse.wins')}</div>
              </div>
            </div>
          </>
        )}
        <p className="label" style={{ marginTop: '0.5rem' }}>{t('analyse.clutchHint')}</p>
      </div>

      <div className="card">
        <h3>{t('analyse.economyTitle')}</h3>
        {economy.every((t2) => t2.rounds === 0) ? (
          <p>{t('analyse.noDataYet')}</p>
        ) : (
          economy.map((tier) => (
            <div key={tier.id} className="stat-bar-row">
              <span className="stat-bar-label">{ECONOMY_ICONS[tier.id]} {t(`common.economyTiers.${tier.id}`)}</span>
              <span className="stat-bar-track">
                <span
                  className={`stat-bar-fill ${tier.winrate === null ? '' : tier.winrate >= 50 ? 'good' : 'bad'}`}
                  style={{ width: `${tier.winrate ?? 4}%` }}
                />
              </span>
              <span className="stat-bar-value">{tier.winrate === null ? '?' : `${tier.winrate.toFixed(0)}%`}</span>
              <span className="stat-bar-meta">{t('analyse.roundsMeta', { count: tier.rounds })}</span>
            </div>
          ))
        )}
      </div>

      <PostMortemHistory />
    </div>
  );
}

export default TacticalAnalysis;
