// Captures des onglets de l'app pour le site vitrine.
//
// On monte ici les VRAIS composants d'onglet (src/renderer/tabs/*) dans la
// vraie coque, avec l'historique fabriqué de fixture-matches.js. Le rendu est
// donc exact au pixel près et suit l'app quand elle change, au lieu d'un
// balisage recopié qui dérive en silence.
//
// Usage :
//   pnpm exec vite --config vite.renderer.config.mjs --port 5189 .
//   http://localhost:5189/tools/screenshots/tab-shots.html?tab=stats
// puis capturer l'élément #shot, et déposer le .webp obtenu dans
// mvp-tracker-site/public/assets/screens/.
import '@fontsource/chakra-petch/latin-500.css';
import '@fontsource/chakra-petch/latin-600.css';
import '@fontsource/chakra-petch/latin-700.css';
import '@fontsource-variable/inter';
import '../../src/index.css';
import '../../src/renderer/i18n/index.js';
import { createRoot } from 'react-dom/client';
import { CollapsedBlocksProvider } from '../../src/renderer/CollapsedBlocksContext.jsx';
import AppShell from './app-shell.jsx';
import { MATCHES, PING_SAMPLES, RANK, SETTINGS } from './fixture-matches.js';

import StatsTab from '../../src/renderer/tabs/StatsTab.jsx';
import HeatmapTab from '../../src/renderer/tabs/HeatmapTab.jsx';
import AnalyseTab from '../../src/renderer/tabs/AnalyseTab.jsx';
import PerformanceChartsTab from '../../src/renderer/tabs/PerformanceChartsTab.jsx';
import FormTab from '../../src/renderer/tabs/FormTab.jsx';
import TiltTab from '../../src/renderer/tabs/TiltTab.jsx';
import TeammatesRivalsTab from '../../src/renderer/tabs/TeammatesRivalsTab.jsx';
import HallOfFameTab from '../../src/renderer/tabs/HallOfFameTab.jsx';
import NetworkTab from '../../src/renderer/tabs/NetworkTab.jsx';
import MySkinsCollectionTab from '../../src/renderer/tabs/MySkinsCollectionTab.jsx';
import StrategyTab from '../../src/renderer/tabs/StrategyTab.jsx';
import SkinsTab from '../../src/renderer/tabs/SkinsTab.jsx';
import CrosshairsTab from '../../src/renderer/tabs/CrosshairsTab.jsx';
import CompositionTab from '../../src/renderer/tabs/CompositionTab.jsx';
import BuySimulatorTab from '../../src/renderer/tabs/BuySimulatorTab.jsx';
import SessionGuideTab from '../../src/renderer/tabs/SessionGuideTab.jsx';
import GoalsWidget from '../../src/renderer/GoalsWidget.jsx';
import WeeklyRecapCard from '../../src/renderer/WeeklyRecapCard.jsx';
import AccountPage from '../../src/renderer/AccountPage.jsx';

// Profil de compte fabriqué, meme forme que la ligne Supabase.
const PROFILE = {
  id: 'demo-profile',
  display_name: 'Vyn',
  main_role: 'duelist',
  main_agent: 'Jett',
  avatar_card_uuid: null,
  created_at: '2026-02-14T10:00:00Z',
  riot_name: SETTINGS.name,
  riot_tag: SETTINGS.tag,
  riot_puuid: SETTINGS.puuid,
};

// L'app parle à Electron par window.electronAPI. Hors Electron, on répond une
// liste vide à tout : ces appels ne portent que des préférences persistées, et
// un tableau vide traverse tous les composants sans les casser, la ou `null`
// faisait tomber ceux qui enchainent directement sur .flatMap ou .length
// (PostMortemHistory, par exemple).
window.electronAPI = new Proxy(
  {},
  {
    get: () => (...args) => {
      const cb = args.find((a) => typeof a === 'function');
      if (cb) return () => {};
      return Promise.resolve([]);
    },
  },
);

const COMMON = { settings: SETTINGS, matches: MATCHES, loading: false };

const TABS = {
  stats: { render: () => <StatsTab {...COMMON} rank={RANK} /> },
  heatmap: { render: () => <HeatmapTab settings={SETTINGS} matches={MATCHES} /> },
  analyse: { render: () => <AnalyseTab {...COMMON} /> },
  graphiques: { render: () => <PerformanceChartsTab {...COMMON} /> },
  forme: { render: () => <FormTab {...COMMON} /> },
  tilt: { render: () => <TiltTab {...COMMON} /> },
  social: { render: () => <TeammatesRivalsTab {...COMMON} /> },
  'my-hall-of-fame': { render: () => <HallOfFameTab {...COMMON} /> },
  reseau: { render: () => <NetworkTab settings={SETTINGS} matches={MATCHES} pingSamples={PING_SAMPLES} myId="demo" /> },
  'my-skins-collection': { render: () => <MySkinsCollectionTab myId="demo" /> },
  strategie: { render: () => <StrategyTab /> },
  skins: { render: () => <SkinsTab myId="demo" /> },
  crosshairs: { render: () => <CrosshairsTab /> },
  composition: { render: () => <CompositionTab {...COMMON} /> },
  'buy-simulator': { render: () => <BuySimulatorTab {...COMMON} /> },
  session: { render: () => <SessionGuideTab {...COMMON} /> },
  // Panneaux flottants : rendus par-dessus la coque, la capture cible le
  // panneau lui-meme (voir `clip` dans tabshot.mjs).
  objectifs: {
    tab: 'stats',
    render: () => <GoalsWidget matches={MATCHES} settings={SETTINGS} myId="demo" />,
  },
  wrapped: {
    tab: 'stats',
    render: () => <WeeklyRecapCard settings={SETTINGS} matches={MATCHES} rank={RANK} />,
  },
  compte: {
    tab: 'stats',
    render: () => (
      <AccountPage
        profile={PROFILE}
        mySettings={SETTINGS}
        myMatches={MATCHES}
        myRank={RANK}
        email="vyn@example.com"
        apiKey="demo"
        onUpdate={() => {}}
        onUpdateApiKey={() => {}}
        onSignOut={() => {}}
      />
    ),
  },
};

const tab = new URLSearchParams(location.search).get('tab') || 'stats';
const entry = TABS[tab];
// Certaines entrees rendent un panneau flottant : la barre laterale doit
// alors surligner l'onglet sous lequel il apparait dans l'app.
const shellTab = entry?.tab ?? tab;

document.body.classList.add('in-app');
createRoot(document.getElementById('root')).render(
  <CollapsedBlocksProvider>
    <div id="shot">
      <AppShell tab={shellTab} title={tab}>{entry ? entry.render() : <p>Onglet inconnu : {tab}</p>}</AppShell>
    </div>
  </CollapsedBlocksProvider>,
);
