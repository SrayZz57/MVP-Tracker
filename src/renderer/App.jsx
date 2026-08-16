import { useEffect, useState } from 'react';
import useValorantData from './useValorantData.js';
import StatsTab from './tabs/StatsTab.jsx';
import FormTab from './tabs/FormTab.jsx';
import NetworkTab from './tabs/NetworkTab.jsx';
import TiltTab from './tabs/TiltTab.jsx';
import CrosshairsTab from './tabs/CrosshairsTab.jsx';
import StrategyTab from './tabs/StrategyTab.jsx';
import SkinsTab from './tabs/SkinsTab.jsx';
import OverwatchTab from './tabs/OverwatchTab.jsx';
import SearchBar from './SearchBar.jsx';
import WelcomeScreen from './WelcomeScreen.jsx';
import logo from '../assets/logo.png';

const GAMES = [
  { id: 'valorant', label: 'Valorant' },
  { id: 'overwatch', label: 'Overwatch' },
];

const VALORANT_TABS = [
  { id: 'stats', label: 'Stats' },
  { id: 'forme', label: 'Perf & Forme' },
  { id: 'reseau', label: 'Réseau' },
  { id: 'tilt', label: 'Tilt' },
  { id: 'crosshairs', label: 'Crosshairs' },
  { id: 'strategie', label: 'Stratégie' },
  { id: 'skins', label: 'Skins' },
];

function App() {
  const [settings, setSettings] = useState(undefined);
  const [activeGame, setActiveGame] = useState('valorant');
  const [activeTab, setActiveTab] = useState('stats');
  const data = useValorantData(settings);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  if (settings === undefined) {
    return null;
  }

  if (!settings) {
    return <WelcomeScreen onSaved={setSettings} />;
  }

  const renderValorantTab = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsTab settings={settings} matches={data.matches} rank={data.rank} />;
      case 'forme':
        return <FormTab settings={settings} matches={data.matches} />;
      case 'reseau':
        return <NetworkTab settings={settings} matches={data.matches} pingSamples={data.pingSamples} />;
      case 'tilt':
        return <TiltTab settings={settings} matches={data.matches} />;
      case 'crosshairs':
        return <CrosshairsTab />;
      case 'strategie':
        return <StrategyTab />;
      case 'skins':
        return <SkinsTab />;
      default:
        return null;
    }
  };

  return (
    <div className={`app ${activeGame}`}>
      <nav className="game-switcher">
        {GAMES.map((game) => (
          <button
            key={game.id}
            className={game.id === activeGame ? `game-tab active ${game.id}` : `game-tab ${game.id}`}
            onClick={() => setActiveGame(game.id)}
          >
            {game.label}
          </button>
        ))}
      </nav>

      <header className="topbar">
        <h1>
          <img src={logo} alt="MVP Tracker" className="logo" />
          MVP Tracker
        </h1>

        {activeGame === 'valorant' && (
          <>
            <nav className="tabs">
              {VALORANT_TABS.map((tab) => (
                <button
                  key={tab.id}
                  className={tab.id === activeTab ? 'tab active' : 'tab'}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </nav>
            <SearchBar initialSettings={settings} onSearch={setSettings} />
            <button onClick={data.refresh} disabled={data.loading} className="refresh">
              {data.loading ? 'Chargement...' : 'Rafraîchir'}
            </button>
          </>
        )}
      </header>

      {data.error && activeGame === 'valorant' && <p className="warning">Erreur : {data.error}</p>}

      <main className="content">{activeGame === 'valorant' ? renderValorantTab() : <OverwatchTab />}</main>
    </div>
  );
}

export default App;
