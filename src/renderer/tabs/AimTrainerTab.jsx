import AimTrainer from '../aim/AimTrainer.jsx';

function AimTrainerTab({ myId, matches, settings, apiKey }) {
  return <AimTrainer myId={myId} matches={matches} settings={settings} apiKey={apiKey} />;
}

export default AimTrainerTab;
