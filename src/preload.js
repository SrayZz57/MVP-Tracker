// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  getMatches: (settings) => ipcRenderer.invoke('valorant:get-matches', settings),
  getCachedMatches: () => ipcRenderer.invoke('valorant:get-cached-matches'),
  getRank: () => ipcRenderer.invoke('valorant:get-rank'),
  getNetworkStatus: () => ipcRenderer.invoke('network:get-status'),
  getPingSamples: () => ipcRenderer.invoke('network:get-ping-samples'),
  listCrosshairs: () => ipcRenderer.invoke('crosshair:list'),
  saveCrosshair: (name, code, color, image) =>
    ipcRenderer.invoke('crosshair:save', { name, code, color, image }),
  deleteCrosshair: (id) => ipcRenderer.invoke('crosshair:delete', id),
  listStrategies: (map) => ipcRenderer.invoke('strategy:list', map),
  saveStrategy: (name, map, canvasJson) =>
    ipcRenderer.invoke('strategy:save', { name, map, canvasJson }),
  deleteStrategy: (id) => ipcRenderer.invoke('strategy:delete', id),
  getSkinsWishlist: () => ipcRenderer.invoke('skins:get-wishlist'),
  toggleSkinWishlist: (uuid) => ipcRenderer.invoke('skins:toggle-wishlist', uuid),
  getSkinsCollection: () => ipcRenderer.invoke('skins:get-collection'),
  toggleSkinCollection: (uuid, defaultPriceVp) =>
    ipcRenderer.invoke('skins:toggle-collection', { uuid, defaultPriceVp }),
  setSkinCollectionPrice: (uuid, priceVp) =>
    ipcRenderer.invoke('skins:set-collection-price', { uuid, priceVp }),
  getOverwatchSettings: () => ipcRenderer.invoke('overwatch:get-settings'),
  getOverwatchProfile: (battleTag) => ipcRenderer.invoke('overwatch:get-profile', battleTag),
});
