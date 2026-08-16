import { useEffect, useState } from 'react';
import useValorantData from './useValorantData.js';
import StatsTab from './tabs/StatsTab.jsx';
import FormTab from './tabs/FormTab.jsx';
import NetworkTab from './tabs/NetworkTab.jsx';
import TiltTab from './tabs/TiltTab.jsx';
import CrosshairsTab from './tabs/CrosshairsTab.jsx';
import StrategyTab from './tabs/StrategyTab.jsx';
import SkinsTab from './tabs/SkinsTab.jsx';
import HeatmapTab from './tabs/HeatmapTab.jsx';
import AnalyseTab from './tabs/AnalyseTab.jsx';
import GoalsWidget from './GoalsWidget.jsx';
import WeeklyRecapCard from './WeeklyRecapCard.jsx';
import SearchBar from './SearchBar.jsx';
import WelcomeScreen from './WelcomeScreen.jsx';
import { useRankTiers, usePlayerCardArt } from './rankData.js';
import logo from '../assets/logo.png';

const NAV_SECTIONS = [
  {
    label: 'Performance',
    tabs: [
      { id: 'stats', label: 'Stats', icon: '📊' },
      { id: 'forme', label: 'Perf & Forme', icon: '⏰' },
      { id: 'tilt', label: 'Tilt', icon: '😤' },
      { id: 'heatmap', label: 'Heatmap', icon: '🔥' },
      { id: 'analyse', label: 'Analyse', icon: '🧠' },
    ],
  },
  {
    label: 'Réseau',
    tabs: [{ id: 'reseau', label: 'Réseau', icon: '📶' }],
  },
  {
    label: 'Outils',
    tabs: [
      { id: 'crosshairs', label: 'Crosshairs', icon: '🎯' },
      { id: 'strategie', label: 'Stratégie', icon: '🗺️' },
      { id: 'skins', label: 'Skins', icon: '💎' },
    ],
  },
];

const ALL_TABS = NAV_SECTIONS.flatMap((s) => s.tabs);

function SidebarProfile({ settings, rank }) {
  const rankTiers = useRankTiers();
  const playerCardArt = usePlayerCardArt(rank?.cardUuid);
  const currentTier = rank ? rankTiers.get(rank.tierId) : null;

  return (
    <div className="sidebar-profile">
      <div className="sidebar-profile-avatar">
        {playerCardArt.icon ? <img src={playerCardArt.icon} alt="" /> : <span>{settings.name.charAt(0)}</span>}
      </div>
      <div className="sidebar-profile-info">
        <div className="sidebar-profile-name">
          {settings.name}
          <span className="profile-tag">#{settings.tag}</span>
        </div>
        {rank ? (
          <div className="sidebar-profile-rank">
            {currentTier?.icon && <img src={currentTier.icon} alt="" />}
            <span>{rank.tierName}</span>
          </div>
        ) : (
          <div className="sidebar-profile-rank label">Rang indisponible</div>
        )}
      </div>
    </div>
  );
}

function App() {
  const [settings, setSettings] = useState(undefined);
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
      case 'heatmap':
        return <HeatmapTab settings={settings} matches={data.matches} />;
      case 'analyse':
        return <AnalyseTab settings={settings} matches={data.matches} />;
      default:
        return null;
    }
  };

  const currentTabMeta = ALL_TABS.find((t) => t.id === activeTab);

  return (
    <div className="app app-with-sidebar">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <img src={logo} alt="MVP Tracker" className="logo" />
          <span>MVP Tracker</span>
        </div>

        <div className="sidebar-nav">
          {NAV_SECTIONS.map((section) => (
            <div key={section.label} className="sidebar-section">
              <div className="sidebar-section-label">{section.label}</div>
              {section.tabs.map((tab) => (
                <button
                  key={tab.id}
                  className={tab.id === activeTab ? 'sidebar-link active' : 'sidebar-link'}
                  onClick={() => setActiveTab(tab.id)}
                >
                  <span className="sidebar-link-icon">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </div>
          ))}
        </div>

        <SidebarProfile settings={settings} rank={data.rank} />
      </nav>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-title-icon">{currentTabMeta?.icon}</span>
            <h2>{currentTabMeta?.label}</h2>
          </div>
          <SearchBar initialSettings={settings} onSearch={setSettings} />
          <button onClick={data.refresh} disabled={data.loading} className="refresh">
            {data.loading ? 'Chargement...' : 'Rafraîchir'}
          </button>
        </header>

        {data.error && <p className="warning">Erreur : {data.error}</p>}

        <main className="content" key={activeTab}>
          {renderValorantTab()}
        </main>
      </div>

      <GoalsWidget matches={data.matches} settings={settings} />
      <WeeklyRecapCard matches={data.matches} settings={settings} rank={data.rank} />
    </div>
  );
}

export default App;
