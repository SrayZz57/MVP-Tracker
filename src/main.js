import { app, BrowserWindow, ipcMain, shell, Menu, Notification } from 'electron';
import path from 'node:path';
import crypto from 'node:crypto';
import started from 'electron-squirrel-startup';
import Store from 'electron-store';
import { getAccount, getMatches, getMmr, getStoredMatchIds, getMatchDetail } from './services/henrikdev.js';
import { excludeDeathmatch, formStats, tiltStatus } from './renderer/valorantStats.js';
import {
  saveMatches,
  getCachedMatches,
  savePingSample,
  getAllPingSamples,
  saveCrosshair,
  getCrosshairs,
  deleteCrosshair,
  saveStrategy,
  getStrategiesForMap,
  deleteStrategy,
  getPuzzleByDate,
  savePuzzle,
  answerPuzzle,
  getPuzzleHistory,
  getNarrativeForWeek,
  getPreviousNarrative,
  saveNarrative,
  getNarrativeHistory,
  getAssessmentForMatch,
  saveAssessment,
  getAssessmentHistory,
  getPendingBet,
  createBet,
  cancelBet,
  resolveBet,
  getBetHistory,
  getTotalBetPoints,
  backfillLegacyPuuid,
} from './services/db.js';
import { isValorantRunning, pingOnce } from './services/network.js';
import { updateElectronApp } from 'update-electron-app';

// Le service réseau de Chromium plantait en boucle sur ce poste ("Unable to
// move the cache: Accès refusé" au démarrage, cache disque probablement
// verrouillé/corrompu par un antivirus ou des instances précédentes) — chaque
// requête réseau (dont tous les appels aux API d'assets) échouait tant que le
// service redémarrait. Désactiver le cache disque HTTP contourne le problème.
app.commandLine.appendSwitch('disable-http-cache');

const store = new Store();

// Toutes les données "personnelles" (crosshairs, stratégies, paris,
// évaluations, puzzles, wrapped, objectifs, skins) sont scopées par puuid —
// mais celui du compte MVP Tracker réellement LIÉ (Supabase), jamais celui
// de "qui est actuellement affiché à l'écran" (valorantSettings.puuid change
// à chaque recherche d'un autre joueur — utiliser ce champ ici recréait
// exactement le bug qu'on scope pour éviter). Le renderer tient cette valeur
// à jour via account:set-linked-puuid dès qu'il connaît le profil Supabase.
// L'API distingue "pc" et "console" pour la MMR (v3/mmr) — un compte console
// interrogé avec "pc" ne renvoie aucun rang. `account.platforms` (v2/account)
// liste les plateformes réellement utilisées par le compte ; on privilégie
// "console" dès qu'il y figure, plutôt que de supposer "pc" pour tout le
// monde comme c'était fait avant (silencieux : la MMR échouait juste sans
// rang affiché pour les joueurs console, sans erreur visible).
function accountPlatform(account) {
  const platforms = (account?.platforms ?? []).map((p) => String(p).toLowerCase());
  return platforms.includes('console') ? 'console' : 'pc';
}

function currentPuuid() {
  return store.get('linkedAccountPuuid') ?? null;
}

// Migration ponctuelle (une seule fois, à l'introduction de ce scoping) :
// rattache les données déjà présentes au compte alors actif localement,
// avant même qu'un vrai compte lié (au sens Supabase) n'existe.
backfillLegacyPuuid(store.get('valorantSettings')?.puuid ?? null);

// Même chose côté electron-store : `personalGoals`/`skinsWishlist`/
// `skinsCollection` existaient en clés globales avant ce scoping — on les
// rattache au compte actuellement configuré si ce n'est pas déjà fait.
(function migrateLegacyStoreKeys() {
  const puuid = store.get('valorantSettings')?.puuid ?? null;
  if (!puuid) return;
  ['personalGoals', 'skinsWishlist', 'skinsCollection'].forEach((base) => {
    const legacy = store.get(base);
    const scopedKeyName = `${base}:${puuid}`;
    if (legacy !== undefined && store.get(scopedKeyName) === undefined) {
      store.set(scopedKeyName, legacy);
      store.delete(base);
    }
  });
})();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Vérifie les GitHub Releases au démarrage puis toutes les heures ; ne fait
// rien en dev (app pas empaquetée), donc sûr à laisser tel quel.
updateElectronApp({ repo: 'SrayZz57/MVP-Tracker' });

