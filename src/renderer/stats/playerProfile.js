import {
  excludeDeathmatch, groupStats, clutchStats, firstBloodStats, tiltFrequency,
  overallHsPercent, deathTimingStats,
} from './valorantStats.js';

const MIN_MATCHES = 5;

function bucket(score) {
  if (score === null) return null;
  if (score >= 66) return 'high';
  if (score >= 34) return 'mid';
  return 'low';
}

export const WEAKNESS_RECOMMENDATIONS = {
  aggression: { tab: 'aim-trainer', mode: 'peek', key: 'aggression' },
  stability: { tab: 'aim-trainer', mode: 'precision', key: 'stability' },
  versatility: { tab: 'composition', key: 'versatility' },
  clutch: { tab: 'aim-trainer', mode: 'snapHold', key: 'clutch' },
  aim: { tab: 'aim-trainer', mode: 'micro', key: 'aim' },
  positioning: { tab: 'aim-trainer', mode: 'reflex', key: 'positioning' },
};

const MAX_WEAKNESSES = 3;

export function getWeaknesses(scores) {
  return Object.entries(scores)
    .filter(([, value]) => value !== null)
    .sort((a, b) => a[1] - b[1])
    .slice(0, MAX_WEAKNESSES)
    .map(([dimension, value]) => ({ dimension, value, ...WEAKNESS_RECOMMENDATIONS[dimension] }));
}

function describeProfile({ aggression, stability, versatility, clutch }) {
  const a = bucket(aggression);
  const s = bucket(stability);
  const v = bucket(versatility);
  const c = bucket(clutch);

  if (a === 'high' && s === 'low') return 'duelistImpulsive';
  if (a === 'high' && c === 'high') return 'clutchFragger';
  if (a === 'high' && v === 'high') return 'aggressivePolyvalent';
  if (a === 'high') return 'entryFragger';

  if (v === 'high' && s === 'high' && c === 'high') return 'clutchAllrounder';
  if (v === 'high' && s === 'high' && a === 'low') return 'quietFlexible';
  if (v === 'high' && s === 'high') return 'versatileTactician';

  if (s === 'low' && c === 'high') return 'unstableCloser';
  if (s === 'low') return 'inconsistentPlayer';

  if (c === 'high' && v === 'low') return 'clutchSpecialist';
  if (c === 'high') return 'closer';

  if (v === 'low' && a === 'low') return 'quietSpecialist';
  if (v === 'low') return 'specialist';

  if (a === 'low' && s === 'high') return 'steadyPillar';

  return 'balancedPlayer';
}

export function computePlayerProfile(matches, name, tag) {
  const ranked = excludeDeathmatch(matches);
  if (ranked.length < MIN_MATCHES) {
    return { ready: false, matchesAnalyzed: ranked.length, minMatches: MIN_MATCHES };
  }

  const fb = firstBloodStats(matches, name, tag);
  const tilt = tiltFrequency(matches, name, tag);
  const clutch = clutchStats(matches, name, tag);
  const agentRows = groupStats(ranked, name, tag, (match, me) => me.character);
  const hsPercent = overallHsPercent(matches, name, tag);
  const deathTiming = deathTimingStats(matches, name, tag);
  const earlyDeathPercent = deathTiming.buckets.find((b) => b.id === 'early')?.percent ?? null;

  const scores = {
    aggression: fb.ratio,
    stability: tilt.percent === null ? null : 100 - tilt.percent,
    versatility: agentRows.length > 0 ? Math.min(100, (agentRows.length / 8) * 100) : null,
    clutch: clutch.attempts >= 3 ? clutch.winrate : null,
    aim: hsPercent === null ? null : Math.min(100, (hsPercent / 40) * 100),
    positioning: deathTiming.total >= 10 ? Math.max(0, 100 - earlyDeathPercent * 2) : null,
  };

  const archetype = describeProfile(scores);

  return {
    ready: true,
    matchesAnalyzed: ranked.length,
    scores,
    distinctAgents: agentRows.length,
    firstBloods: fb.firstBloods,
    firstDeaths: fb.firstDeaths,
    clutchAttempts: clutch.attempts,
    archetype,
  };
}
