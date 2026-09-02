import { excludeDeathmatch, groupStats, timeSlot, SLOT_HOURS, tiltStatus, formStats, overallHsPercent } from './valorantStats.js';

function currentTimeSlotLabel() {
  const hour = new Date().getHours();
  const start = Math.floor(hour / SLOT_HOURS) * SLOT_HOURS;
  return `${start}h-${start + SLOT_HOURS}h`;
}

function suggestWarmup(t, slotStats) {
  const currentSlot = currentTimeSlotLabel();
  const stats = slotStats.find((s) => s.key === currentSlot) ?? null;

  if (!stats || stats.games < 2 || stats.winrate === null) {
    return {
      minutes: 15,
      reason: t('session.warmupNoData', { slot: currentSlot }),
    };
  }
  if (stats.winrate >= 50) {
    return {
      minutes: 10,
      reason: t('session.warmupGood', { slot: currentSlot, percent: stats.winrate.toFixed(0) }),
    };
  }
  return {
    minutes: 20,
    reason: t('session.warmupBad', { slot: currentSlot, percent: stats.winrate.toFixed(0) }),
  };
}

export function buildSessionPlan(t, matches, name, tag) {
  const ranked = excludeDeathmatch(matches);
  const form = formStats(ranked, name, tag);
  const tilt = tiltStatus(ranked, name, tag, form);
  const slotStats = groupStats(ranked, name, tag, (match) => timeSlot(match));
  const warmup = suggestWarmup(t, slotStats);

  const targetMap = matches[0]?.metadata?.map ?? null;

  const hsPercent = overallHsPercent(ranked, name, tag);
  const hsTarget = hsPercent === null ? 25 : Math.ceil((hsPercent + 3) / 5) * 5;

  const matchCount = tilt.isTilted ? 2 : 3;

  const objective = targetMap
    ? t('session.objectiveWithMap', { count: matchCount, map: targetMap, hsTarget })
    : t('session.objectiveNoMap', { count: matchCount, hsTarget });

  return { warmup, targetMap, tilt, matchCount, hsTarget, objective };
}
