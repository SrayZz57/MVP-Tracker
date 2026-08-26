import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
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

      <div className="card">
        <h3>{t('charts.title')}</h3>
        <p className="label">{t('charts.description')}</p>
        <div className="kpi-row">
          <KpiTile icon="🎮" label={t('charts.rankedMatches')} value={kpis.games} />
          <KpiTile icon="🏆" label={t('charts.globalWinrate')} value={kpis.winrate} suffix="%" />
          <KpiTile icon="⚔️" label={t('charts.avgKd')} value={kpis.kd} decimals={2} />
          <KpiTile icon="🎯" label={t('charts.hsAccuracy')} value={kpis.hsPercent} suffix="%" />
        </div>
      </div>

      <div className="card">
        <h3>{t('charts.dayPeriodTitle')}</h3>
        <p className="label">{t('charts.dayPeriodHint')}</p>
        <HeatmapGrid grid={dayPeriodGrid} />
      </div>

      <div className="chart-grid-2">
        <div className="card">
          <h3>{t('charts.kdTrendTitle')}</h3>
          <LineChart data={trend.kd} color="#ff4655" />
        </div>
        <div className="card">
          <h3>{t('charts.winrateTrendTitle')}</h3>
          <LineChart data={trend.winrateRolling} color="#3987e5" unit="%" />
        </div>
      </div>

      <div className="card">
        <h3>{t('charts.mapWinrateTitle')}</h3>
        <AnimatedBarList rows={mapWinrates} />
      </div>

      <div className="card">
        <h3>{t('charts.roleDistributionTitle')}</h3>
        <RoleStackedBar rows={roleDistribution} />
      </div>
    </div>
  );
}

export default PerformanceCharts;
