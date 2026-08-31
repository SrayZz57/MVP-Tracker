import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Gamepad2, Trophy, Swords, Target } from 'lucide-react';
import { excludeDeathmatch, formStats, overallWinrate, overallHsPercent } from './valorantStats.js';
import { computeMapWinrates, computeDayPeriodGrid, computeRoleDistribution, computeTrend } from './performanceCharts.js';
import { useAgentRoles } from './agentIcons.js';
import KpiTile from './charts/KpiTile.jsx';
import AnimatedBarList from './charts/AnimatedBarList.jsx';
import HeatmapGrid from './charts/HeatmapGrid.jsx';
import RoleStackedBar from './charts/RoleStackedBar.jsx';
import LineChart from './charts/LineChart.jsx';
import LoadingState from './LoadingState.jsx';
import PlatformFilterToggle from './PlatformFilterToggle.jsx';
import usePlatformFilter from './usePlatformFilter.js';
import CollapsibleCard from './CollapsibleCard.jsx';

function PerformanceCharts({ settings, matches, loading }) {
  const { t } = useTranslation();
  const agentRoles = useAgentRoles();
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);
  const ranked = useMemo(() => excludeDeathmatch(filteredMatches), [filteredMatches]);

  const kpis = useMemo(() => {
    const form = formStats(ranked, settings.name, settings.tag);
    return {
      games: ranked.length,
      winrate: overallWinrate(ranked, settings.name, settings.tag),
      kd: form.overallKd,
      hsPercent: overallHsPercent(ranked, settings.name, settings.tag),
    };
  }, [ranked, settings.name, settings.tag]);

  const mapWinrates = useMemo(
    () => computeMapWinrates(filteredMatches, settings.name, settings.tag).map((r) => ({ key: r.key, value: r.winrate, meta: t('charts.gamesCount', { count: r.games }) })),
    [filteredMatches, settings.name, settings.tag, t],
  );

  const dayPeriodGrid = useMemo(
    () => computeDayPeriodGrid(filteredMatches, settings.name, settings.tag),
    [filteredMatches, settings.name, settings.tag],
  );

  const roleDistribution = useMemo(
    () => computeRoleDistribution(filteredMatches, settings.name, settings.tag, agentRoles),
    [filteredMatches, settings.name, settings.tag, agentRoles],
  );

  const trend = useMemo(
    () => computeTrend(t, filteredMatches, settings.name, settings.tag, 20),
    [t, filteredMatches, settings.name, settings.tag],
  );

  if (matches.length === 0) {
    if (loading) return <LoadingState />;
    return <p>{t('charts.noMatchesYet')}</p>;
  }

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <CollapsibleCard id="charts.kpis" title={t('charts.title')}>
        <p className="label">{t('charts.description')}</p>
        <div className="kpi-row">
          <KpiTile icon={Gamepad2} label={t('charts.rankedMatches')} value={kpis.games} />
          <KpiTile icon={Trophy} label={t('charts.globalWinrate')} value={kpis.winrate} suffix="%" />
          <KpiTile icon={Swords} label={t('charts.avgKd')} value={kpis.kd} decimals={2} />
          <KpiTile icon={Target} label={t('charts.hsAccuracy')} value={kpis.hsPercent} suffix="%" />
        </div>
      </CollapsibleCard>

      <CollapsibleCard id="charts.dayPeriod" title={t('charts.dayPeriodTitle')}>
        <p className="label">{t('charts.dayPeriodHint')}</p>
        <HeatmapGrid grid={dayPeriodGrid} />
      </CollapsibleCard>

      <div className="chart-grid-2">
        <CollapsibleCard id="charts.kdTrend" title={t('charts.kdTrendTitle')}>
          <LineChart data={trend.kd} color="#ff4655" />
        </CollapsibleCard>
        <CollapsibleCard id="charts.winrateTrend" title={t('charts.winrateTrendTitle')}>
          <LineChart data={trend.winrateRolling} color="#3987e5" unit="%" />
        </CollapsibleCard>
      </div>

      <CollapsibleCard id="charts.mapWinrate" title={t('charts.mapWinrateTitle')}>
        <AnimatedBarList rows={mapWinrates} />
      </CollapsibleCard>

      <CollapsibleCard id="charts.roleDistribution" title={t('charts.roleDistributionTitle')}>
        <RoleStackedBar rows={roleDistribution} />
      </CollapsibleCard>
    </div>
  );
}

export default PerformanceCharts;
