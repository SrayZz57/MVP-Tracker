import { useMemo } from 'react';
import { excludeDeathmatch, formStats, overallWinrate, overallHsPercent } from './valorantStats.js';
import { computeMapWinrates, computeDayPeriodGrid, computeRoleDistribution, computeTrend } from './performanceCharts.js';
import { useAgentRoles } from './agentIcons.js';
import KpiTile from './charts/KpiTile.jsx';
import AnimatedBarList from './charts/AnimatedBarList.jsx';
import HeatmapGrid from './charts/HeatmapGrid.jsx';
import RoleStackedBar from './charts/RoleStackedBar.jsx';
import LineChart from './charts/LineChart.jsx';

function PerformanceCharts({ settings, matches }) {
  const agentRoles = useAgentRoles();
  const ranked = useMemo(() => excludeDeathmatch(matches), [matches]);

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
    () => computeMapWinrates(matches, settings.name, settings.tag).map((r) => ({ key: r.key, value: r.winrate, meta: `${r.games} parties` })),
    [matches, settings.name, settings.tag],
  );

  const dayPeriodGrid = useMemo(
    () => computeDayPeriodGrid(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  const roleDistribution = useMemo(
    () => computeRoleDistribution(matches, settings.name, settings.tag, agentRoles),
    [matches, settings.name, settings.tag, agentRoles],
  );

  const trend = useMemo(
    () => computeTrend(matches, settings.name, settings.tag, 20),
    [matches, settings.name, settings.tag],
  );

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>📈 Graphiques</h3>
        <p className="label">Un résumé visuel de tes stats, calculé à partir de ton historique en cache.</p>
        <div className="kpi-row">
          <KpiTile label="Matchs classés" value={kpis.games} />
          <KpiTile label="Winrate global" value={kpis.winrate} suffix="%" />
          <KpiTile label="K/D moyen" value={kpis.kd} decimals={2} />
          <KpiTile label="Précision tête" value={kpis.hsPercent} suffix="%" />
        </div>
      </div>

      <div className="card">
        <h3>🗓️ Performance par jour et moment de la journée</h3>
        <p className="label">Winrate par créneau — plus la case est bleue, meilleur est ton winrate à ce moment-là.</p>
        <HeatmapGrid grid={dayPeriodGrid} />
      </div>

      <div className="chart-grid-2">
        <div className="card">
          <h3>📉 K/D sur les 20 derniers matchs</h3>
          <LineChart data={trend.kd} color="#ff4655" />
        </div>
        <div className="card">
          <h3>📊 Winrate glissant (fenêtre de 5 matchs)</h3>
          <LineChart data={trend.winrateRolling} color="#3987e5" unit="%" />
        </div>
      </div>

      <div className="card">
        <h3>🗺️ Winrate par map</h3>
        <AnimatedBarList rows={mapWinrates} />
      </div>

      <div className="card">
        <h3>🎭 Répartition par rôle</h3>
        <RoleStackedBar rows={roleDistribution} />
      </div>
    </div>
  );
}

export default PerformanceCharts;
