import { app, BrowserWindow, ipcMain, shell } from 'electron';
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
} from './services/db.js';
import { isValorantRunning, pingOnce } from './services/network.js';
import { updateElectronApp } from 'update-electron-app';

const store = new Store();

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (started) {
  app.quit();
}

// Vérifie les GitHub Releases au démarrage puis toutes les heures ; ne fait
// rien en dev (app pas empaquetée), donc sûr à laisser tel quel.
updateElectronApp({ repo: 'SrayZz57/MVP-Tracker' });

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 800,
    height: 600,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // and load the index.html of the app.
  if (MAIN_WINDOW_VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(MAIN_WINDOW_VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, `../renderer/${MAIN_WINDOW_VITE_NAME}/index.html`));
  }

  // Open the DevTools.
  mainWindow.webContents.openDevTools();
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

ipcMain.handle('crosshair:list', () => getCrosshairs());

ipcMain.handle('crosshair:save', (_event, { name, code, color, image }) =>
  saveCrosshair(name, code, color, image),
);

ipcMain.handle('crosshair:delete', (_event, id) => deleteCrosshair(id));

ipcMain.handle('strategy:list', (_event, map) => getStrategiesForMap(map));

ipcMain.handle('strategy:save', (_event, { name, map, canvasJson }) =>
  saveStrategy(name, map, canvasJson),
);

ipcMain.handle('strategy:delete', (_event, id) => deleteStrategy(id));

ipcMain.handle('skins:get-wishlist', () => store.get('skinsWishlist') || []);

ipcMain.handle('skins:toggle-wishlist', (_event, uuid) => {
  const wishlist = store.get('skinsWishlist') || [];
  const next = wishlist.includes(uuid) ? wishlist.filter((id) => id !== uuid) : [...wishlist, uuid];
  store.set('skinsWishlist', next);
  return next;
});

ipcMain.handle('skins:get-collection', () => store.get('skinsCollection') || []);

ipcMain.handle('skins:toggle-collection', (_event, { uuid, defaultPriceVp }) => {
  const collection = store.get('skinsCollection') || [];
  const exists = collection.some((entry) => entry.uuid === uuid);
  const next = exists
    ? collection.filter((entry) => entry.uuid !== uuid)
    : [...collection, { uuid, priceVp: defaultPriceVp }];
  store.set('skinsCollection', next);
  return next;
});

ipcMain.handle('skins:set-collection-price', (_event, { uuid, priceVp }) => {
  const collection = store.get('skinsCollection') || [];
  const next = collection.map((entry) => (entry.uuid === uuid ? { ...entry, priceVp } : entry));
  store.set('skinsCollection', next);
  return next;
});

ipcMain.handle('bet:get-pending', () => getPendingBet());

ipcMain.handle('bet:create', (_event, { type, threshold, baselineMatchId }) =>
  createBet(type, threshold, baselineMatchId),
);

ipcMain.handle('bet:cancel', (_event, id) => cancelBet(id));

ipcMain.handle('bet:resolve', (_event, { id, resolvedMatchId, actualValue, won, points }) =>
  resolveBet(id, resolvedMatchId, actualValue, won, points),
);

ipcMain.handle('bet:history', (_event, limit) => getBetHistory(limit ?? 30));

ipcMain.handle('bet:total-points', () => getTotalBetPoints());

ipcMain.handle('assessment:get', (_event, matchId) => getAssessmentForMatch(matchId));

ipcMain.handle('assessment:save', (_event, { matchId, date, map, answersJson }) =>
  saveAssessment(matchId, date, map, answersJson),
);

ipcMain.handle('assessment:history', (_event, limit) => getAssessmentHistory(limit ?? 30));

ipcMain.handle('narrative:get', (_event, weekStart) => getNarrativeForWeek(weekStart));

ipcMain.handle('narrative:get-previous', (_event, weekStart) => getPreviousNarrative(weekStart));

ipcMain.handle('narrative:save', (_event, { weekStart, recapJson, rankJson, narrativeJson }) =>
  saveNarrative(weekStart, recapJson, rankJson, narrativeJson),
);

ipcMain.handle('narrative:history', (_event, limit) => getNarrativeHistory(limit ?? 20));

ipcMain.handle('puzzle:get', (_event, date) => getPuzzleByDate(date));

ipcMain.handle('puzzle:save', (_event, { date, situationJson }) => savePuzzle(date, situationJson));

ipcMain.handle('puzzle:answer', (_event, { date, choice, correct }) => answerPuzzle(date, choice, correct));

ipcMain.handle('puzzle:history', (_event, limit) => getPuzzleHistory(limit ?? 30));

ipcMain.handle('goals:get', () => store.get('personalGoals') || []);

ipcMain.handle('goals:add', (_event, goal) => {
  const goals = store.get('personalGoals') || [];
  const next = [...goals, { ...goal, id: `g-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, done: false, createdAt: Date.now() }];
  store.set('personalGoals', next);
  return next;
});

ipcMain.handle('goals:toggle-done', (_event, id) => {
  const goals = store.get('personalGoals') || [];
  const next = goals.map((goal) => (goal.id === id ? { ...goal, done: !goal.done } : goal));
  store.set('personalGoals', next);
  return next;
});

ipcMain.handle('goals:delete', (_event, id) => {
  const goals = store.get('personalGoals') || [];
  const next = goals.filter((goal) => goal.id !== id);
  store.set('personalGoals', next);
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
