import BuySimulator from '../collection/BuySimulator.jsx';

function BuySimulatorTab({ settings, matches, loading }) {
  return <BuySimulator settings={settings} matches={matches} loading={loading} />;
}

export default BuySimulatorTab;
