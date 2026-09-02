import { findMe, resultLabel, hitStats } from './valorantStats.js';

export const BET_TYPES = [
  { id: 'kills', labelKey: 'bets.types.kills', needsThreshold: true, defaultThreshold: 20, suffix: 'kills' },
  { id: 'duel_winrate', labelKey: 'bets.types.duelWinrate', needsThreshold: true, defaultThreshold: 50, suffix: '%' },
  { id: 'hs_percent', labelKey: 'bets.types.hsPercent', needsThreshold: true, defaultThreshold: 25, suffix: '%' },
  { id: 'win', labelKey: 'bets.types.win', needsThreshold: false, defaultThreshold: null, suffix: '' },
];

const POINTS_ON_WIN = 10;

export function describeBet(t, type, threshold) {
  const def = BET_TYPES.find((bt) => bt.id === type);
  if (!def) return '';
  if (type === 'kills') return t('bets.describe.kills', { threshold });
  if (type === 'duel_winrate') return t('bets.describe.duelWinrate', { threshold });
  if (type === 'hs_percent') return t('bets.describe.hsPercent', { threshold });
  if (type === 'win') return t('bets.describe.win');
  return t(def.labelKey);
}

export function evaluateBet(type, threshold, match, name, tag) {
  const me = findMe(match, name, tag);
  if (!me) return null;

  const kills = me.stats?.kills ?? 0;
  const deaths = me.stats?.deaths ?? 0;

  let actualValue = null;
  let won = false;

  if (type === 'kills') {
    actualValue = kills;
    won = kills >= threshold;
  } else if (type === 'duel_winrate') {
    const total = kills + deaths;
    actualValue = total > 0 ? (kills / total) * 100 : 0;
    won = actualValue >= threshold;
  } else if (type === 'hs_percent') {
    const { hsPercent } = hitStats(me);
    actualValue = hsPercent ?? 0;
    won = actualValue >= threshold;
  } else if (type === 'win') {
    actualValue = resultLabel(match, me) === 'Victoire' ? 1 : 0;
    won = actualValue === 1;
  }

  return { actualValue, won, points: won ? POINTS_ON_WIN : 0 };
}
