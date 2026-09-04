import BetsTracker from '../sessions/BetsTracker.jsx';

function BetsTab({ settings, matches }) {
  return <BetsTracker settings={settings} matches={matches} />;
}

export default BetsTab;
