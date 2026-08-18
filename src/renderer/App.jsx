import { useEffect, useLayoutEffect, useRef, useState } from 'react';
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
import CompositionTab from './tabs/CompositionTab.jsx';
import HallOfFameTab from './tabs/HallOfFameTab.jsx';
import PerformanceChartsTab from './tabs/PerformanceChartsTab.jsx';
import TeammatesRivalsTab from './tabs/TeammatesRivalsTab.jsx';
import BuySimulatorTab from './tabs/BuySimulatorTab.jsx';
import BetsTab from './tabs/BetsTab.jsx';
import SessionGuideTab from './tabs/SessionGuideTab.jsx';
import DailyPuzzleTab from './tabs/DailyPuzzleTab.jsx';
import WikiTab from './tabs/WikiTab.jsx';
import GoalsWidget from './GoalsWidget.jsx';
import WeeklyRecapCard from './WeeklyRecapCard.jsx';
import PostMortemModal from './PostMortemModal.jsx';
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
      { id: 'hall-of-fame', label: 'Hall of Fame', icon: '🏆' },
      { id: 'social', label: 'Coéquipiers & Rivaux', icon: '🤝' },
      { id: 'graphiques', label: 'Graphiques', icon: '📈' },
    ],
  },
  {
    label: 'Réseau',
    tabs: [{ id: 'reseau', label: 'Réseau', icon: '📶' }],
  },
  {
    label: 'Entraînement',
    tabs: [
      { id: 'session', label: 'Session guidée', icon: '🎬' },
      { id: 'puzzle', label: 'Puzzle du jour', icon: '🎲' },
      { id: 'bets', label: 'Paris perso', icon: '🎰' },
    ],
  },
  {
    label: 'Outils',
    tabs: [
      { id: 'crosshairs', label: 'Crosshairs', icon: '🎯' },
      { id: 'strategie', label: 'Stratégie', icon: '🗺️' },
      { id: 'skins', label: 'Skins', icon: '💎' },
      { id: 'composition', label: 'Composition', icon: '🧩' },
      { id: 'buy-simulator', label: "Simulation d'achat", icon: '💰' },
      { id: 'wiki', label: 'Wiki', icon: '📖' },
    ],
  },
];

const ALL_TABS = NAV_SECTIONS.flatMap((s) => s.tabs);

function SidebarProfile({ settings, rank, onClick }) {
  const rankTiers = useRankTiers();
  const playerCardArt = usePlayerCardArt(rank?.cardUuid);
  const currentTier = rank ? rankTiers.get(rank.tierId) : null;

  return (
    <button className="sidebar-profile" onClick={onClick}>
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
    </button>
  );
}

function App() {
  const [settings, setSettings] = useState(undefined);
  const [activeTab, setActiveTab] = useState('stats');
  const data = useValorantData(settings);
  const sidebarNavRef = useRef(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  // Fait glisser un repère lumineux vers le lien actif au lieu de le faire
  // juste réapparaître à une nouvelle position — mesuré dynamiquement car les
  // sections du sidebar n'ont pas toutes la même hauteur.
  useLayoutEffect(() => {
    const container = sidebarNavRef.current;
    const activeEl = container?.querySelector('.sidebar-link.active');
    if (!container || !activeEl) return;
    setIndicator({
      top: activeEl.offsetTop,
      height: activeEl.offsetHeight,
      ready: true,
    });
  }, [activeTab, settings]);

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
      case 'composition':
        return <CompositionTab settings={settings} matches={data.matches} />;
      case 'hall-of-fame':
        return <HallOfFameTab settings={settings} matches={data.matches} />;
      case 'graphiques':
        return <PerformanceChartsTab settings={settings} matches={data.matches} />;
      case 'social':
        return <TeammatesRivalsTab settings={settings} matches={data.matches} />;
      case 'buy-simulator':
        return <BuySimulatorTab settings={settings} matches={data.matches} />;
      case 'bets':
        return <BetsTab settings={settings} matches={data.matches} />;
      case 'session':
        return <SessionGuideTab settings={settings} matches={data.matches} />;
      case 'puzzle':
        return <DailyPuzzleTab settings={settings} matches={data.matches} />;
      case 'wiki':
        return <WikiTab />;
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

        <div className="sidebar-nav" ref={sidebarNavRef}>
          <div
            className="sidebar-active-indicator"
            style={{
              transform: `translateY(${indicator.top}px)`,
              height: indicator.height,
              opacity: indicator.ready ? 1 : 0,
            }}
          />
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

        <SidebarProfile settings={settings} rank={data.rank} onClick={() => setActiveTab('stats')} />
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
      <PostMortemModal matches={data.matches} settings={settings} />
    </div>
  );
}

export default App;
