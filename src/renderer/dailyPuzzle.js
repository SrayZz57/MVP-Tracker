import { excludeDeathmatch, findMe, ECONOMY_TIERS } from './valorantStats.js';

// Deux options poussent vers un engagement rapide, deux vers la prudence —
// pour rester honnête, le "bucket" auquel une option est associée est la
// seule chose comparée à la réalité, pas un jugement de "bonne tactique"
// dans l'absolu (impossible à établir avec les seules données de match).
export const PUZZLE_OPTIONS = [
  { id: 'duel_early', icon: '🔫', label: 'Chercher le duel dès le début du round', bucket: 'aggressive' },
  { id: 'rush_site', icon: '⚡', label: "Rusher un site avec l'équipe", bucket: 'aggressive' },
  { id: 'wait_info', icon: '🛡️', label: "Jouer patient, attendre une info avant d'engager", bucket: 'patient' },
  { id: 'save', icon: '💰', label: "Save, ne pas risquer le stuff", bucket: 'patient' },
];

const EARLY_ENGAGEMENT_MS = 20000;

function hashSeed(str) {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (h * 31 + str.charCodeAt(i)) >>> 0;
  }
  return h;
}

function economyTier(value) {
  if (value === null || value === undefined) return null;
  return ECONOMY_TIERS.find((t) => value < t.max)?.id ?? 'full';
}

function buildSituation(match, round, roundIndex, me, myPs) {
  const playerStats = round.player_stats || [];
  const myLoadoutValue = myPs.economy?.loadout_value ?? null;
  const enemyLoadouts = playerStats
    .filter((ps) => ps.player_team !== me.team)
    .map((ps) => ps.economy?.loadout_value)
    .filter((v) => v !== undefined && v !== null);
  const enemyAvgLoadoutValue =
    enemyLoadouts.length > 0 ? enemyLoadouts.reduce((a, b) => a + b, 0) / enemyLoadouts.length : null;

  let myScoreBefore = 0;
  let theirScoreBefore = 0;
  match.rounds.slice(0, roundIndex).forEach((r) => {
    if (r.winning_team === me.team) myScoreBefore += 1;
    else if (r.winning_team) theirScoreBefore += 1;
  });

  let myFirstKillTime = null;
  (myPs.kill_events || []).forEach((k) => {
    if (myFirstKillTime === null || k.kill_time_in_round < myFirstKillTime) myFirstKillTime = k.kill_time_in_round;
  });

  let myDeathTime = null;
  playerStats.forEach((ps) => {
    (ps.kill_events || []).forEach((k) => {
      if (k.victim_puuid === me.puuid) myDeathTime = k.kill_time_in_round;
    });
  });

  const candidateTimes = [myFirstKillTime, myDeathTime].filter((t) => t !== null);
  const firstActionTime = candidateTimes.length > 0 ? Math.min(...candidateTimes) : null;
  const actualBucket = firstActionTime !== null && firstActionTime < EARLY_ENGAGEMENT_MS ? 'aggressive' : 'patient';

  return {
    matchId: match.metadata.matchid,
    roundIndex,
    map: match.metadata?.map ?? '?',
    roundNumber: roundIndex + 1,
    myLoadoutValue,
    myEconomyTier: economyTier(myLoadoutValue),
    enemyAvgLoadoutValue,
    enemyEconomyTier: economyTier(enemyAvgLoadoutValue),
    scoreBefore: { mine: myScoreBefore, theirs: theirScoreBefore },
    actualBucket,
    firstActionTime,
    myKilledFirst: myFirstKillTime !== null && (myDeathTime === null || myFirstKillTime <= myDeathTime),
    myDied: myDeathTime !== null,
    roundWon: round.winning_team === me.team,
  };
}

// Choisit une map/round déterministe pour une date donnée (même date = même
// puzzle tant qu'il n'a pas déjà été généré et persisté), et reconstruit tout
// ce qu'il faut pour l'afficher ET le corriger : économie des deux équipes,
// score avant le round, et comportement réel du joueur suivi ce round-là
// (agressif = kill ou mort dans les 20 premières secondes, sinon patient).
// Certains rounds ont des données de round.player_stats incomplètes (joueur
// déconnecté, round abandonné...) : on parcourt matchs puis rounds à partir
// du point de départ tiré de la date, pour retomber sur le premier round
// exploitable plutôt que d'abandonner sur le premier tirage.
export function generatePuzzleSituation(matches, name, tag, dateSeed) {
  const eligibleMatches = excludeDeathmatch(matches).filter((m) => {
    if (!Array.isArray(m.rounds) || m.rounds.length === 0) return false;
    const me = findMe(m, name, tag);
    return !!me?.team && !!me?.puuid;
  });
  if (eligibleMatches.length === 0) return null;

  const matchCount = eligibleMatches.length;
  const startMatchIndex = hashSeed(`${dateSeed}-match`) % matchCount;

  for (let mOffset = 0; mOffset < matchCount; mOffset += 1) {
    const match = eligibleMatches[(startMatchIndex + mOffset) % matchCount];
    const me = findMe(match, name, tag);
    const roundCount = match.rounds.length;
    const startRoundIndex = hashSeed(`${dateSeed}-${match.metadata.matchid}`) % roundCount;

    for (let rOffset = 0; rOffset < roundCount; rOffset += 1) {
      const roundIndex = (startRoundIndex + rOffset) % roundCount;
      const round = match.rounds[roundIndex];
      const myPs = (round.player_stats || []).find((ps) => ps.player_puuid === me.puuid);
      if (!myPs) continue;
      return buildSituation(match, round, roundIndex, me, myPs);
    }
  }

  return null;
}

export function gradeChoice(situation, optionId) {
  const option = PUZZLE_OPTIONS.find((o) => o.id === optionId);
  if (!option || !situation) return null;
  return option.bucket === situation.actualBucket;
}

export function buildRevealText(situation) {
  const parts = [];
  if (situation.firstActionTime === null) {
    parts.push("Tu n'as ni tué ni été tué ce round-là (ou c'est arrivé très tard) — un round discret pour toi.");
  } else {
    const seconds = (situation.firstActionTime / 1000).toFixed(0);
    parts.push(
      situation.myKilledFirst
        ? `Tu as fait ton premier kill à ${seconds}s dans le round.`
        : `Tu es mort à ${seconds}s dans le round.`,
    );
  }
  parts.push(situation.roundWon ? 'Le round a été gagné.' : 'Le round a été perdu.');
  return parts.join(' ');
}
