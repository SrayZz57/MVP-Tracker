import { app, BrowserWindow, ipcMain, shell, Menu } from 'electron';
import path from 'node:path';
import started from 'electron-squirrel-startup';
import Store from 'electron-store';
import { getAccount, getMatches, getMmr } from './services/henrikdev.js';
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

// Toutes les données liées à un compte (crosshairs, stratégies, paris,
// évaluations, puzzles, wrapped, objectifs, skins) sont maintenant scopées
// par puuid, pour que consulter le tracker de quelqu'un d'autre sur cette
// machine n'écrase/n'affiche plus les données d'un autre compte. Les lignes
// créées avant ce scoping sont rattachées au compte actuellement configuré.
function currentPuuid() {
  return store.get('valorantSettings')?.puuid ?? null;
}
backfillLegacyPuuid(currentPuuid());

// Même chose côté electron-store : `personalGoals`/`skinsWishlist`/
// `skinsCollection` existaient en clés globales avant ce scoping — on les
// rattache au compte actuellement configuré si ce n'est pas déjà fait.
(function migrateLegacyStoreKeys() {
  const puuid = currentPuuid();
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

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
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

ipcMain.handle('settings:get', () => store.get('valorantSettings') || null);

ipcMain.handle('settings:set', (_event, settings) => {
  store.set('valorantSettings', settings);
});

ipcMain.handle('valorant:get-matches', async (_event, { name, tag, apiKey }) => {
  const account = await getAccount(name, tag, apiKey);
  store.set('valorantSettings', { name, tag, apiKey, puuid: account.puuid });

  const freshMatches = await getMatches(account.region, name, tag, apiKey);
  saveMatches(account.puuid, freshMatches);

  try {
    const mmr = await getMmr(account.region, name, tag, apiKey);
    store.set('valorantRank', {
      accountLevel: account.account_level,
      cardUuid: account.card,
      tierId: mmr.current.tier.id,
      tierName: mmr.current.tier.name,
      rr: mmr.current.rr,
      peakTierId: mmr.peak.tier.id,
      peakTierName: mmr.peak.tier.name,
      peakSeasonUuid: mmr.peak.season.id,
    });
  } catch {
    // Rang indisponible (compte non classé, erreur API) : on garde le dernier connu.
  }

  return getCachedMatches(account.puuid);
});

ipcMain.handle('valorant:get-rank', () => store.get('valorantRank') || null);

ipcMain.handle('valorant:get-cached-matches', () => {
  const settings = store.get('valorantSettings');
  if (!settings?.puuid) return [];
  return getCachedMatches(settings.puuid);
});

let networkStatus = { valorantRunning: false, latestPing: null };

setInterval(async () => {
  const valorantRunning = isValorantRunning();
  const latestPing = valorantRunning ? await pingOnce() : null;
  networkStatus = { valorantRunning, latestPing };
  if (valorantRunning && latestPing !== null) {
    savePingSample(latestPing);
  }
}, 5000);

ipcMain.handle('network:get-status', () => networkStatus);

ipcMain.handle('network:get-ping-samples', () => getAllPingSamples());

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

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
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
