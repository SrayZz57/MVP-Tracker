// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: () => ipcRenderer.invoke('settings:get'),
  saveSettings: (settings) => ipcRenderer.invoke('settings:set', settings),
  getMatches: (settings) => ipcRenderer.invoke('valorant:get-matches', settings),
  getCachedMatches: () => ipcRenderer.invoke('valorant:get-cached-matches'),
  getNetworkStatus: () => ipcRenderer.invoke('network:get-status'),
  getPingSamples: () => ipcRenderer.invoke('network:get-ping-samples'),
});
