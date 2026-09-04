import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import FlagFR from 'country-flag-icons/react/3x2/FR';
import FlagGB from 'country-flag-icons/react/3x2/GB';
import {
  BarChart3,
  AlarmClock,
  Flame,
  Brain,
  Handshake,
  TrendingUp,
  Trophy,
  Gem,
  Angry,
  Signal,
  Clapperboard,
  Target,
  Dices,
  Coins,
  Map,
  Puzzle as PuzzleIcon,
  Wallet,
  BookOpen,
  Shield,
  User,
  MessageCircle,
  Users,
  LogOut,
  ChevronDown,
  History,
  Search,
  Compass,
} from 'lucide-react';
import Icon from './Icon.jsx';
import Button from './ui/Button';
import useValorantData from './useValorantData.js';
import { useCollapsedBlocks } from './CollapsedBlocksContext.jsx';
import { useE2EE } from './E2EEContext.jsx';
import StatsTab from './tabs/StatsTab.jsx';
import WeaknessTab from './tabs/WeaknessTab.jsx';
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
import PlaySessionsTab from './tabs/PlaySessionsTab.jsx';
import SessionGuideTab from './tabs/SessionGuideTab.jsx';
import AimTrainerTab from './tabs/AimTrainerTab.jsx';
import DailyPuzzleTab from './tabs/DailyPuzzleTab.jsx';
import WikiTab from './tabs/WikiTab.jsx';
import GoalsWidget from './GoalsWidget.jsx';
import WeeklyRecapCard from './WeeklyRecapCard.jsx';
import PostMortemModal from './PostMortemModal.jsx';
import SearchBar from './SearchBar.jsx';
import AgentSelectLive from './AgentSelectLive.jsx';
import WelcomeScreen from './WelcomeScreen.jsx';
import LinkRiotAccount from './LinkRiotAccount.jsx';
import AccountGreeting from './AccountGreeting.jsx';
import AccountAuth from './AccountAuth.jsx';
import SetNewPasswordScreen from './SetNewPasswordScreen.jsx';
import AccountPage from './AccountPage.jsx';
import OnboardingTour from './OnboardingTour.jsx';
import AdminPage from './AdminPage.jsx';
import TournamentsTab from './tabs/TournamentsTab.jsx';
import MessagesTab from './tabs/MessagesTab.jsx';
import FriendsTab from './tabs/FriendsTab.jsx';
import { supabase } from './supabaseClient.js';
import LoadingState from './LoadingState.jsx';
import { AppShellSkeleton } from './skeletons.jsx';
import useLoadingGate from './useLoadingGate.js';
import { useOnlinePresence } from './presence.js';
import { useRankTiers, usePlayerCardArt } from './rankData.js';
import logoText from '../assets/logo-text.png';
import { normalizeRiotIdPart } from './valorantStats.js';

