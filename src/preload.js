// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  onRecoveryDeepLink: (callback) => {
    const listener = (_event, tokens) => callback(tokens);
    ipcRenderer.on('deep-link:recovery', listener);
    return () => ipcRenderer.removeListener('deep-link:recovery', listener);
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  getLanguage: () => ipcRenderer.invoke('language:get'),
  saveLanguage: (language) => ipcRenderer.invoke('language:set', language),
  setLinkedPuuid: (puuid) => ipcRenderer.invoke('account:set-linked-puuid', puuid),
  cacheMessagingKey: (payload) => ipcRenderer.invoke('messaging:cache-key', payload),
  getCachedMessagingKey: (userId) => ipcRenderer.invoke('messaging:get-cached-key', userId),
  clearCachedMessagingKey: (userId) => ipcRenderer.invoke('messaging:clear-cached-key', userId),
  getMatches: (settings) => ipcRenderer.invoke('valorant:get-matches', settings),
  previewRiotAccount: (payload) => ipcRenderer.invoke('valorant:preview-account', payload),
  getCachedMatches: () => ipcRenderer.invoke('valorant:get-cached-matches'),
  getCachedMatchesFor: (puuid) => ipcRenderer.invoke('valorant:get-cached-matches-for', puuid),
  getRankFor: (puuid) => ipcRenderer.invoke('valorant:get-rank-for', puuid),
  getNetworkStatus: () => ipcRenderer.invoke('network:get-status'),
  getPingSamples: () => ipcRenderer.invoke('network:get-ping-samples'),
  // Sélection d'agent en direct (API locale du client Valorant).
  getAgentSelect: () => ipcRenderer.invoke('valorant-local:agent-select'),
  setAgentSelectOverlayVisible: (visible) => ipcRenderer.invoke('agent-select-overlay:set-visible', visible),
  getDeviceId: () => ipcRenderer.invoke('network:get-device-id'),
  openAimTrainer: (config) => ipcRenderer.invoke('aim-trainer:open', config),
  closeAimTrainer: () => ipcRenderer.invoke('aim-trainer:close'),
  onAimTrainerClosed: (callback) => {
    const handler = () => callback();
    ipcRenderer.on('aim-trainer:closed', handler);
    return () => ipcRenderer.removeListener('aim-trainer:closed', handler);
  },
  listCrosshairs: () => ipcRenderer.invoke('crosshair:list'),
  saveCrosshair: (name, code, color, image) =>
    ipcRenderer.invoke('crosshair:save', { name, code, color, image }),
  deleteCrosshair: (id) => ipcRenderer.invoke('crosshair:delete', id),
  listStrategies: (map) => ipcRenderer.invoke('strategy:list', map),
  saveStrategy: (name, map, canvasJson) =>
    ipcRenderer.invoke('strategy:save', { name, map, canvasJson }),
  deleteStrategy: (id) => ipcRenderer.invoke('strategy:delete', id),
  getPendingBet: () => ipcRenderer.invoke('bet:get-pending'),
  createBet: (type, threshold, baselineMatchId) =>
    ipcRenderer.invoke('bet:create', { type, threshold, baselineMatchId }),
  cancelBet: (id) => ipcRenderer.invoke('bet:cancel', id),
  resolveBet: (id, resolvedMatchId, actualValue, won, points) =>
    ipcRenderer.invoke('bet:resolve', { id, resolvedMatchId, actualValue, won, points }),
  getBetHistory: (limit) => ipcRenderer.invoke('bet:history', limit),
  getTotalBetPoints: () => ipcRenderer.invoke('bet:total-points'),
  getMatchAssessment: (matchId) => ipcRenderer.invoke('assessment:get', matchId),
  saveMatchAssessment: (matchId, date, map, answersJson) =>
    ipcRenderer.invoke('assessment:save', { matchId, date, map, answersJson }),
  getMatchAssessmentHistory: (limit) => ipcRenderer.invoke('assessment:history', limit),
  getWeeklyNarrative: (weekStart) => ipcRenderer.invoke('narrative:get', weekStart),
  getPreviousWeeklyNarrative: (weekStart) => ipcRenderer.invoke('narrative:get-previous', weekStart),
  saveWeeklyNarrative: (weekStart, recapJson, rankJson, narrativeJson) =>
    ipcRenderer.invoke('narrative:save', { weekStart, recapJson, rankJson, narrativeJson }),
  getWeeklyNarrativeHistory: (limit) => ipcRenderer.invoke('narrative:history', limit),
  getPuzzle: (date) => ipcRenderer.invoke('puzzle:get', date),
  savePuzzle: (date, situationJson) => ipcRenderer.invoke('puzzle:save', { date, situationJson }),
  answerPuzzle: (date, choice, correct) => ipcRenderer.invoke('puzzle:answer', { date, choice, correct }),
  getPuzzleHistory: (limit) => ipcRenderer.invoke('puzzle:history', limit),
  getCollapsedBlocks: () => ipcRenderer.invoke('ui:get-collapsed-blocks'),
  toggleCollapsedBlock: (blockId) => ipcRenderer.invoke('ui:toggle-collapsed-block', blockId),
  getSkinsWishlist: () => ipcRenderer.invoke('skins:get-wishlist'),
  toggleSkinWishlist: (uuid) => ipcRenderer.invoke('skins:toggle-wishlist', uuid),
  getSkinsCollection: () => ipcRenderer.invoke('skins:get-collection'),
  toggleSkinCollection: (uuid, defaultPriceVp) =>
    ipcRenderer.invoke('skins:toggle-collection', { uuid, defaultPriceVp }),
  setSkinCollectionPrice: (uuid, priceVp) =>
    ipcRenderer.invoke('skins:set-collection-price', { uuid, priceVp }),
  getGoals: () => ipcRenderer.invoke('goals:get'),
  addGoal: (goal) => ipcRenderer.invoke('goals:add', goal),
  toggleGoalDone: (id) => ipcRenderer.invoke('goals:toggle-done', id),
  deleteGoal: (id) => ipcRenderer.invoke('goals:delete', id),
});
