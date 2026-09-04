import { MODES } from './AimTrainerGame.jsx';

function hashDate(dateKey) {
  let hash = 0;
  for (let i = 0; i < dateKey.length; i += 1) {
    hash = (hash * 31 + dateKey.charCodeAt(i)) >>> 0;
  }
  return hash;
}

const DURATIONS = [30, 45, 60];
const SIZE_TWEAKS = [-0.08, 0, 0.06];

export function buildDailyChallenge(dateKey) {
  const hash = hashDate(dateKey);
  const modeIds = Object.keys(MODES);
  const modeId = modeIds[hash % modeIds.length];
  const mode = MODES[modeId];

  return {
    dateKey,
    mode: modeId,
    ...mode.preset,
    duration: DURATIONS[(hash >> 3) % DURATIONS.length],
    targetSize: Math.max(0.15, +(mode.preset.targetSize + SIZE_TWEAKS[(hash >> 6) % SIZE_TWEAKS.length]).toFixed(2)),
  };
}
