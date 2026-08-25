import { findMe, excludeDeathmatch, hitStats } from './valorantStats.js';

// Croise les séances d'Aim Trainer avec les vraies parties Valorant : est-ce
// que les jours où tu t'entraînes, tu joues réellement mieux ?
//
// C'est l'angle propre à MVP Tracker : un aim trainer classique ne connaît pas
// tes matchs, et un tracker classique ne connaît pas tes séances. Ici on a les
// deux, donc la comparaison est possible.

const MIN_MATCHES_PER_GROUP = 3; // en dessous, la comparaison n'a aucun sens

function dayKeyFromMs(ms) {
  const d = new Date(ms);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function summarize(matches, name, tag) {
  let kills = 0;
  let deaths = 0;
  let wins = 0;
  let counted = 0;
  let hsSum = 0;
  let hsCount = 0;

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    counted += 1;
    kills += me.stats?.kills ?? 0;
    deaths += me.stats?.deaths ?? 0;

    const myTeam = me.team?.toLowerCase();
    const teams = match.teams ?? {};
    if (myTeam && teams[myTeam]?.has_won) wins += 1;

    const { hsPercent } = hitStats(me);
    if (hsPercent !== null) {
      hsSum += hsPercent;
      hsCount += 1;
    }
  });

  if (counted === 0) return null;
  return {
    games: counted,
    kd: deaths > 0 ? kills / deaths : kills,
    winrate: (wins / counted) * 100,
    hsPercent: hsCount > 0 ? hsSum / hsCount : null,
  };
}

// `history` : lignes de aim_trainer_scores (created_at)
// `matches`  : matchs bruts HenrikDev du compte lié
export function computeTrainingImpact(history, matches, name, tag) {
  if (!history?.length || !matches?.length) return null;

  const trainedDays = new Set(history.map((row) => row.created_at.slice(0, 10)));
  const ranked = excludeDeathmatch(matches);

  const withTraining = [];
  const withoutTraining = [];
  ranked.forEach((match) => {
    const startMs = (match.metadata?.game_start ?? 0) * 1000;
    if (!startMs) return;
    (trainedDays.has(dayKeyFromMs(startMs)) ? withTraining : withoutTraining).push(match);
  });

  const trained = summarize(withTraining, name, tag);
  const untrained = summarize(withoutTraining, name, tag);

  // Sans assez de matchs des deux côtés, on préfère ne rien affirmer plutôt
  // que de sortir un écart calculé sur une ou deux parties.
  if (!trained || !untrained || trained.games < MIN_MATCHES_PER_GROUP || untrained.games < MIN_MATCHES_PER_GROUP) {
    return {
      ready: false,
      trainedGames: trained?.games ?? 0,
      untrainedGames: untrained?.games ?? 0,
      needed: MIN_MATCHES_PER_GROUP,
    };
  }

  const delta = (a, b) => (a === null || b === null ? null : a - b);

  return {
    ready: true,
    trained,
    untrained,
    deltas: {
      kd: delta(trained.kd, untrained.kd),
      winrate: delta(trained.winrate, untrained.winrate),
      hsPercent: delta(trained.hsPercent, untrained.hsPercent),
    },
  };
}