// Enlève le bandeau de menu natif (File/Edit/View/Window) — l'app a sa propre
// navigation, ce menu par défaut d'Electron n'a aucune utilité ici.
Menu.setApplicationMenu(null);

// Schéma personnalisé utilisé pour le lien de réinitialisation de mot de
// passe envoyé par Supabase — l'app n'a pas de site web pour héberger la
// page de redirection, donc le lien rouvre directement l'app à la place.
const DEEP_LINK_SCHEME = 'mvptracker';

let mainWindow = null;

// En dev (app pas empaquetée), il faut préciser explicitement l'exécutable
// et le script à relancer, sinon l'enregistrement du protocole ne pointe pas
// vers la bonne commande.
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME, process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient(DEEP_LINK_SCHEME);
}

// Extrait access_token/refresh_token/type du lien mvptracker://reset-password#...
// et les transmet au renderer, qui active la session puis affiche l'écran de
// nouveau mot de passe.
function handleDeepLink(url) {
  if (!url || !url.startsWith(`${DEEP_LINK_SCHEME}://`)) return;
  let parsed;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  const raw = (parsed.hash ? parsed.hash.slice(1) : '') || parsed.search.slice(1);
  const params = new URLSearchParams(raw);
  if (params.get('type') !== 'recovery') return;
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  if (!accessToken || !refreshToken) return;
  mainWindow?.webContents.send('deep-link:recovery', { accessToken, refreshToken });
}

// Windows lance une deuxième instance quand on clique le lien — le verrou
// redirige cet appel vers l'instance déjà ouverte au lieu d'en ouvrir une
// deuxième qui écrirait dans les mêmes fichiers locaux.
const gotSingleInstanceLock = app.requestSingleInstanceLock();
if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', (_event, argv) => {
    const deepLink = argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`));
    if (deepLink) handleDeepLink(deepLink);
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

const createWindow = () => {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log('[renderer]', message);
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }
};

ipcMain.handle('shell:open-external', (_event, url) => shell.openExternal(url));

// L'Aim Trainer tourne dans sa PROPRE fenêtre plein écran, pas dans un onglet
// de la fenêtre principale : c'est la seule façon d'avoir un vrai comportement
// de jeu (plein écran réel, souris capturée, aucune interface autour) sans que
// le reste de l'app ne rétrécisse le canvas ou ne vole le focus.
let aimTrainerWindow = null;

ipcMain.handle('aim-trainer:open', (_event, config) => {
  if (aimTrainerWindow && !aimTrainerWindow.isDestroyed()) {
    aimTrainerWindow.focus();
    return;
  }

  aimTrainerWindow = new BrowserWindow({
    fullscreen: true,
    autoHideMenuBar: true,
    backgroundColor: '#0a0c10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Les réglages passent par l'URL : la fenêtre de jeu est un rendu autonome
  // du même bundle, elle ne partage aucun état React avec la fenêtre principale.
  const query = `view=aim-trainer&config=${encodeURIComponent(JSON.stringify(config ?? {}))}`;
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    aimTrainerWindow.loadURL(`${MAIN_WINDOW_VITE_DEV_SERVER_URL}?${query}`);
  } else {
    aimTrainerWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`), {
      search: query,
    });
  }

  // Sans ça, les erreurs de la fenêtre de jeu (échec d'enregistrement d'un
  // score, par exemple) sont invisibles : elles ne remontent pas dans la
  // console du process principal comme celles de la fenêtre principale.
  aimTrainerWindow.webContents.on('console-message', (_e, _level, message) => {
    console.log('[aim-trainer]', message);
  });

  aimTrainerWindow.on('closed', () => {
    aimTrainerWindow = null;
    // La fenêtre principale recharge ses records : une session vient d'être
    // jouée, l'onglet doit refléter le nouveau score sans redémarrage.
    mainWindow?.webContents.send('aim-trainer:closed');
  });
});