const NAV_SECTIONS = [
  {
    sectionKey: 'nav.sections.performance',
    tabs: [
      { id: 'stats', labelKey: 'nav.tabs.stats', icon: BarChart3 },
      { id: 'forme', labelKey: 'nav.tabs.form', icon: AlarmClock },
      { id: 'heatmap', labelKey: 'nav.tabs.heatmap', icon: Flame },
      { id: 'analyse', labelKey: 'nav.tabs.analyse', icon: Brain },
      { id: 'social', labelKey: 'nav.tabs.social', icon: Handshake },
      { id: 'graphiques', labelKey: 'nav.tabs.graphiques', icon: TrendingUp },
    ],
  },
  {
    sectionKey: 'nav.sections.myAccount',
    tabs: [
      { id: 'my-hall-of-fame', labelKey: 'nav.tabs.myHallOfFame', icon: Trophy },
      { id: 'my-weakness', labelKey: 'nav.tabs.myWeakness', icon: Compass },
      { id: 'my-skins-collection', labelKey: 'nav.tabs.myCollection', icon: Gem },
      { id: 'tilt', labelKey: 'nav.tabs.tilt', icon: Angry },
      { id: 'reseau', labelKey: 'nav.tabs.network', icon: Signal },
    ],
  },
  {
    sectionKey: 'nav.sections.tournaments',
    tabs: [{ id: 'tournaments', labelKey: 'nav.tabs.tournaments', icon: Trophy }],
  },
  {
    sectionKey: 'nav.sections.training',
    tabs: [
      { id: 'session', labelKey: 'nav.tabs.session', icon: Clapperboard },
      { id: 'aim-trainer', labelKey: 'nav.tabs.aimTrainer', icon: Target },
      { id: 'puzzle', labelKey: 'nav.tabs.puzzle', icon: Dices },
      { id: 'bets', labelKey: 'nav.tabs.bets', icon: Coins },
    ],
  },
  {
    sectionKey: 'nav.sections.tools',
    tabs: [
      { id: 'play-sessions', labelKey: 'nav.tabs.playSessions', icon: History },
      { id: 'crosshairs', labelKey: 'nav.tabs.crosshairs', icon: Target },
      { id: 'strategie', labelKey: 'nav.tabs.strategy', icon: Map },
      { id: 'skins', labelKey: 'nav.tabs.skins', icon: Gem },
      { id: 'composition', labelKey: 'nav.tabs.composition', icon: PuzzleIcon },
      { id: 'buy-simulator', labelKey: 'nav.tabs.buySimulator', icon: Wallet },
      { id: 'wiki', labelKey: 'nav.tabs.wiki', icon: BookOpen },
    ],
  },
];

const ADMIN_SECTION = {
  sectionKey: 'nav.sections.admin',
  tabs: [{ id: 'admin', labelKey: 'nav.tabs.admin', icon: Shield }],
};

const ALL_TABS = NAV_SECTIONS.flatMap((s) => s.tabs);

function SidebarProfile({ settings, rank, onClick }) {
  const { t } = useTranslation();
  const rankTiers = useRankTiers();
  const playerCardArt = usePlayerCardArt(rank?.cardUuid);
  const currentTier = rank ? rankTiers.get(rank.tierId) : null;

  return (
    <Button variant="ghost" className="sidebar-profile" onClick={onClick}>
      <div className="sidebar-profile-avatar">
        {playerCardArt.icon ? <img src={playerCardArt.icon} alt="" /> : <span>{settings.name.charAt(0)}</span>}
      </div>
      <div className="sidebar-profile-info">
        <div className="sidebar-profile-name">
          {settings.name}
          <span className="profile-tag"><span className="profile-tag-hash">#</span>{settings.tag}</span>
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
    </Button>
  );
}

function TopbarIconButton({ icon, badge, dot, active, onClick, title }) {
  return (
    <Button variant="icon" className={active ? 'topbar-icon-button active' : 'topbar-icon-button'} onClick={onClick} title={title}>
      <span><Icon icon={icon} /></span>
      {badge > 0 && <span className="topbar-icon-badge">{badge}</span>}
      {!badge && dot && <span className="topbar-icon-dot" />}
    </Button>
  );
}

function TopbarAccountButton({ profile, myRank, active, onClick }) {
  const { t } = useTranslation();
  const avatarCardUuid = profile?.avatar_card_uuid ?? myRank?.cardUuid;
  const avatarArt = usePlayerCardArt(avatarCardUuid);

  return (
    <Button
      variant="icon"
      className={active ? 'topbar-account-button active' : 'topbar-account-button'}
      onClick={onClick}
      title={t('nav.myAccountTitle')}
    >
      {avatarArt.icon ? (
        <img src={avatarArt.icon} alt="" />
      ) : (
        <span>{(profile?.display_name || profile?.riot_name || '?').charAt(0)}</span>
      )}
    </Button>
  );
}

function LanguageToggle() {
  const { i18n } = useTranslation();
  const next = i18n.language === 'fr' ? 'en' : 'fr';
  const NextFlag = next === 'en' ? FlagGB : FlagFR;
  const title = next === 'en' ? 'English version' : 'Version française';

  const switchLanguage = () => {
    i18n.changeLanguage(next);
    window.electronAPI.saveLanguage(next);
  };

  return (
    <Button variant="ghost" className="topbar-lang" onClick={switchLanguage} title={title}>
      <NextFlag className="flag-icon" title={title} />
      <span className="topbar-lang-label">{next.toUpperCase()}</span>
    </Button>
  );
}

