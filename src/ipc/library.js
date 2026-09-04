import { ipcMain } from 'electron';
import {
  deleteCrosshair,
  deleteStrategy,
  getCrosshairs,
  getStrategiesForMap,
  saveCrosshair,
  saveStrategy,
} from '../services/db.js';

export function register({ currentPuuid }) {
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
}
