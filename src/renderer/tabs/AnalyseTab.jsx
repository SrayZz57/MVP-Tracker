import TacticalAnalysis from '../stats/TacticalAnalysis.jsx';

function AnalyseTab({ settings, matches, loading }) {
  return <TacticalAnalysis settings={settings} matches={matches} loading={loading} />;
}

export default AnalyseTab;