function App() {
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState(undefined);
  const [activeTab, setActiveTab] = useState('stats');
  const data = useValorantData(settings);
  const {
    collapsed: collapsedSections,
    toggle: toggleSection,
    refresh: refreshCollapsedBlocks,
  } = useCollapsedBlocks();
  const { lock: lockMessagingKey, tryAutoUnlock: tryAutoUnlockMessagingKey } = useE2EE();
  const [sidebarNavEl, setSidebarNavEl] = useState(null);
  const [indicator, setIndicator] = useState({ top: 0, height: 0, ready: false, animate: false });
  const indicatorPlacedRef = useRef(false);
  const [navSearch, setNavSearch] = useState('');
  const navQuery = normalizeRiotIdPart(navSearch);
  const [pendingOpenFriendId, setPendingOpenFriendId] = useState(null);
  const [session, setSession] = useState(undefined);
  const [profile, setProfile] = useState(undefined);
  const [recoveryPending, setRecoveryPending] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState(null);

  useEffect(() => {
    window.electronAPI.getUpdateStatus().then(setPendingUpdate);
    return window.electronAPI.onUpdateReady(setPendingUpdate);
  }, []);

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

  useEffect(() => {
    window.electronAPI?.captureEvent(myUserId, 'tab_viewed', { tab: activeTab });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab]);

  useEffect(() => {
    if (myUserId) tryAutoUnlockMessagingKey(myUserId);
  }, [myUserId, tryAutoUnlockMessagingKey]);

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
          if (activeTabRef.current === 'messages') return;
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

  const [activeTournamentsCount, setActiveTournamentsCount] = useState(0);

  const loadActiveTournamentsCount = useCallback(async () => {
    const { count } = await supabase
      .from('tournaments')
      .select('id', { count: 'exact', head: true })
      .in('status', ['registration', 'ongoing']);
    setActiveTournamentsCount(count ?? 0);
  }, []);

  useEffect(() => {
    if (!session) return undefined;
    loadActiveTournamentsCount();
    const channel = supabase
      .channel('app-tournaments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tournaments' }, loadActiveTournamentsCount)
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [session, loadActiveTournamentsCount]);

  const countedOnceRef = useRef(false);
  useEffect(() => {
    if (!session) return;
    if (!countedOnceRef.current) {
      countedOnceRef.current = true;
      return;
    }
    loadActiveTournamentsCount();
  }, [activeTab, session, loadActiveTournamentsCount]);

  const [linkingRiot, setLinkingRiot] = useState(false);
  const [linkError, setLinkError] = useState(null);
  const [enteredApp, setEnteredApp] = useState(false);
  const [showGeneralSearch, setShowGeneralSearch] = useState(false);

  useEffect(() => {
    document.body.classList.toggle('in-app', enteredApp);
    return () => document.body.classList.remove('in-app');
  }, [enteredApp]);

  const [showOnboarding, setShowOnboarding] = useState(false);
  useEffect(() => {
    if (!enteredApp) return undefined;
    if (localStorage.getItem('mvptracker-onboarding-done')) return undefined;
    const id = setTimeout(() => setShowOnboarding(true), 300);
    return () => clearTimeout(id);
  }, [enteredApp]);

  const closeOnboarding = () => {
    localStorage.setItem('mvptracker-onboarding-done', '1');
    setShowOnboarding(false);
  };

  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings);
    window.electronAPI.getLanguage().then((lang) => {
      if (lang && lang !== i18n.language) i18n.changeLanguage(lang);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [myMatches, setMyMatches] = useState([]);
  useEffect(() => {
    if (!profile?.riot_puuid) return;
    if (settings?.puuid === profile.riot_puuid) {
      setMyMatches(data.matches);
      return;
    }
    window.electronAPI.getCachedMatchesFor(profile.riot_puuid).then(setMyMatches);
  }, [profile?.riot_puuid, settings?.puuid, data.matches]);

  const [myPingSamples, setMyPingSamples] = useState([]);
  useEffect(() => {
    if (!profile?.riot_puuid) return;
    window.electronAPI.getPingSamples(profile.riot_puuid).then(setMyPingSamples);
  }, [profile?.riot_puuid]);
  const isViewingSelf = !!profile && settings?.puuid === profile.riot_puuid;
  const mySettings = profile ? { name: profile.riot_name, tag: profile.riot_tag } : settings;
  const isAdmin = profile?.role === 'admin';

  const [myRank, setMyRank] = useState(null);
  useEffect(() => {
    if (!profile?.riot_puuid) return;
    if (isViewingSelf) {
      setMyRank(data.rank);
      return;
    }
    window.electronAPI.getRankFor(profile.riot_puuid).then(setMyRank);
  }, [profile?.riot_puuid, isViewingSelf, data.rank]);

  useEffect(() => {
    window.electronAPI.setLinkedPuuid(profile?.riot_puuid ?? null).then(() => {
      refreshCollapsedBlocks();
    });
  }, [profile?.riot_puuid, refreshCollapsedBlocks]);

  const lastUserIdRef = useRef(undefined);
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: current } }) => {
      lastUserIdRef.current = current?.user?.id ?? null;
      setSession(current);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      const nextUserId = next?.user?.id ?? null;
      if (nextUserId !== lastUserIdRef.current) {
        lastUserIdRef.current = nextUserId;
        setProfile(undefined);
      }
    });
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    async function loadProfile(attempt = 0) {
      const { data, error } = await supabase
        .from('profiles')
        .select('riot_name, riot_tag, riot_puuid, display_name, avatar_card_uuid, main_role, main_agent, created_at, henrikdev_api_key, role')
        .eq('id', session.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        console.error('[profiles] échec de la lecture du profil :', error.message);
        if (attempt < 3) {
          setTimeout(() => loadProfile(attempt + 1), 1000 * (attempt + 1));
        }
        return;
      }
      setProfile(data ?? null);
    }

    loadProfile();
    return () => {
      cancelled = true;
    };
  }, [session]);

  useEffect(() => {
    if (!session || !linkingRiot || !settings?.puuid) return;
    supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        riot_name: settings.name,
        riot_tag: settings.tag,
        riot_puuid: settings.puuid,
        henrikdev_api_key: settings.apiKey,
      })
      .then(({ error }) => {
        if (error) {
          console.error('[profiles] échec de la liaison Riot ID :', error.message);
          setLinkError(error.code === '23505' ? 'duplicate' : 'generic');
          setLinkingRiot(false);
          return;
        }
        setProfile({
          riot_name: settings.name,
          riot_tag: settings.tag,
          riot_puuid: settings.puuid,
          henrikdev_api_key: settings.apiKey,
          created_at: new Date().toISOString(),
        });
        setLinkingRiot(false);
      });
  }, [session, linkingRiot, settings?.puuid, settings?.name, settings?.tag]);

  const updateProfile = async (patch) => {
    const { error } = await supabase.from('profiles').update(patch).eq('id', session.user.id);
    if (error) {
      console.error('[profiles] échec de la mise à jour du profil :', error.message);
      return;
    }
    setProfile((prev) => ({ ...prev, ...patch }));
  };

  const updateApiKey = async (newKey) => {
    const trimmed = newKey.trim();
    await updateProfile({ henrikdev_api_key: trimmed || null });
    const updatedSettings = { ...settings, apiKey: trimmed };
    setSettings(updatedSettings);
    window.electronAPI.saveSettings(updatedSettings);
  };

  const updateRiotId = async (newName, newTag) => {
    const name = newName.trim();
    const tag = newTag.trim();
    const preview = await window.electronAPI.previewRiotAccount({ name, tag, apiKey: settings.apiKey });
    if (preview.puuid !== profile.riot_puuid) {
      throw new Error(t('account.riotIdMismatch'));
    }
    await updateProfile({ riot_name: preview.name, riot_tag: preview.tag });
    const updatedSettings = { ...settings, name: preview.name, tag: preview.tag };
    setSettings(updatedSettings);
    window.electronAPI.saveSettings(updatedSettings);
  };

  useEffect(() => {
    if (settings !== null || !profile?.riot_puuid || !profile?.henrikdev_api_key) return;
    const hydrated = {
      name: profile.riot_name,
      tag: profile.riot_tag,
      puuid: profile.riot_puuid,
      apiKey: profile.henrikdev_api_key,
    };
    window.electronAPI.saveSettings(hydrated);
    setSettings(hydrated);
  }, [settings, profile]);

  useLayoutEffect(() => {
    const container = sidebarNavEl;
    if (!container) return undefined;

    const measure = (animate) => {
      const activeEl = container.querySelector('.sidebar-link.active');
      if (!activeEl) {
        setIndicator((prev) => (prev.ready ? { ...prev, ready: false } : prev));
        return;
      }
      const top = activeEl.offsetTop;
      const height = activeEl.offsetHeight;
      setIndicator((prev) =>
        prev.ready && prev.top === top && prev.height === height ? prev : { top, height, ready: true, animate },
      );
    };

    measure(indicatorPlacedRef.current);
    indicatorPlacedRef.current = true;

    const observer = new ResizeObserver(() => measure(false));
    observer.observe(container);
    container
      .querySelectorAll('.sidebar-section, .sidebar-section-label, .sidebar-link')
      .forEach((el) => observer.observe(el));

    let cancelled = false;
    document.fonts?.ready.then(() => {
      if (!cancelled) measure(false);
    });

    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [sidebarNavEl, activeTab, settings, collapsedSections, navQuery]);

  const bootGate = useLoadingGate(session === undefined || settings === undefined || profile === undefined);

  if (recoveryPending) {
    return <SetNewPasswordScreen onDone={() => setRecoveryPending(false)} />;
  }

  if (session === undefined || settings === undefined) {
    return bootGate.show ? <AppShellSkeleton /> : null;
  }

  if (!session) {
    return <AccountAuth />;
  }

  if (profile === undefined) {
    return bootGate.show ? <AppShellSkeleton /> : null;
  }

  if (profile === null) {
    if (linkingRiot) {
      return (
        <div className="welcome-screen">
          <div className="welcome-bg" aria-hidden="true">
            <span className="welcome-orb welcome-orb-1" />
            <span className="welcome-orb welcome-orb-2" />
            <span className="welcome-orb welcome-orb-3" />
            <span className="welcome-orb welcome-orb-4" />
          </div>
          <LoadingState label={t('nav.linkingInProgress')} />
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
        onSignOut={() => supabase.auth.signOut().then(lockMessagingKey)}
      />
    );
  }

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
        matches={myMatches}
        onOpenAimTrainer={() => {
          setActiveTab('aim-trainer');
          setEnteredApp(true);
        }}
        onEnter={() => {
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
        return (
          <StatsTab
            settings={settings}
            matches={data.matches}
            rank={data.rank}
            loading={data.loading}
          />
        );
      case 'forme':
        return <FormTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'reseau':
        return <NetworkTab settings={mySettings} matches={myMatches} pingSamples={myPingSamples} myId={session.user.id} />;
      case 'tournaments':
        return <TournamentsTab myId={session.user.id} isAdmin={isAdmin} />;
      case 'tilt':
        return <TiltTab settings={mySettings} matches={myMatches} loading={isViewingSelf && data.loading} />;
      case 'crosshairs':
        return <CrosshairsTab />;
      case 'strategie':
        return <StrategyTab />;
      case 'skins':
        return <SkinsTab myId={session.user.id} />;
      case 'heatmap':
        return <HeatmapTab settings={settings} matches={data.matches} />;
      case 'analyse':
        return <AnalyseTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'composition':
        return (
          <CompositionTab
            settings={settings}
            matches={data.matches}
            mySettings={mySettings}
            myMatches={myMatches}
            myId={session.user.id}
            isAdmin={isAdmin}
          />
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
      case 'my-weakness':
        return <WeaknessTab settings={mySettings} matches={myMatches} onNavigate={setActiveTab} />;
      case 'my-skins-collection':
        return <MySkinsCollectionTab myId={session.user.id} />;
      case 'buy-simulator':
        return <BuySimulatorTab settings={settings} matches={data.matches} loading={data.loading} />;
      case 'bets':
        return <BetsTab settings={mySettings} matches={myMatches} />;
      case 'play-sessions':
        return <PlaySessionsTab settings={mySettings} matches={myMatches} apiKey={settings?.apiKey} />;
      case 'session':
        return <SessionGuideTab settings={mySettings} matches={myMatches} loading={isViewingSelf && data.loading} />;
      case 'aim-trainer':
        return <AimTrainerTab myId={session.user.id} matches={myMatches} settings={mySettings} apiKey={settings?.apiKey} />;
      case 'puzzle':
        return <DailyPuzzleTab settings={mySettings} matches={myMatches} />;
      case 'wiki':
        return <WikiTab />;
      case 'admin':
        return isAdmin ? <AdminPage myId={session.user.id} /> : null;
      case 'messages':
        return (
          <MessagesTab
            myId={session.user.id}
            onlineFriendIds={onlineFriendIds}
            initialFriendId={pendingOpenFriendId}
            onConsumedInitialFriendId={() => setPendingOpenFriendId(null)}
            apiKey={settings?.apiKey}
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
            apiKey={settings?.apiKey}
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
            apiKey={settings?.apiKey}
            onUpdate={updateProfile}
            onUpdateApiKey={updateApiKey}
            onUpdateRiotId={updateRiotId}
            onSignOut={() => supabase.auth.signOut().then(lockMessagingKey)}
            onReplayOnboarding={() => setShowOnboarding(true)}
          />
        );
      default:
        return null;
    }
  };

  const currentTabMeta =
    activeTab === 'account'
      ? { icon: User, labelKey: 'nav.tabs.account' }
      : activeTab === 'messages'
        ? { icon: MessageCircle, labelKey: 'nav.tabs.messages' }
        : activeTab === 'friends'
          ? { icon: Users, labelKey: 'nav.tabs.friends' }
          : ALL_TABS.find((tab) => tab.id === activeTab);

  return (
    <div className="app app-with-sidebar">
      <nav className="sidebar">
        <div className="sidebar-brand">
          <img src={logoText} alt="MVP Tracker" />
        </div>

        <div className="sidebar-search" data-tour="sidebar-search">
          <Icon icon={Search} size={15} />
          <input
            type="text"
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            placeholder={t('nav.searchPlaceholder')}
          />
        </div>

        <div className="sidebar-nav" ref={setSidebarNavEl}>
          <div
            className="sidebar-active-indicator"
            style={{
              transform: `translateY(${indicator.top}px)`,
              height: indicator.height,
              opacity: indicator.ready ? 1 : 0,
              transition: indicator.animate ? undefined : 'opacity var(--t-state)',
            }}
          />
          {(isAdmin ? [...NAV_SECTIONS, ADMIN_SECTION] : NAV_SECTIONS).map((section) => {
            const matchingTabs = navQuery
              ? section.tabs.filter((tab) => normalizeRiotIdPart(t(tab.labelKey)).includes(navQuery))
              : section.tabs;
            if (navQuery && matchingTabs.length === 0) return null;
            const collapsed = !navQuery && collapsedSections.has(section.sectionKey);
            return (
              <div key={section.sectionKey} className="sidebar-section" data-tour-section={section.sectionKey}>
                <Button
                  variant="ghost"
                  className={collapsed ? 'sidebar-section-label collapsed' : 'sidebar-section-label'}
                  onClick={() => toggleSection(section.sectionKey)}
                >
                  {t(section.sectionKey)}
                  <span className="sidebar-section-chevron"><Icon icon={ChevronDown} size={14} /></span>
                </Button>
                {!collapsed &&
                  matchingTabs.map((tab) => (
                    <Button
                      variant="ghost"
                      key={tab.id}
                      className={tab.id === activeTab ? 'sidebar-link active' : 'sidebar-link'}
                      onClick={() => {
                        setActiveTab(tab.id);
                        setNavSearch('');
                      }}
                    >
                      <span className="sidebar-link-icon">
                        <Icon icon={tab.icon} size={20} strokeWidth={2} />
                      </span>
                      {t(tab.labelKey)}
                      {tab.id === 'messages' && socialNotificationCount > 0 && (
                        <span className="sidebar-link-badge">{socialNotificationCount}</span>
                      )}
                      {tab.id === 'tournaments' && activeTournamentsCount > 0 && (
                        <span className="sidebar-link-badge">{activeTournamentsCount}</span>
                      )}
                    </Button>
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
          <Button
            variant="icon"
            className="sidebar-signout"
            title={t('nav.signOut')}
            onClick={() => supabase.auth.signOut().then(lockMessagingKey)}
          >
            <Icon icon={LogOut} size={16} />
          </Button>
        </div>
      </nav>

      <div className="main-area">
        <header className="topbar">
          <div className="topbar-title">
            <span className="topbar-title-icon"><Icon icon={currentTabMeta?.icon} /></span>
            <h2>{currentTabMeta?.labelKey ? t(currentTabMeta.labelKey) : ''}</h2>
          </div>
          <SearchBar initialSettings={settings} onSearch={setSettings} />
          <div className="topbar-group topbar-group-actions">
            <Button
              variant="primary"
              onClick={() => data.refresh({ force: true })}
              loading={data.loading}
              loadingLabel={t('nav.loading')}
              className="refresh"
            >
              {t('nav.refresh')}
            </Button>
            {pendingUpdate && (
              <Button
                variant="ghost"
                className="update-ready-button"
                title={pendingUpdate.releaseName || ''}
                onClick={() => window.electronAPI.installUpdate()}
              >
                {t('nav.updateReady')}
              </Button>
            )}
            <Button
              variant="accent"
              className={activeTab === 'aim-trainer' ? 'aim-topbar-button active' : 'aim-topbar-button'}
              title={t('aimTrainer.topbarTitle')}
              onClick={() => setActiveTab('aim-trainer')}
            >
              <span className="aim-topbar-icon"><Icon icon={Target} size={16} /></span>
              <span>{t('nav.tabs.aimTrainer')}</span>
            </Button>
          </div>

          <div className="topbar-group">
            <Button
              variant="ghost"
              className="discord-button"
              title={t('nav.discordTitle')}
              onClick={() => window.electronAPI.openExternal('https://discord.gg/NyZbTsM7D2')}
            >
              <svg viewBox="0 0 127.14 96.36" width="18" height="18" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
                />
              </svg>
              <span>Discord</span>
            </Button>
            <LanguageToggle />
          </div>

          <div className="topbar-group">
            <TopbarIconButton
              icon={MessageCircle}
              title={t('nav.unreadMessages')}
              badge={unreadFriendIds.size}
              active={activeTab === 'messages'}
              onClick={() => setActiveTab('messages')}
            />
            <TopbarIconButton
              icon={Users}
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
          </div>
        </header>

        {data.error &&
          (/rate limit/i.test(data.error) ? (
            <p className="error-banner">{t('nav.rateLimited')}</p>
          ) : /account not found/i.test(data.error) && settings?.puuid === profile?.riot_puuid ? (
            <p className="error-banner">
              {t('nav.riotIdOutdated')}{' '}
              <Button variant="ghost" className="error-banner-link" onClick={() => setActiveTab('account')}>
                {t('nav.riotIdOutdatedLink')}
              </Button>
            </p>
          ) : (
            <p className="warning">{t('nav.error', { message: data.error })}</p>
          ))}

        <AgentSelectLive matches={myMatches} settings={mySettings} />

        <main className="content" key={activeTab}>
          {renderValorantTab()}
        </main>
      </div>

      <GoalsWidget matches={myMatches} settings={mySettings} myId={session.user.id} />
      <WeeklyRecapCard matches={myMatches} settings={mySettings} rank={myRank} />
      {isViewingSelf && <PostMortemModal matches={myMatches} settings={mySettings} />}
      {showOnboarding && <OnboardingTour onClose={closeOnboarding} />}
    </div>
  );
}

export default App;
