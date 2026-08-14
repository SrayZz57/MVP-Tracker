import { useEffect, useState } from 'react';
import useValorantData from './useValorantData.js';
import StatsTab from './tabs/StatsTab.jsx';
import FormTab from './tabs/FormTab.jsx';
import NetworkTab from './tabs/NetworkTab.jsx';
import TiltTab from './tabs/TiltTab.jsx';
import CrosshairsTab from './tabs/CrosshairsTab.jsx';
import SettingsTab from './tabs/SettingsTab.jsx';
import logo from '../assets/logo.png';

const TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'forme', label: 'Perf & Forme' },
  { id: 'reseau', label: 'Réseau' },
  { id: 'tilt', label: 'Tilt' },
  { id: 'crosshairs', label: 'Crosshairs' },
  { id: 'reglages', label: 'Réglages' },
];

const NEEDS_SETTINGS = ['stats', 'forme', 'reseau', 'tilt'];

function App() {
  const [settings, setSettings] = useState(undefined);
  const [activeTab, setActiveTab] = useState('stats');
  const data = useValorantData(settings);

  useEffect(() => {
    window.electronAPI.getSettings().then((loaded) => {
      setSettings(loaded);
      if (!loaded) setActiveTab('reglages');
    });
  }, []);

  if (settings === undefined) {
    return null;
  }

  const renderTab = () => {
    if (NEEDS_SETTINGS.includes(activeTab) && !settings) {
      return <p>Configure tes réglages d'abord (onglet "Réglages").</p>;
    }
    switch (activeTab) {
      case 'stats':
        return <StatsTab settings={settings} matches={data.matches} />;
      case 'forme':
        return <FormTab settings={settings} matches={data.matches} />;
      case 'reseau':
        return <NetworkTab settings={settings} matches={data.matches} pingSamples={data.pingSamples} />;
      case 'tilt':
        return <TiltTab settings={settings} matches={data.matches} />;
      case 'crosshairs':
        return <CrosshairsTab />;
      case 'reglages':
        return <SettingsTab settings={settings} onSaved={setSettings} />;
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="topbar">
        <h1>
          <img src={logo} alt="MVP Tracker" className="logo" />
          MVP Tracker
        </h1>
        <nav className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={tab.id === activeTab ? 'tab active' : 'tab'}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        {settings && (
          <button onClick={data.refresh} disabled={data.loading} className="refresh">
            {data.loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        )}
      </header>

      {data.error && <p className="warning">Erreur : {data.error}</p>}

      <main className="content">{renderTab()}</main>
    </div>
  );
}

export default App;