ipcMain.handle('aim-trainer:close', (event) => {
  BrowserWindow.fromWebContents(event.sender)?.close();
});


ipcMain.handle('settings:get', () => store.get('valorantSettings') || null);

ipcMain.handle('settings:set', (_event, settings) => {
  store.set('valorantSettings', settings);
});

// Identifiant stable de cette installation — sert uniquement à distinguer les
// lignes de stats réseau de chaque appareil dans Supabase (un identifiant par
// PC, pas par personne), pour additionner les totaux sans qu'un appareil
// n'écrase les chiffres d'un autre.
ipcMain.handle('network:get-device-id', () => {
  let id = store.get('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    store.set('deviceId', id);
  }
  return id;
});

// Préférence de langue de l'interface — globale à l'app, indépendante du
// profil consulté ou du compte lié.
ipcMain.handle('language:get', () => store.get('appLanguage') || 'fr');

ipcMain.handle('language:set', (_event, language) => {
  store.set('appLanguage', language);
});

// Le renderer appelle ceci dès qu'il connaît (ou perd) le compte MVP Tracker
// lié — c'est cette valeur, pas valorantSettings.puuid, qui scope toutes les
// données personnelles (voir currentPuuid() plus haut).
ipcMain.handle('account:set-linked-puuid', (_event, puuid) => {
  if (puuid) {
    store.set('linkedAccountPuuid', puuid);
  } else {
    store.delete('linkedAccountPuuid');
  }
});

// Cherche un compte Riot sans rien enregistrer — sert à afficher un aperçu
// (bannière/rang/pseudo) avant que l'utilisateur confirme que c'est bien le
// sien, sur l'écran de liaison de compte.
ipcMain.handle('valorant:preview-account', async (_event, { name, tag, apiKey }) => {
  const account = await getAccount(name, tag, apiKey);
  let rank = null;
  try {
    const mmr = await getMmr(account.region, accountPlatform(account), name, tag, apiKey);
    rank = { tierId: mmr.current.tier.id, tierName: mmr.current.tier.name, rr: mmr.current.rr };
  } catch {
    // Compte non classé ou erreur MMR : pas grave, l'aperçu reste utile sans rang.
  }
  return {
    name,
    tag,
    puuid: account.puuid,
    region: account.region,
    accountLevel: account.account_level,
    cardUuid: account.card,
    rank,
  };
});

