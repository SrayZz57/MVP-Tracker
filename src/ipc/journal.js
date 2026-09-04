import { ipcMain } from 'electron';
import {
  answerPuzzle,
  cancelBet,
  createBet,
  endPlaySession,
  getActivePlaySession,
  getAssessmentForMatch,
  getAssessmentHistory,
  getBetHistory,
  getNarrativeForWeek,
  getNarrativeHistory,
  getPendingBet,
  getPlaySessionHistory,
  getPreviousNarrative,
  getPuzzleByDate,
  getPuzzleHistory,
  getTotalBetPoints,
  resolveBet,
  saveAssessment,
  saveNarrative,
  savePuzzle,
  startPlaySession,
} from '../services/db.js';

export function register({ currentPuuid }) {
  ipcMain.handle('play-session:get-active', () => (currentPuuid() ? getActivePlaySession(currentPuuid()) : null));

  ipcMain.handle('play-session:start', () => (currentPuuid() ? startPlaySession(currentPuuid()) : null));

  ipcMain.handle('play-session:end', (_event, id) => {
    if (currentPuuid()) endPlaySession(currentPuuid(), id);
  });

  ipcMain.handle('play-session:history', (_event, limit) =>
    currentPuuid() ? getPlaySessionHistory(currentPuuid(), limit ?? 30) : [],
  );

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
}
