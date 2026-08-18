import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import useValorantData from './useValorantData.js';
import StatsTab from './tabs/StatsTab.jsx';
import FormTab from './tabs/FormTab.jsx';
import NetworkTab from './tabs/NetworkTab.jsx';
import TiltTab from './tabs/TiltTab.jsx';
import CrosshairsTab from './tabs/CrosshairsTab.jsx';
import StrategyTab from './tabs/StrategyTab.jsx';
import SkinsTab from './tabs/SkinsTab.jsx';
import MySkinsCollectionTab from './tabs/MySkinsCollectionTab.jsx';
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
import LinkRiotAccount from './LinkRiotAccount.jsx';
import AccountGreeting from './AccountGreeting.jsx';
import AccountAuth from './AccountAuth.jsx';
import { supabase } from './supabaseClient.js';
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
      { id: 'social', label: 'Coéquipiers & Rivaux', icon: '🤝' },
      { id: 'graphiques', label: 'Graphiques', icon: '📈' },
    ],
  },
  {
    label: 'Mon compte',
    tabs: [
      { id: 'my-hall-of-fame', label: 'Mon Hall of Fame', icon: '🏆' },
      { id: 'my-social', label: 'Mes coéquipiers & rivaux', icon: '🤝' },
      { id: 'my-skins-collection', label: 'Ma collection', icon: '💎' },
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
  const [session, setSession] = useState(undefined); // undefined = chargement, null = déconnecté
  const [profile, setProfile] = useState(undefined); // undefined = chargement, null = pas encore lié
  // true uniquement après un vrai passage par l'écran de recherche Riot ID
  // *pendant cette session* — jamais déduit des réglages déjà en cache, pour
  // qu'un compte sans lien Supabase ne se relie pas silencieusement avec un
  // ancien puuid local laissé par un autre compte.
  const [linkingRiot, setLinkingRiot] = useState(false);
  // Écran d'accueil léger (aperçu + choix) affiché à chaque lancement une
  // fois le compte lié, avant d'entrer dans l'app proprement dite.
  const [enteredApp, setEnteredApp] = useState(false);
  const [showGeneralSearch, setShowGeneralSearch] = useState(false);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
  }, []);

  // Matchs du compte LIÉ, indépendants de qui est actuellement affiché — le
  // wrapped (et tout widget "personnel" à venir) doit toujours parler de toi,
  // même en train de consulter le tracker de quelqu'un d'autre. Quand tu
  // regardes ton propre profil, `data.matches` est déjà à jour, donc on le
  // réutilise directement plutôt que de refaire un aller-retour inutile.
  const [myMatches, setMyMatches] = useState([]);
  useEffect(() => {
    if (!profile?.riot_puuid) return;
    if (settings?.puuid === profile.riot_puuid) {
      setMyMatches(data.matches);
      return;
    }
    window.electronAPI.getCachedMatchesFor(profile.riot_puuid).then(setMyMatches);
  }, [profile?.riot_puuid, settings?.puuid, data.matches]);
  const isViewingSelf = !!profile && settings?.puuid === profile.riot_puuid;
  const mySettings = profile ? { name: profile.riot_name, tag: profile.riot_tag } : settings;

  // Même principe que pour les matchs : le rang stocké localement ne l'était
  // que pour "le dernier profil consulté", pas par compte — on le relit
  // explicitement pour le puuid du compte lié, peu importe qui est affiché.
  const [myRank, setMyRank] = useState(null);
  useEffect(() => {
    if (!profile?.riot_puuid) return;
    if (isViewingSelf) {
      setMyRank(data.rank);
      return;
    }
    window.electronAPI.getRankFor(profile.riot_puuid).then(setMyRank);
  }, [profile?.riot_puuid, isViewingSelf, data.rank]);

  // Garde main.js informé du puuid du compte réellement lié — c'est cette
  // valeur (pas les réglages "vue courante") qui scope crosshairs, stratégies,
  // paris, puzzles, wrapped, objectifs et skins côté disque.
  useEffect(() => {
    window.electronAPI.setLinkedPuuid(profile?.riot_puuid ?? null);
  }, [profile?.riot_puuid]);

  // Compte MVP Tracker (Supabase) — étape à part du Riot ID : se connecter au
  // compte de l'app ne veut pas dire avoir déjà lié un pseudo Valo.
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: current } }) => setSession(current));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setProfile(undefined); // reforce la vérification du lien Riot ID pour ce compte
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  // Le Riot ID lié à CE compte fait foi, pas les réglages locaux — sinon un
  // deuxième compte sur la même machine hériterait silencieusement du Riot ID
  // du précédent utilisateur connecté.
  useEffect(() => {
    if (!session) return;
    supabase
      .from('profiles')
      .select('riot_name, riot_tag, riot_puuid')
      .eq('id', session.user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('[profiles] échec de la lecture du profil :', error.message);
        setProfile(data ?? null);
      });
  }, [session]);

  // Lie le compte au Riot ID uniquement suite à un passage volontaire par
  // l'écran de recherche (linkingRiot), une fois le puuid résolu — jamais à
  // partir d'un puuid déjà en cache sans action explicite de l'utilisateur.
  useEffect(() => {
    if (!session || !linkingRiot || !settings?.puuid) return;
    supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        riot_name: settings.name,
        riot_tag: settings.tag,
        riot_puuid: settings.puuid,
      })
      .then(({ error }) => {
        if (error) {
          console.error('[profiles] échec de la liaison Riot ID :', error.message);
          return;
        }
        setProfile({ riot_name: settings.name, riot_tag: settings.tag, riot_puuid: settings.puuid });
        setLinkingRiot(false);
      });
  }, [session, linkingRiot, settings?.puuid, settings?.name, settings?.tag]);

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

  if (session === undefined || settings === undefined) {
    return null;
  }

  if (!session) {
    return <AccountAuth />;
  }

  if (profile === undefined) {
    return null;
  }

  if (profile === null) {
    if (linkingRiot) {
      // Le puuid est déjà connu à ce stade (issu de l'aperçu confirmé) —
      // l'écriture du lien est quasi instantanée, ce n'est qu'un court passage.
      return (
        <div className="welcome-screen">
          <div className="welcome-bg" aria-hidden="true">
            <span className="welcome-orb welcome-orb-1" />
            <span className="welcome-orb welcome-orb-2" />
            <span className="welcome-orb welcome-orb-3" />
            <span className="welcome-orb welcome-orb-4" />
          </div>
          <p className="label">Liaison de ton compte en cours...</p>
        </div>
      );
    }
    return (
      <LinkRiotAccount
        onConfirmed={(confirmedSettings) => {
          window.electronAPI.saveSettings(confirmedSettings);
          setSettings(confirmedSettings);
          setLinkingRiot(true);
        }}
      />
    );
  }

  // À partir d'ici, le compte est bien lié (profile existe).
  if (!settings) {
    return <WelcomeScreen onSaved={setSettings} />;
  }

  if (!enteredApp) {
    if (showGeneralSearch) {
      return (
        <WelcomeScreen
          onSaved={(newSettings) => {
            setSettings(newSettings);
            setEnteredApp(true);
          }}
        />
      );
    }
    return (
      <AccountGreeting
        settings={mySettings}
        rank={myRank}
        onEnter={() => {
          // Si les réglages locaux affichaient un autre profil (ex. après
          // avoir cherché quelqu'un d'autre), on repasse sur le compte lié
          // avant d'entrer — la clé API reste celle déjà en cache (elle n'est
          // pas propre à un Riot ID précis).
          if (settings?.puuid !== profile.riot_puuid) {
            const ownSettings = {
              name: profile.riot_name,
              tag: profile.riot_tag,
              puuid: profile.riot_puuid,
              apiKey: settings?.apiKey,
            };
            window.electronAPI.saveSettings(ownSettings);
            setSettings(ownSettings);
          }
          setEnteredApp(true);
        }}
        onSearchOther={() => setShowGeneralSearch(true)}
      />
    );
  }

  const renderValorantTab = () => {
    switch (activeTab) {
      case 'stats':
        return <StatsTab settings={settings} matches={data.matches} rank={data.rank} loading={data.loading} />;
      case 'forme':
        return <FormTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'reseau':
        return <NetworkTab settings={mySettings} matches={myMatches} pingSamples={data.pingSamples} />;
      case 'tilt':
        return <TiltTab settings={mySettings} matches={myMatches} loading={isViewingSelf && data.loading} />;
      case 'crosshairs':
        return <CrosshairsTab />;
      case 'strategie':
        return <StrategyTab />;
      case 'skins':
        return <SkinsTab />;
      case 'heatmap':
        return <HeatmapTab settings={settings} matches={data.matches} />;
      case 'analyse':
        return <AnalyseTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'composition':
        return (
          <CompositionTab settings={settings} matches={data.matches} mySettings={mySettings} myMatches={myMatches} />
        );
      case 'graphiques':
        return <PerformanceChartsTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'social':
        return <TeammatesRivalsTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'my-hall-of-fame':
        return <HallOfFameTab settings={mySettings} matches={myMatches} loading={isViewingSelf && data.loading} />;
      case 'my-social':
        return (
          <TeammatesRivalsTab settings={mySettings} matches={myMatches} loading={isViewingSelf && data.loading} />
        );
      case 'my-skins-collection':
        return <MySkinsCollectionTab />;
      case 'buy-simulator':
        return <BuySimulatorTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'bets':
        return <BetsTab settings={mySettings} matches={myMatches} />;
      case 'session':
        return <SessionGuideTab settings={mySettings} matches={myMatches} loading={isViewingSelf && data.loading} />;
      case 'puzzle':
        return <DailyPuzzleTab settings={mySettings} matches={myMatches} />;
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

        <div className="sidebar-footer">
          <SidebarProfile
            settings={mySettings}
            rank={myRank}
            onClick={() => {
              // Recliquer sur ta carte de profil te ramène sur TON compte,
              // même si tu étais en train de consulter quelqu'un d'autre.
              if (settings?.puuid !== profile.riot_puuid) {
                const ownSettings = {
                  name: profile.riot_name,
                  tag: profile.riot_tag,
                  puuid: profile.riot_puuid,
                  apiKey: settings?.apiKey,
                };
                window.electronAPI.saveSettings(ownSettings);
                setSettings(ownSettings);
              }
              setActiveTab('stats');
            }}
          />
          <button
            className="sidebar-signout"
            title="Se déconnecter du compte"
            onClick={() => supabase.auth.signOut()}
          >
            🚪
          </button>
        </div>
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

      <GoalsWidget matches={myMatches} settings={mySettings} />
      <WeeklyRecapCard matches={myMatches} settings={mySettings} rank={myRank} />
      {isViewingSelf && <PostMortemModal matches={myMatches} settings={mySettings} />}
    </div>
  );
}

export default App;