ipcMain.handle('valorant:get-matches', async (_event, { name, tag, apiKey }) => {
  const account = await getAccount(name, tag, apiKey);
  store.set('valorantSettings', { name, tag, apiKey, puuid: account.puuid });

  const freshMatches = await getMatches(account.region, name, tag, apiKey);
  saveMatches(account.puuid, freshMatches);

  // La liste "derniers matchs" est plafonnée à 10 (limite de la clé Basic,
  // confirmée en test réel — voir le commentaire dans henrikdev.js). On
  // complète avec l'historique étendu (jusqu'à 50) : on repère les IDs de
  // matchs pas encore en cache, et on va chercher leur détail complet un par
  // un pour que Heatmap/Analyse tactique/corrélation ping fonctionnent aussi
  // dessus. Une fois en cache, un match n'est plus jamais re-demandé — donc
  // ce rattrapage ne coûte cher qu'une seule fois par nouvel appareil.
  try {
    const knownIds = new Set(getCachedMatches(account.puuid).map((m) => m.metadata?.matchid));
    const storedIds = await getStoredMatchIds(account.region, name, tag, apiKey);
    const missingIds = storedIds.filter((id) => !knownIds.has(id));
    for (const matchId of missingIds) {
      try {
        const detail = await getMatchDetail(matchId, apiKey);
        saveMatches(account.puuid, [detail]);
      } catch (err) {
        if (err.status === 429) {
          // Limite de requêtes atteinte : inutile d'insister, les prochains
          // appels échoueraient pareil. On s'arrête là — les IDs restants ne
          // sont pas en cache, donc ils seront retentés à la prochaine sync.
          console.error("[henrikdev] limite de requêtes atteinte, rattrapage de l'historique interrompu pour cette sync");
          break;
        }
        // Un match précis peut échouer pour une autre raison (match retiré,
        // erreur ponctuelle) sans faire échouer toute la synchronisation.
        console.error(`[henrikdev] échec du détail du match ${matchId} :`, err.message);
      }
    }
  } catch (err) {
    console.error("[henrikdev] échec du rattrapage de l'historique étendu :", err.message);
  }

  try {
    const mmr = await getMmr(account.region, accountPlatform(account), name, tag, apiKey);
    const rankInfo = {
      accountLevel: account.account_level,
      cardUuid: account.card,
      tierId: mmr.current.tier.id,
      tierName: mmr.current.tier.name,
      rr: mmr.current.rr,
      peakTierId: mmr.peak.tier.id,
      peakTierName: mmr.peak.tier.name,
      peakSeasonUuid: mmr.peak.season.id,
    };
    store.set(`valorantRank:${account.puuid}`, rankInfo);
  } catch {
    // Rang indisponible pour CE compte (non classé, erreur API, rate limit) —
    // on ne touche pas au cache d'un autre compte (voir le retour ci-dessous,
    // toujours scopé au puuid réellement recherché, jamais un "dernier connu"
    // global qui pouvait laisser transparaître le rang d'un autre joueur).
  }

  return {
    matches: getCachedMatches(account.puuid),
    rank: store.get(`valorantRank:${account.puuid}`) || null,
  };
});

ipcMain.handle('valorant:get-rank-for', (_event, puuid) => {
  if (!puuid) return null;
  return store.get(`valorantRank:${puuid}`) || null;
});

ipcMain.handle('valorant:get-cached-matches', () => {
  const settings = store.get('valorantSettings');
  if (!settings?.puuid) return [];
  return getCachedMatches(settings.puuid);
});

// Variante par puuid explicite — sert aux widgets "personnels" (wrapped
// hebdo, etc.) qui doivent toujours parler du compte lié, pas de celui
// éventuellement affiché à l'écran si l'utilisateur consulte quelqu'un d'autre.
ipcMain.handle('valorant:get-cached-matches-for', (_event, puuid) => {
  if (!puuid) return [];
  return getCachedMatches(puuid);
});

let networkStatus = { valorantRunning: false, latestPing: null };

setInterval(async () => {
  const valorantRunning = isValorantRunning();
  const latestPing = valorantRunning ? await pingOnce() : null;
  networkStatus = { valorantRunning, latestPing };
  if (valorantRunning && latestPing !== null && currentPuuid()) {
    savePingSample(currentPuuid(), latestPing);
  }
}, 5000);

ipcMain.handle('network:get-status', () => networkStatus);

// Détection de tilt en direct : tant que Valorant tourne, on revérifie
// régulièrement si un nouveau match vient de se terminer et, si oui, on
// recalcule le statut de tilt pour prévenir par notification Windows —
// sans attendre que l'utilisateur ouvre l'app et clique sur l'onglet Tilt.
const tiltPollState = { lastMatchId: null, notified: false };

function notifyTilt(tilt, form) {
  if (!Notification.isSupported()) return;
  const body = tilt.lossStreakTilt
    ? `Série de ${form.streakCount} défaites d'affilée. Une pause pourrait aider.`
    : `Ta perf a baissé sur tes 3 derniers matchs. Une pause pourrait aider.`;
  const notification = new Notification({
    title: '⚠️ MVP Tracker — signe de tilt détecté',
    body,
    silent: false,
  });
  notification.on('click', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  });
  notification.show();
}

