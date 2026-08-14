import { useEffect, useState } from 'react';
import SettingsForm from './SettingsForm.jsx';
import MatchHistory from './MatchHistory.jsx';
import NetworkMonitor from './NetworkMonitor.jsx';

function App() {
  const [settings, setSettings] = useState(undefined);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  if (settings === undefined) {
    return null;
  }

  return (
    <div style={{ fontFamily: 'sans-serif', padding: '2rem' }}>
      <h1>🎮 MVP Tracker</h1>
      {settings ? (
        <>
          <NetworkMonitor />
          <MatchHistory settings={settings} />
        </>
      ) : (
        <SettingsForm onSaved={setSettings} />
      )}
    </div>
  );
}

export default App;
