import HallOfFame from '../sessions/HallOfFame.jsx';

function HallOfFameTab({ settings, matches, loading }) {
  return <HallOfFame settings={settings} matches={matches} loading={loading} />;
}

export default HallOfFameTab;
