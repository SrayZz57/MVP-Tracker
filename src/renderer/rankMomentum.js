import { excludeDeathmatch, findMe, resultLabel, hitStats } from './valorantStats.js';

const RECENT_WINDOW = 10;
const MIN_TOTAL_MATCHES = 20;
const IMPROVEMENT_RATIO = 1.15;

function computeBucketStats(matches, name, tag) {
  let kills = 0;
  let deaths = 0;
  let wins = 0;
  let decided = 0;
  let headshots = 0;
  let bodyshots = 0;
  let legshots = 0;

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    kills += me.stats?.kills ?? 0;
    deaths += me.stats?.deaths ?? 0;
    const label = resultLabel(match, me);
    if (label === 'Victoire' || label === 'Défaite') {
      decided += 1;
      if (label === 'Victoire') wins += 1;
    }
    const hs = hitStats(me);
    headshots += hs.headshots;
    bodyshots += hs.bodyshots;
    legshots += hs.legshots;
  });

  const totalShots = headshots + bodyshots + legshots;
  return {
    games: matches.length,
    kd: deaths > 0 ? kills / deaths : kills || null,
    winrate: decided > 0 ? (wins / decided) * 100 : null,
    hsPercent: totalShots > 0 ? (headshots / totalShots) * 100 : null,
  };
}

export function computeRankMomentum(matches, name, tag) {
  const ranked = excludeDeathmatch(matches);
  if (ranked.length < MIN_TOTAL_MATCHES) {
    return { ready: false, gamesAnalyzed: ranked.length, minGames: MIN_TOTAL_MATCHES };
  }

  const recent = ranked.slice(0, RECENT_WINDOW);
  const baseline = ranked.slice(RECENT_WINDOW);

  const recentStats = computeBucketStats(recent, name, tag);
  const baselineStats = computeBucketStats(baseline, name, tag);

  const ratio = (r, b) => (r !== null && b !== null && b > 0 ? r / b : null);
  const kdRatio = ratio(recentStats.kd, baselineStats.kd);
  const winrateRatio = ratio(recentStats.winrate, baselineStats.winrate);
  const hsRatio = ratio(recentStats.hsPercent, baselineStats.hsPercent);

  const strongSignals = [kdRatio, winrateRatio, hsRatio].filter((r) => r !== null && r >= IMPROVEMENT_RATIO).length;
  const trending = strongSignals >= 2 && recentStats.winrate !== null && recentStats.winrate >= 50;

  return { ready: true, trending, recentStats, baselineStats, kdRatio, winrateRatio, hsRatio };
}
