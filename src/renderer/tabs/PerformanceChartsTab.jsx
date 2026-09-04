import PerformanceCharts from '../stats/PerformanceCharts.jsx';

function PerformanceChartsTab({ settings, matches, loading }) {
  return <PerformanceCharts settings={settings} matches={matches} loading={loading} />;
}

export default PerformanceChartsTab;
