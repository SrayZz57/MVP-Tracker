import TacticalAnalysis from '../TacticalAnalysis.jsx';

function AnalyseTab({ settings, matches, loading }) {
  return <TacticalAnalysis settings={settings} matches={matches} loading={loading} />;
}

export default AnalyseTab;