async function checkTiltAndNotify() {
  const settings = store.get('valorantSettings');
  if (!settings?.name || !settings?.tag || !settings?.apiKey) return;
  try {
    const account = await getAccount(settings.name, settings.tag, settings.apiKey);
    const freshMatches = await getMatches(account.region, settings.name, settings.tag, settings.apiKey);
    saveMatches(account.puuid, freshMatches);

    const latestId = freshMatches[0]?.metadata?.matchid ?? null;
    if (!latestId || latestId === tiltPollState.lastMatchId) return;
    const isFirstCheck = tiltPollState.lastMatchId === null;
    tiltPollState.lastMatchId = latestId;
    // Premier check depuis le lancement de l'app : sert juste de point de
    // départ, pour ne pas notifier immédiatement sur un tilt déjà ancien.
    if (isFirstCheck) return;

    const played = excludeDeathmatch(getCachedMatches(account.puuid));
    const form = formStats(played, settings.name, settings.tag);
    const tilt = tiltStatus(played, settings.name, settings.tag, form);

    if (tilt.isTilted) {
      if (!tiltPollState.notified) {
        tiltPollState.notified = true;
        notifyTilt(tilt, form);
      }
    } else {
      tiltPollState.notified = false;
    }
  } catch {
    // Erreur ponctuelle (rate limit, réseau) : on retentera au prochain tick,
    // pas besoin de faire planter la vérification pour ça.
  }
}

setInterval(() => {
  if (isValorantRunning()) checkTiltAndNotify();
}, 120000);

ipcMain.handle('network:get-ping-samples', () => (currentPuuid() ? getAllPingSamples(currentPuuid()) : []));

ipcMain.handle('crosshair:list', () => (currentPuuid() ? getCrosshairs(currentPuuid()) : []));

ipcMain.handle('crosshair:save', (_event, { name, code, color, image }) =>
  saveCrosshair(currentPuuid(), name, code, color, image),
);

ipcMain.handle('crosshair:delete', (_event, id) => deleteCrosshair(currentPuuid(), id));

ipcMain.handle('strategy:list', (_event, map) => (currentPuuid() ? getStrategiesForMap(currentPuuid(), map) : []));

ipcMain.handle('strategy:save', (_event, { name, map, canvasJson }) =>
  saveStrategy(currentPuuid(), name, map, canvasJson),
);

ipcMain.handle('strategy:delete', (_event, id) => deleteStrategy(currentPuuid(), id));

// Clé `electron-store` scopée par compte — `skinsWishlist` / `skinsCollection`
// / `personalGoals` suivent maintenant le compte plutôt que la machine.
function scopedKey(base) {
  const puuid = currentPuuid();
  return puuid ? `${base}:${puuid}` : null;
}

ipcMain.handle('skins:get-wishlist', () => {
  const key = scopedKey('skinsWishlist');
  return key ? store.get(key) || [] : [];
});

ipcMain.handle('skins:toggle-wishlist', (_event, uuid) => {
  const key = scopedKey('skinsWishlist');
  if (!key) return [];
  const wishlist = store.get(key) || [];
  const next = wishlist.includes(uuid) ? wishlist.filter((id) => id !== uuid) : [...wishlist, uuid];
  store.set(key, next);
  return next;
});

ipcMain.handle('skins:get-collection', () => {
  const key = scopedKey('skinsCollection');
  return key ? store.get(key) || [] : [];
});

ipcMain.handle('skins:toggle-collection', (_event, { uuid, defaultPriceVp }) => {
  const key = scopedKey('skinsCollection');
  if (!key) return [];
  const collection = store.get(key) || [];
  const exists = collection.some((entry) => entry.uuid === uuid);
  const next = exists
    ? collection.filter((entry) => entry.uuid !== uuid)
    : [...collection, { uuid, priceVp: defaultPriceVp }];
  store.set(key, next);
  return next;
});

ipcMain.handle('skins:set-collection-price', (_event, { uuid, priceVp }) => {
  const key = scopedKey('skinsCollection');
  if (!key) return [];
  const collection = store.get(key) || [];
  const next = collection.map((entry) => (entry.uuid === uuid ? { ...entry, priceVp } : entry));
  store.set(key, next);
  return next;
});

ipcMain.handle('bet:get-pending', () => (currentPuuid() ? getPendingBet(currentPuuid()) : null));

