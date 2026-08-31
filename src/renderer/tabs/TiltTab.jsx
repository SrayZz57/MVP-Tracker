import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import Icon from '../Icon.jsx';
import { findMe, resultLabel, resultLabelKey, formStats, tiltStatus, tiltFrequency, excludeDeathmatch } from '../valorantStats.js';
import CountUp from '../CountUp.jsx';
import LoadingState from '../LoadingState.jsx';
import PlatformFilterToggle from '../PlatformFilterToggle.jsx';
import usePlatformFilter from '../usePlatformFilter.js';
import CollapsibleCard from '../CollapsibleCard.jsx';

const STREAK_DOTS_COUNT = 10;

function TiltTab({ settings, matches, loading }) {
  const { t } = useTranslation();
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);

  const form = useMemo(
    () => formStats(excludeDeathmatch(filteredMatches), settings.name, settings.tag),
    [filteredMatches, settings.name, settings.tag],
  );

  const tilt = useMemo(
    () => tiltStatus(excludeDeathmatch(filteredMatches), settings.name, settings.tag, form),
    [filteredMatches, settings.name, settings.tag, form],
  );

  const recentResults = useMemo(
    () =>
      excludeDeathmatch(filteredMatches)
        .slice(0, STREAK_DOTS_COUNT)
        .map((match) => {
          const me = findMe(match, settings.name, settings.tag);
          return { id: match.metadata?.matchid, label: resultLabel(match, me), map: match.metadata?.map };
        }),
    [filteredMatches, settings.name, settings.tag],
  );

  const last3KdRatio = form.overallKd && tilt.last3Kd !== null ? tilt.last3Kd / form.overallKd : null;

  const frequency = useMemo(
    () => tiltFrequency(filteredMatches, settings.name, settings.tag),
    [filteredMatches, settings.name, settings.tag],
  );

  if (matches.length === 0) {
    if (loading) return <LoadingState />;
    return <p>{t('tilt.noMatchesYet')}</p>;
  }

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <div className={`card tilt-card ${tilt.isTilted ? '' : 'calm'}`}>
        <div className="tilt-card-header">
          <span className="tilt-card-badge"><Icon icon={tilt.isTilted ? AlertTriangle : CheckCircle2} /></span>
          <div>
            <h3>{tilt.isTilted ? t('tilt.tiltedTitle') : t('tilt.calmTitle')}</h3>
            {tilt.isTilted ? (
              <p className="warning">
                {tilt.lossStreakTilt && t('tilt.lossStreak', { count: form.streakCount })}
                {tilt.perfDegradation &&
                  t('tilt.perfDegradation', { recentKd: tilt.last3Kd.toFixed(2), overallKd: form.overallKd.toFixed(2) })}
                {t('tilt.breakSuggestion')}
              </p>
            ) : (
              <p>{t('tilt.allGood')}</p>
            )}
          </div>
        </div>
      </div>

      <CollapsibleCard id="tilt.recentResults" title={t('tilt.recentResults')}>
        <div className="streak-dots">
          {recentResults.map((r) => (
            <span
              key={r.id}
              className={`streak-dot ${r.label === 'Victoire' ? 'win' : r.label === 'Défaite' ? 'loss' : 'neutral'}`}
              title={`${r.map ?? '?'} — ${resultLabelKey(r.label) ? t(resultLabelKey(r.label)) : r.label}`}
            />
          ))}
        </div>
        <p className="label" style={{ marginTop: '0.5rem' }}>
          {t('tilt.dotsHint')}
        </p>
      </CollapsibleCard>

      <CollapsibleCard id="tilt.frequency" title={t('tilt.frequencyTitle')}>
        {frequency.total === 0 ? (
          <p className="label">{t('tilt.notEnoughMatches')}</p>
        ) : (
          <>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value" style={{ color: frequency.percent >= 20 ? 'var(--accent)' : undefined }}>
                  <CountUp value={frequency.percent} decimals={1} suffix="%" />
                </div>
                <div className="label">{t('tilt.tiltedMatchesPercent')}</div>
              </div>
              <div className="stat-tile">
                <div className="value"><CountUp value={frequency.tiltedCount} /></div>
                <div className="label">{t('tilt.matchesInTiltStreak')}</div>
              </div>
              <div className="stat-tile">
                <div className="value"><CountUp value={frequency.total} /></div>
                <div className="label">{t('tilt.totalMatchesAnalyzed')}</div>
              </div>
            </div>
            <p className="label" style={{ marginTop: '0.75rem' }}>
              {t('tilt.frequencyHint')}
            </p>
          </>
        )}
      </CollapsibleCard>

      <CollapsibleCard id="tilt.whatIsWatched" title={t('tilt.whatIsWatched')}>
        <div className="stat-tiles">
          <div className="stat-tile">
            <div className="value" style={{ color: tilt.lossStreakTilt ? 'var(--accent)' : undefined }}>
              {form.streakType === 'Défaite' ? form.streakCount : 0}
            </div>
            <div className="label">{t('tilt.lossStreakLabel')}</div>
          </div>
          <div className="stat-tile">
            <div className="value" style={{ color: tilt.perfDegradation ? 'var(--accent)' : undefined }}>
              {tilt.last3Kd === null ? '?' : tilt.last3Kd.toFixed(2)}
            </div>
            <div className="label">{t('tilt.last3Kd')}</div>
          </div>
          <div className="stat-tile">
            <div className="value">{last3KdRatio === null ? '?' : `${(last3KdRatio * 100).toFixed(0)}%`}</div>
            <div className="label">{t('tilt.ofOverallAverage')}</div>
          </div>
        </div>

        <h4 className="account-subsection-title" style={{ marginTop: '1rem' }}>{t('tilt.howItWorks')}</h4>
        <p className="label">{t('tilt.howItWorksIntro')}</p>
        <div className="tilt-rule-list">
          <div className={`tilt-rule ${tilt.lossStreakTilt ? 'active' : ''}`}>
            <span className="tilt-rule-icon"><Icon icon={Circle} size={12} fill="currentColor" /></span>
            {t('tilt.rule1')}
          </div>
          <div className={`tilt-rule ${tilt.perfDegradation ? 'active' : ''}`}>
            <span className="tilt-rule-icon"><Icon icon={Circle} size={12} fill="currentColor" /></span>
            {t('tilt.rule2')}
          </div>
        </div>
      </CollapsibleCard>
    </div>
  );
}

export default TiltTab;
