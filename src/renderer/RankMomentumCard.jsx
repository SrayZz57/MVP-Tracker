import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { computeRankMomentum } from './rankMomentum.js';

function fmt(value, suffix = '') {
  return value === null ? '?' : `${value.toFixed(value < 10 ? 2 : 0)}${suffix}`;
}

function RankMomentumCard({ settings, matches }) {
  const { t } = useTranslation();
  const momentum = useMemo(
    () => computeRankMomentum(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  if (!momentum.ready) {
    return (
      <div className="card">
        <h3>{t('rankMomentum.title')}</h3>
        <p className="label">
          {t('rankMomentum.notReady', { count: momentum.minGames - momentum.gamesAnalyzed })}
        </p>
      </div>
    );
  }

  return (
    <div className={`card ${momentum.trending ? 'highlight-card' : ''}`}>
      <h3>{t('rankMomentum.title')}</h3>
      {momentum.trending ? (
        <p className="warning" style={{ fontWeight: 600 }}>{t('rankMomentum.trending')}</p>
      ) : (
        <p className="label">{t('rankMomentum.stable')}</p>
      )}

      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="value">
            {fmt(momentum.recentStats.kd)} <span className="label">{t('rankMomentum.vs', { value: fmt(momentum.baselineStats.kd) })}</span>
          </div>
          <div className="label">{t('rankMomentum.kdVsUsual')}</div>
        </div>
        <div className="stat-tile">
          <div className="value">
            {fmt(momentum.recentStats.winrate, '%')} <span className="label">{t('rankMomentum.vs', { value: fmt(momentum.baselineStats.winrate, '%') })}</span>
          </div>
          <div className="label">{t('rankMomentum.winrateVsUsual')}</div>
        </div>
        <div className="stat-tile">
          <div className="value">
            {fmt(momentum.recentStats.hsPercent, '%')} <span className="label">{t('rankMomentum.vs', { value: fmt(momentum.baselineStats.hsPercent, '%') })}</span>
          </div>
          <div className="label">{t('rankMomentum.accuracyVsUsual')}</div>
        </div>
      </div>

      <p className="label" style={{ marginTop: '0.75rem' }}>{t('rankMomentum.hint')}</p>
    </div>
  );
}

export default RankMomentumCard;