ipcMain.handle('bet:create', (_event, { type, threshold, baselineMatchId }) =>
  createBet(currentPuuid(), type, threshold, baselineMatchId),
);

ipcMain.handle('bet:cancel', (_event, id) => cancelBet(currentPuuid(), id));

ipcMain.handle('bet:resolve', (_event, { id, resolvedMatchId, actualValue, won, points }) =>
  resolveBet(currentPuuid(), id, resolvedMatchId, actualValue, won, points),
);

ipcMain.handle('bet:history', (_event, limit) => (currentPuuid() ? getBetHistory(currentPuuid(), limit ?? 30) : []));

ipcMain.handle('bet:total-points', () => (currentPuuid() ? getTotalBetPoints(currentPuuid()) : 0));

ipcMain.handle('assessment:get', (_event, matchId) =>
  currentPuuid() ? getAssessmentForMatch(currentPuuid(), matchId) : null,
);

ipcMain.handle('assessment:save', (_event, { matchId, date, map, answersJson }) =>
  saveAssessment(currentPuuid(), matchId, date, map, answersJson),
);

ipcMain.handle('assessment:history', (_event, limit) =>
  currentPuuid() ? getAssessmentHistory(currentPuuid(), limit ?? 30) : [],
);

ipcMain.handle('narrative:get', (_event, weekStart) =>
  currentPuuid() ? getNarrativeForWeek(currentPuuid(), weekStart) : null,
);

ipcMain.handle('narrative:get-previous', (_event, weekStart) =>
  currentPuuid() ? getPreviousNarrative(currentPuuid(), weekStart) : null,
);

ipcMain.handle('narrative:save', (_event, { weekStart, recapJson, rankJson, narrativeJson }) =>
  saveNarrative(currentPuuid(), weekStart, recapJson, rankJson, narrativeJson),
);

ipcMain.handle('narrative:history', (_event, limit) =>
  currentPuuid() ? getNarrativeHistory(currentPuuid(), limit ?? 20) : [],
);

ipcMain.handle('puzzle:get', (_event, date) => (currentPuuid() ? getPuzzleByDate(currentPuuid(), date) : null));

ipcMain.handle('puzzle:save', (_event, { date, situationJson }) =>
  savePuzzle(currentPuuid(), date, situationJson),
);

ipcMain.handle('puzzle:answer', (_event, { date, choice, correct }) =>
  answerPuzzle(currentPuuid(), date, choice, correct),
);

ipcMain.handle('puzzle:history', (_event, limit) => (currentPuuid() ? getPuzzleHistory(currentPuuid(), limit ?? 30) : []));

ipcMain.handle('goals:get', () => {
  const key = scopedKey('personalGoals');
  return key ? store.get(key) || [] : [];
});

ipcMain.handle('goals:add', (_event, goal) => {
  const key = scopedKey('personalGoals');
  if (!key) return [];
  const goals = store.get(key) || [];
  const next = [...goals, { ...goal, id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, done: false, createdAt: Date.now() }];
  store.set(key, next);
  return next;
});

ipcMain.handle('goals:toggle-done', (_event, id) => {
  const key = scopedKey('personalGoals');
  if (!key) return [];
  const goals = store.get(key) || [];
  const next = goals.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal));
  store.set(key, next);
  return next;
});

ipcMain.handle('goals:delete', (_event, id) => {
  const key = scopedKey('personalGoals');
  if (!key) return [];
  const goals = store.get(key) || [];
  const next = goals.filter((goal) => goal.id !== id);
  store.set(key, next);
  return next;
});

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  createWindow();

  // Premier lancement déclenché directement par le lien (l'app n'était pas
  // encore ouverte) — le lien arrive dans les arguments de démarrage.
  const startupDeepLink = process.argv.find((arg) => arg.startsWith(`${DEEP_LINK_SCHEME}://`));
  if (startupDeepLink) {
    mainWindow.webContents.once('did-finish-load', () => handleDeepLink(startupDeepLink));
  }

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// macOS lance ce lien via 'open-url' plutôt que les arguments de démarrage.
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleDeepLink(url);
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and import them here.
