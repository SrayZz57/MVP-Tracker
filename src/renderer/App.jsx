import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import SetNewPasswordScreen from './SetNewPasswordScreen.jsx';
import AccountPage from './AccountPage.jsx';
import MessagesTab from './tabs/MessagesTab.jsx';
import FriendsTab from './tabs/FriendsTab.jsx';
import { supabase } from './supabaseClient.js';
import { useOnlinePresence } from './presence.js';
import { useRankTiers, usePlayerCardArt } from './rankData.js';
import logo from '../assets/logo.png';

// `labelKey` plutôt que du texte en dur — cette structure est au niveau
// module (hors composant), donc pas d'accès à `t()` ici ; la traduction se
// fait au rendu, dans App().
const NAV_SECTIONS = [
  {
    sectionKey: 'nav.sections.performance',
    tabs: [
      { id: 'stats', labelKey: 'nav.tabs.stats', icon: '📊' },
      { id: 'forme', labelKey: 'nav.tabs.form', icon: '⏰' },
      { id: 'tilt', labelKey: 'nav.tabs.tilt', icon: '😤' },
      { id: 'heatmap', labelKey: 'nav.tabs.heatmap', icon: '🔥' },
      { id: 'analyse', labelKey: 'nav.tabs.analyse', icon: '🧠' },
      { id: 'social', labelKey: 'nav.tabs.social', icon: '🤝' },
      { id: 'graphiques', labelKey: 'nav.tabs.graphiques', icon: '📈' },
    ],
  },
  {
    sectionKey: 'nav.sections.myAccount',
    tabs: [
      { id: 'my-hall-of-fame', labelKey: 'nav.tabs.myHallOfFame', icon: '🏆' },
      { id: 'my-social', labelKey: 'nav.tabs.mySocial', icon: '🤝' },
      { id: 'my-skins-collection', labelKey: 'nav.tabs.myCollection', icon: '💎' },
    ],
  },
  {
    sectionKey: 'nav.sections.network',
    tabs: [{ id: 'reseau', labelKey: 'nav.tabs.network', icon: '📶' }],
  },
  {
    sectionKey: 'nav.sections.training',
    tabs: [
      { id: 'session', labelKey: 'nav.tabs.session', icon: '🎬' },
      { id: 'puzzle', labelKey: 'nav.tabs.puzzle', icon: '🎲' },
      { id: 'bets', labelKey: 'nav.tabs.bets', icon: '🎰' },
    ],
  },
  {
    sectionKey: 'nav.sections.tools',
    tabs: [
      { id: 'crosshairs', labelKey: 'nav.tabs.crosshairs', icon: '🎯' },
      { id: 'strategie', labelKey: 'nav.tabs.strategy', icon: '🗺️' },
      { id: 'skins', labelKey: 'nav.tabs.skins', icon: '💎' },
      { id: 'composition', labelKey: 'nav.tabs.composition', icon: '🧩' },
      { id: 'buy-simulator', labelKey: 'nav.tabs.buySimulator', icon: '💰' },
      { id: 'wiki', labelKey: 'nav.tabs.wiki', icon: '📖' },
    ],
  },
];

const ALL_TABS = NAV_SECTIONS.flatMap((s) => s.tabs);

function SidebarProfile({ settings, rank, onClick }) {
  const { t } = useTranslation();
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
          <div className="sidebar-profile-rank label">{t('nav.rankUnavailable')}</div>
        )}
      </div>
    </button>
  );
}

// `badge` (rouge) = quelque chose qui demande une action (message non lu,
// demande d'ami en attente). `dot` (vert) = simple statut informatif (un ami
// est en ligne) — jamais rouge, pour ne pas le confondre avec une demande.
function TopbarIconButton({ icon, badge, dot, active, onClick, title }) {
  return (
    <button className={active ? 'topbar-icon-button active' : 'topbar-icon-button'} onClick={onClick} title={title}>
      <span>{icon}</span>
      {badge > 0 && <span className="topbar-icon-badge">{badge}</span>}
      {!badge && dot && <span className="topbar-icon-dot" />}
    </button>
  );
}

