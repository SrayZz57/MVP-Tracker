import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Flame, Map, AlertTriangle, CheckCircle2, Target } from 'lucide-react';
import Icon from './Icon.jsx';
import { buildSessionPlan } from './sessionPlan.js';
import LoadingState from './LoadingState.jsx';
import PlatformFilterToggle from './PlatformFilterToggle.jsx';
import usePlatformFilter from './usePlatformFilter.js';
import CollapsibleCard from './CollapsibleCard.jsx';

function buildChecklist(t, plan, latestStrategy) {
  const items = [
    {
      id: 'warmup',
      icon: Flame,
      title: t('session.warmupTitle', { count: plan.warmup.minutes }),
      detail: plan.warmup.reason,
      level: 'info',
    },
  ];

  if (plan.targetMap) {
    items.push(
      latestStrategy
        ? {
            id: 'strategy',
            icon: Map,
            title: t('session.strategyReviewTitle', { name: latestStrategy.name, map: plan.targetMap }),
            detail: t('session.strategyReviewDetail'),
            level: 'info',
          }
        : {
            id: 'strategy',
            icon: Map,
            title: t('session.noStrategyTitle', { map: plan.targetMap }),
            detail: t('session.noStrategyDetail'),
            level: 'info',
          },
    );
  }

  items.push(
    plan.tilt.isTilted
      ? {
          id: 'tilt',
          icon: AlertTriangle,
          title: t('session.tiltedTitle'),
          detail: t('session.tiltedDetail', { count: plan.matchCount }),
          level: 'warning',
        }
      : {
          id: 'tilt',
          icon: CheckCircle2,
          title: t('session.calmTitle'),
          detail: t('session.calmDetail'),
          level: 'good',
        },
  );

  items.push({
    id: 'objective',
    icon: Target,
    title: t('session.objectiveTitle'),
    detail: plan.objective,
    level: 'info',
  });

  return items;
}

function SessionGuide({ settings, matches, loading: matchesLoading }) {
  const { t } = useTranslation();
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);
  const [plan, setPlan] = useState(null);
  const [latestStrategy, setLatestStrategy] = useState(null);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);

  const checklist = useMemo(() => (plan ? buildChecklist(t, plan, latestStrategy) : []), [t, plan, latestStrategy]);

  async function handleLaunch() {
    setLoading(true);
    const newPlan = buildSessionPlan(t, filteredMatches, settings.name, settings.tag);
    setPlan(newPlan);
    setChecked({});
    if (newPlan.targetMap) {
      const strategies = await window.electronAPI.listStrategies(newPlan.targetMap);
      setLatestStrategy(strategies[0] ?? null);
    } else {
      setLatestStrategy(null);
    }
    setLoading(false);
  }

  function toggleChecked(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (matches.length === 0) {
    if (matchesLoading) return <LoadingState />;
    return <p>{t('session.noMatchesYet')}</p>;
  }

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <CollapsibleCard id="session.intro" title={t('session.title')}>
        <p className="label">{t('session.description')}</p>
        <button className="refresh" onClick={handleLaunch} disabled={loading}>
          {plan ? t('session.newSession') : t('session.launch')}
        </button>
      </CollapsibleCard>

      {plan && (
        <CollapsibleCard
          id="session.checklist"
          title={t('session.checklistTitle')}
          headerExtra={
            <span className="achievement-group-count">
              {Object.values(checked).filter(Boolean).length}/{checklist.length}
            </span>
          }
        >
          <div className="achievement-group-track">
            <div
              className="achievement-group-fill"
              style={{ width: `${(Object.values(checked).filter(Boolean).length / checklist.length) * 100}%` }}
            />
          </div>
          <div className="session-checklist">
            {checklist.map((item) => (
              <label key={item.id} className={`session-check-item ${item.level} ${checked[item.id] ? 'done' : ''}`}>
                <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggleChecked(item.id)} />
                <span className="session-check-icon-badge"><Icon icon={item.icon} size={16} /></span>
                <span className="session-check-body">
                  <span className="session-check-title">{item.title}</span>
                  <span className="session-check-detail">{item.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </CollapsibleCard>
      )}
    </div>
  );
}

export default SessionGuide;
