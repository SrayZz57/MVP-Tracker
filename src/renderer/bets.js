import { findMe, resultLabel, hitStats } from './valorantStats.js';

export const BET_TYPES = [
  { id: 'kills', label: 'Faire X+ kills', needsThreshold: true, defaultThreshold: 20, suffix: 'kills' },
  { id: 'duel_winrate', label: 'Gagner plus de X% de mes duels', needsThreshold: true, defaultThreshold: 50, suffix: '%' },
  { id: 'hs_percent', label: 'Avoir X%+ de précision tête', needsThreshold: true, defaultThreshold: 25, suffix: '%' },
  { id: 'win', label: 'Gagner ce match', needsThreshold: false, defaultThreshold: null, suffix: '' },
];

const POINTS_ON_WIN = 10;

export function describeBet(type, threshold) {
  const def = BET_TYPES.find((t) => t.id === type);
  if (!def) return '';
  if (type === 'kills') return `Faire ${threshold}+ kills`;
  if (type === 'duel_winrate') return `Gagner plus de ${threshold}% de mes duels`;
  if (type === 'hs_percent') return `Avoir ${threshold}%+ de précision tête`;
  if (type === 'win') return 'Gagner ce match';
  return def.label;
}

// Compare un pari (type + seuil) à ce qui s'est réellement passé dans le
// prochain match joué après le pari — pas de négatif si perdu, juste 0 point
// (l'esprit reste ludique, pas punitif).
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
