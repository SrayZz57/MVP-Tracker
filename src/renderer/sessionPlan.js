import { excludeDeathmatch, groupStats, timeSlot, SLOT_HOURS, tiltStatus, formStats, overallHsPercent } from './valorantStats.js';

function currentTimeSlotLabel() {
  const hour = new Date().getHours();
  const start = Math.floor(hour / SLOT_HOURS) * SLOT_HOURS;
  return `${start}h-${start + SLOT_HOURS}h`;
}

// Durée d'échauffement suggérée à partir du module "Perf & Forme" : plus
// courte si l'historique montre que tu performes déjà bien sur ce créneau
// horaire précis, plus longue s'il montre l'inverse (ou s'il n'y a pas encore
// assez de données pour ce créneau).
function suggestWarmup(slotStats) {
  const currentSlot = currentTimeSlotLabel();
  const stats = slotStats.find((s) => s.key === currentSlot) ?? null;

  if (!stats || stats.games < 2 || stats.winrate === null) {
    return {
      minutes: 15,
      reason: "Pas encore assez de données sur ce créneau horaire (" + currentSlot + ") — échauffement standard.",
    };
  }
  if (stats.winrate >= 50) {
    return {
      minutes: 10,
      reason: `Tu performes bien sur ce créneau (${currentSlot}, ${stats.winrate.toFixed(0)}% winrate) — un échauffement court suffit.`,
    };
  }
  return {
    minutes: 20,
    reason: `Ton winrate est plus faible sur ce créneau (${currentSlot}, ${stats.winrate.toFixed(0)}%) — prends plus de temps pour t'échauffer avant de lancer des classées.`,
  };
}

// Génère le plan de session : échauffement, map/stratégie à revoir, état de
// tilt, et un objectif du jour concret — le tout dérivé des modules déjà
// existants (Perf & Forme, Tilt, historique de matchs), sans nouvel appel API.
export function buildSessionPlan(matches, name, tag) {
  const ranked = excludeDeathmatch(matches);
  const form = formStats(ranked, name, tag);
  const tilt = tiltStatus(ranked, name, tag, form);
  const slotStats = groupStats(ranked, name, tag, (match) => timeSlot(match));
  const warmup = suggestWarmup(slotStats);

  const targetMap = matches[0]?.metadata?.map ?? null;

  const hsPercent = overallHsPercent(ranked, name, tag);
  const hsTarget = hsPercent === null ? 25 : Math.ceil((hsPercent + 3) / 5) * 5;

  const matchCount = tilt.isTilted ? 2 : 3;

  const objective = targetMap
    ? `${matchCount} match${matchCount > 1 ? 's' : ''} sur ${targetMap}, viser ${hsTarget}%+ de précision tête`
    : `${matchCount} match${matchCount > 1 ? 's' : ''}, viser ${hsTarget}%+ de précision tête`;

  return { warmup, targetMap, tilt, matchCount, hsTarget, objective };
}