function TopbarAccountButton({ profile, myRank, active, onClick }) {
  const { t } = useTranslation();
  const avatarCardUuid = profile?.avatar_card_uuid ?? myRank?.cardUuid;
  const avatarArt = usePlayerCardArt(avatarCardUuid);

  return (
    <button
      className={active ? 'topbar-account-button active' : 'topbar-account-button'}
      onClick={onClick}
      title={t('nav.myAccountTitle')}
    >
      {avatarArt.icon ? (
        <img src={avatarArt.icon} alt="" />
      ) : (
        <span>{(profile?.display_name || profile?.riot_name || '?').charAt(0)}</span>
      )}
    </button>
  );
}

// Bascule FR/EN — persistée via electron-store, indépendante de tout le
// reste (compte, profil consulté). Le libellé affiché est celui de la
// langue qu'on OBTIENDRAIT en cliquant, pas la langue actuelle.
function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'fr' ? 'en' : 'fr';

  const switchLanguage = () => {
    i18n.changeLanguage(next);
    window.electronAPI.saveLanguage(next);
  };

  return (
    <button className="topbar-icon-button" onClick={switchLanguage} title={i18n.language === 'fr' ? 'English' : 'Français'}>
      <span style={{ fontWeight: 700, fontSize: '0.78rem' }}>{next.toUpperCase()}</span>
    </button>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(undefined);
  const [activeTab, setActiveTab] = useState('stats');
  const data = useValorantData(settings);
  const sidebarNavRef = useRef(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false });
  const [collapsedSections, setCollapsedSections] = useState(new Set());
  // Ami à ouvrir en conversation dès l'arrivée sur l'onglet Messages, posé
  // par le bouton "💬" de la page Amis — one-shot, consommé au montage.
  const [pendingOpenFriendId, setPendingOpenFriendId] = useState(null);
  const toggleSection = (label) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };
  const [session, setSession] = useState(undefined); // undefined = chargement, null = déconnecté
  const [profile, setProfile] = useState(undefined); // undefined = chargement, null = pas encore lié
  // true dès que le lien "mot de passe oublié" a rouvert l'app avec une
  // session de récupération active — force l'écran de nouveau mot de passe
  // avant tout le reste, peu importe l'état de connexion en cours.
  const [recoveryPending, setRecoveryPending] = useState(false);

  useEffect(() => {
    const unsubscribe = window.electronAPI.onRecoveryDeepLink(async ({ accessToken, refreshToken }) => {
      const { error } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
      if (error) {
        console.error('[auth] échec de la session de récupération :', error.message);
        return;
      }
      setRecoveryPending(true);
    });
    return unsubscribe;
  }, []);

  const myUserId = session?.user?.id ?? null;
  const onlineFriendIds = useOnlinePresence(myUserId);

  // Notifications "sociales" (badge sur l'onglet Messages + notif Windows) —
  // volontairement séparées de la logique interne de MessagesPage : ça doit
  // rester visible même quand on est sur un tout autre onglet de l'app.
  const [unreadFriendIds, setUnreadFriendIds] = useState(new Set());
  const [pendingRequestCount, setPendingRequestCount] = useState(0);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  useEffect(() => {
    if (activeTab === 'messages') setUnreadFriendIds(new Set());
  }, [activeTab]);

  useEffect(() => {
    if (!myUserId) return undefined;
    const channel = supabase
      .channel(`app-messages-${myUserId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${myUserId}` },
        async (payload) => {
          const msg = payload.new;
          if (activeTabRef.current === 'messages') return; // déjà géré/visible dans MessagesPage
          setUnreadFriendIds((prev) => new Set(prev).add(msg.sender_id));
          if (typeof Notification === 'undefined' || Notification.permission === 'denied') return;
          const { data: sender } = await supabase
            .from('profiles')
            .select('display_name, riot_name, riot_tag')
            .eq('id', msg.sender_id)
            .maybeSingle();
          const senderLabel = sender ? sender.display_name || `${sender.riot_name}#${sender.riot_tag}` : 'Nouveau message';
          new Notification(senderLabel, { body: msg.content });
        },
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [myUserId]);

  useEffect(() => {
    if (!myUserId) return undefined;
    const loadPendingCount = async () => {
      const { count } = await supabase
        .from('friendships')
        .select('id', { count: 'exact', head: true })
        .eq('addressee_id', myUserId)
        .eq('status', 'pending');
      setPendingRequestCount(count ?? 0);
    };
    loadPendingCount();
    const channel = supabase
      .channel(`app-friendships-${myUserId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'friendships', filter: `addressee_id=eq.${myUserId}` },
        loadPendingCount,
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [myUserId]);

  const socialNotificationCount = unreadFriendIds.size + pendingRequestCount;

  // true uniquement après un vrai passage par l'écran de recherche Riot ID
  // *pendant cette session* — jamais déduit des réglages déjà en cache, pour
  // qu'un compte sans lien Supabase ne se relie pas silencieusement avec un
  // ancien puuid local laissé par un autre compte.
  const [linkingRiot, setLinkingRiot] = useState(false);
  const [linkError, setLinkError] = useState(null);
  // Écran d'accueil léger (aperçu + choix) affiché à chaque lancement une
  // fois le compte lié, avant d'entrer dans l'app proprement dite.
  const [enteredApp, setEnteredApp] = useState(false);
  const [showGeneralSearch, setShowGeneralSearch] = useState(false);

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
    window.electronAPI.getLanguage().then((lang) => {
      if (lang && lang !== i18n.language) i18n.changeLanguage(lang);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      .select('riot_name, riot_tag, riot_puuid, display_name, avatar_card_uuid, main_role, main_agent, created_at')
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
          // Code Postgres 23505 = violation de contrainte unique — ici la
          // contrainte sur riot_puuid, qui empêche qu'un même compte Riot
          // soit lié à deux comptes MVP Tracker différents.
          setLinkError(error.code === '23505' ? 'duplicate' : 'generic');
          setLinkingRiot(false);
          return;
        }
        setProfile({
          riot_name: settings.name,
          riot_tag: settings.tag,
          riot_puuid: settings.puuid,
          created_at: new Date().toISOString(),
        });
        setLinkingRiot(false);
      });
  }, [session, linkingRiot, settings?.puuid, settings?.name, settings?.tag]);

  // Modifie le pseudo d'affichage / l'avatar du compte MVP Tracker — utilisé
  // par la page "Mon compte" (pas lié au compte Riot, propre à cette app).
  const updateProfile = async (patch) => {
    const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
    if (error) {
      console.error('[profiles] échec de la mise à jour du profil :', error.message);
      return;
    }
    setProfile((prev) => ({ ...prev, ...patch }));
  };

  // Fait glisser un repère lumineux vers le lien actif au lieu de le faire
  // juste réapparaître à une nouvelle position — mesuré dynamiquement car les
  // sections du sidebar n'ont pas toutes la même hauteur.
  useLayoutEffect(() => {
    const container = sidebarNavRef.current;
    const activeEl = container?.querySelector('.sidebar-link.active');
    if (!container || !activeEl) {
      // L'onglet actif est dans une section repliée — pas de repère orphelin.
      setIndicator((prev) => ({ ...prev, ready: false }));
      return;
    }
    setIndicator({
      top: activeEl.offsetTop,
      height: activeEl.offsetHeight,
      ready: true,
    });
  }, [activeTab, settings, collapsedSections]);

  if (recoveryPending) {
    return <SetNewPasswordScreen onDone={() => setRecoveryPending(false)} />;
  }

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
          <p className="label">{t('nav.linkingInProgress')}</p>
        </div>
      );
    }
    return (
      <LinkRiotAccount
        linkError={linkError}
        onConfirmed={(confirmedSettings) => {
          setLinkError(null);
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
          apiKey={settings?.apiKey}
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
        return (
          <TeammatesRivalsTab
            settings={settings}
            matches={data.matches}
            loading={data.loading}
            myPuuid={profile?.riot_puuid}
          />
        );
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
      case 'messages':
        return (
          <MessagesTab
            myId={session.user.id}
            onlineFriendIds={onlineFriendIds}
            initialFriendId={pendingOpenFriendId}
            onConsumedInitialFriendId={() => setPendingOpenFriendId(null)}
          />
        );
      case 'friends':
        return (
          <FriendsTab
            myId={session.user.id}
            onlineFriendIds={onlineFriendIds}
            onOpenConversation={(friendId) => {
              setPendingOpenFriendId(friendId);
              setActiveTab('messages');
            }}
          />
        );
      case 'account':
        return (
          <AccountPage
            profile={profile}
            mySettings={mySettings}
            myMatches={myMatches}
            myRank={myRank}
            email={session.user.email}
            onUpdate={updateProfile}
            onSignOut={() => supabase.auth.signOut()}
          />
        );
      default:
        return null;
    }
  };

  const currentTabMeta =
    activeTab === 'account'
      ? { icon: '👤', labelKey: 'nav.tabs.account' }
      : activeTab === 'messages'
        ? { icon: '💬', labelKey: 'nav.tabs.messages' }
        : activeTab === 'friends'
          ? { icon: '👥', labelKey: 'nav.tabs.friends' }
          : ALL_TABS.find((tab) => tab.id === activeTab);

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
          {NAV_SECTIONS.map((section) => {
            const collapsed = collapsedSections.has(section.sectionKey);
            return (
              <div key={section.sectionKey} className="sidebar-section">
                <button
                  className={collapsed ? 'sidebar-section-label collapsed' : 'sidebar-section-label'}
                  onClick={() => toggleSection(section.sectionKey)}
                >
                  {t(section.sectionKey)}
                  <span className="sidebar-section-chevron">▾</span>
                </button>
                {!collapsed &&
                  section.tabs.map((tab) => (
                    <button
                      key={tab.id}
                      className={tab.id === activeTab ? 'sidebar-link active' : 'sidebar-link'}
                      onClick={() => setActiveTab(tab.id)}
                    >
                      <span className="sidebar-link-icon">{tab.icon}</span>
                      {t(tab.labelKey)}
                      {tab.id === 'messages' && socialNotificationCount > 0 && (
                        <span className="sidebar-link-badge">{socialNotificationCount}</span>
                      )}
                    </button>
                  ))}
              </div>
            );
          })}
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
            title={t('nav.signOut')}
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
            <h2>{currentTabMeta?.labelKey ? t(currentTabMeta.labelKey) : ''}</h2>
          </div>
          <SearchBar initialSettings={settings} onSearch={setSettings} />
          <button onClick={data.refresh} disabled={data.loading} className="refresh">
            {data.loading ? t('nav.loading') : t('nav.refresh')}
          </button>
          <LanguageToggle />
          <TopbarIconButton
            icon="💬"
            title={t('nav.unreadMessages')}
            badge={unreadFriendIds.size}
            active={activeTab === 'messages'}
            onClick={() => setActiveTab('messages')}
          />
          <TopbarIconButton
            icon="👥"
            title={t('nav.friendsTitle')}
            badge={pendingRequestCount}
            dot={onlineFriendIds.size > 0}
            active={activeTab === 'friends'}
            onClick={() => setActiveTab('friends')}
          />
          <TopbarAccountButton
            profile={profile}
            myRank={myRank}
            active={activeTab === 'account'}
            onClick={() => setActiveTab('account')}
          />
        </header>

        {data.error && <p className="warning">{t('nav.error', { message: data.error })}</p>}

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
