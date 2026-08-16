// Le Combat à mort n'a pas d'équipes/de winrate — à exclure des stats qui en dépendent
// (par agent, par map, par tranche horaire, par jour), pas des stats par mode (où il
// reste une catégorie légitime à afficher).
export function excludeDeathmatch(matches) {
  return matches.filter((m) => m.metadata?.mode_id !== 'deathmatch');
}

export function findMe(match, name, tag) {
  const players = match?.players?.all_players || [];
  return players.find(
    (p) => p.name?.toLowerCase() === name.toLowerCase() && p.tag?.toLowerCase() === tag.toLowerCase(),
  );
}

export function resultLabel(match, me) {
  if (match?.metadata?.mode_id === 'deathmatch') return 'Sans équipe';
  if (!me?.team) return '?';
  const teamKey = me.team.toLowerCase();
  const otherKey = teamKey === 'red' ? 'blue' : 'red';
  const myRounds = match?.teams?.[teamKey]?.rounds_won;
  const otherRounds = match?.teams?.[otherKey]?.rounds_won;
  if (myRounds !== undefined && otherRounds !== undefined && myRounds === otherRounds) {
    return 'Match nul';
  }
  const won = match?.teams?.[teamKey]?.has_won;
  if (won === undefined) return '?';
  return won ? 'Victoire' : 'Défaite';
}

export function matchScore(match, me) {
  if (!me?.team) return null;
  const myKey = me.team.toLowerCase();
  const otherKey = myKey === 'red' ? 'blue' : 'red';
  const myRounds = match?.teams?.[myKey]?.rounds_won;
  const otherRounds = match?.teams?.[otherKey]?.rounds_won;
  if (myRounds === undefined || otherRounds === undefined) return null;
  return `${myRounds}-${otherRounds}`;
}

export function hitStats(me) {
  const headshots = me?.stats?.headshots ?? 0;
  const bodyshots = me?.stats?.bodyshots ?? 0;
  const legshots = me?.stats?.legshots ?? 0;
  const total = headshots + bodyshots + legshots;
  return {
    headshots,
    bodyshots,
    legshots,
    hsPercent: total > 0 ? (headshots / total) * 100 : null,
    bsPercent: total > 0 ? (bodyshots / total) * 100 : null,
    lsPercent: total > 0 ? (legshots / total) * 100 : null,
  };
}

export function weaponKillsFor(match, puuid) {
  const kills = match?.kills || [];
  return kills
    .filter((k) => k.killer_puuid === puuid && k.damage_weapon_name)
    .map((k) => k.damage_weapon_name);
}

export function agentUsageOnMap(matches, name, tag, mapName) {
  const mapMatches = matches.filter((m) => m.metadata?.map === mapName);
  const total = mapMatches.length;
  const counts = new Map();

  mapMatches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.character) return;
    counts.set(me.character, (counts.get(me.character) || 0) + 1);
  });

  return [...counts.entries()]
    .map(([character, count]) => ({ character, count, percent: total > 0 ? (count / total) * 100 : 0 }))
    .sort((a, b) => b.count - a.count);
}

export function weaponKillsOnMap(matches, name, tag, mapName) {
  const counts = new Map();

  matches
    .filter((m) => m.metadata?.map === mapName)
    .forEach((match) => {
      const me = findMe(match, name, tag);
      if (!me) return;
      weaponKillsFor(match, me.puuid).forEach((weapon) => {
        counts.set(weapon, (counts.get(weapon) || 0) + 1);
      });
    });

  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

function matchesForAgent(matches, name, tag, character) {
  return matches.filter((match) => findMe(match, name, tag)?.character === character);
}

export function weaponKillsForAgent(matches, name, tag, character) {
  const counts = new Map();

  matchesForAgent(matches, name, tag, character).forEach((match) => {
    const me = findMe(match, name, tag);
    weaponKillsFor(match, me.puuid).forEach((weapon) => {
      counts.set(weapon, (counts.get(weapon) || 0) + 1);
    });
  });

  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
}

export function mapStatsForAgent(matches, name, tag, character) {
  return groupStats(matchesForAgent(matches, name, tag, character), name, tag, (match) => match.metadata?.map);
}

// `metadata.game_length` est en secondes dans les données de l'API.
export function agentPlaytimeSeconds(matches, name, tag, character) {
  return matchesForAgent(matches, name, tag, character).reduce(
    (sum, match) => sum + (match.metadata?.game_length ?? 0),
    0,
  );
}

export function agentTotalKills(matches, name, tag, character) {
  return matchesForAgent(matches, name, tag, character).reduce((sum, match) => {
    const me = findMe(match, name, tag);
    return sum + (me?.stats?.kills ?? 0);
  }, 0);
}

// Détermine qui attaquait un round donné à partir d'indices fiables :
// - si une équipe a posé la spike, elle attaquait forcément ce round-là
// - si le round se termine par "Time expired", l'équipe gagnante défendait
// Sinon (élimination sans pose), on ne peut rien déduire du round pris isolément.
//
// Mais les côtés ne changent JAMAIS au milieu d'une mi-temps (12 rounds en
// Compétitif/Non classé) : un seul indice trouvé n'importe où dans les 12
// premiers rounds suffit à connaître le côté des 12 (et donc, par symétrie,
// celui des 12 suivants aussi). En prolongation, le round 25 reprend le côté
// du tout premier round du match.
const HALF_SIZE = 12;
const STANDARD_HALF_MODES = ['competitive', 'unrated'];

function otherTeam(team) {
  return team === 'Red' ? 'Blue' : 'Red';
}

function directAttackerTeam(round) {
  if (round.plant_events?.planted_by?.team) {
    return round.plant_events.planted_by.team;
  }
  if (round.end_type === 'Round timer expired') {
    return otherTeam(round.winning_team);
  }
  return null;
}

export function mapSideStats(matches, name, tag, mapName) {
  let attackRounds = 0;
  let attackWins = 0;
  let defenseRounds = 0;
  let defenseWins = 0;
  let unknownRounds = 0;

  matches
    .filter((m) => m.metadata?.map === mapName)
    .forEach((match) => {
      const me = findMe(match, name, tag);
      if (!me?.team) return;

      const rounds = match.rounds || [];
      const attackerByRound = rounds.map(directAttackerTeam);

      if (STANDARD_HALF_MODES.includes(match.metadata?.mode_id)) {
        const half1 = attackerByRound.slice(0, HALF_SIZE).find((t) => t !== null) ?? null;
        const half2 = attackerByRound.slice(HALF_SIZE, HALF_SIZE * 2).find((t) => t !== null) ?? null;
        const half1Attacker = half1 ?? (half2 ? otherTeam(half2) : null);
        const half2Attacker = half2 ?? (half1 ? otherTeam(half1) : null);

        for (let i = 0; i < Math.min(HALF_SIZE, rounds.length); i += 1) {
          if (half1Attacker) attackerByRound[i] = half1Attacker;
        }
        for (let i = HALF_SIZE; i < Math.min(HALF_SIZE * 2, rounds.length); i += 1) {
          if (half2Attacker) attackerByRound[i] = half2Attacker;
        }
        if (rounds.length > HALF_SIZE * 2 && half1Attacker && attackerByRound[HALF_SIZE * 2] === null) {
          attackerByRound[HALF_SIZE * 2] = half1Attacker;
        }
      }

      attackerByRound.forEach((attackerTeam, i) => {
        if (!attackerTeam) {
          unknownRounds += 1;
          return;
        }
        const won = rounds[i].winning_team === me.team;
        if (me.team === attackerTeam) {
          attackRounds += 1;
          if (won) attackWins += 1;
        } else {
          defenseRounds += 1;
          if (won) defenseWins += 1;
        }
      });
    });

  return {
    attackRounds,
    attackWinrate: attackRounds > 0 ? (attackWins / attackRounds) * 100 : null,
    defenseRounds,
    defenseWinrate: defenseRounds > 0 ? (defenseWins / defenseRounds) * 100 : null,
    unknownRounds,
  };
}

export function groupStats(matches, name, tag, keyFn) {
  const groups = new Map();

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const key = keyFn(match, me);
    if (!key) return;

    if (!groups.has(key)) {
      groups.set(key, { games: 0, wins: 0, decidedGames: 0, kills: 0, deaths: 0, assists: 0 });
    }
    const g = groups.get(key);
    g.games += 1;
    g.kills += me.stats?.kills ?? 0;
    g.deaths += me.stats?.deaths ?? 0;
    g.assists += me.stats?.assists ?? 0;

    const label = resultLabel(match, me);
    if (label === 'Victoire' || label === 'Défaite') {
      g.decidedGames += 1;
      if (label === 'Victoire') g.wins += 1;
    }
  });

  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      games: g.games,
      winrate: g.decidedGames > 0 ? (g.wins / g.decidedGames) * 100 : null,
      avgKills: g.kills / g.games,
      avgDeaths: g.deaths / g.games,
      avgAssists: g.assists / g.games,
    }))
    .sort((a, b) => b.games - a.games);
}

export const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
export const WEEK_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
export const SLOT_HOURS = 3;
export const TIME_SLOT_ORDER = Array.from(
  { length: 24 / SLOT_HOURS },
  (_, i) => `${i * SLOT_HOURS}h-${(i + 1) * SLOT_HOURS}h`,
);

export function timeSlot(match) {
  const gameStart = match?.metadata?.game_start;
  if (!gameStart) return null;
  const hour = new Date(gameStart * 1000).getHours();
  const start = Math.floor(hour / SLOT_HOURS) * SLOT_HOURS;
  return `${start}h-${start + SLOT_HOURS}h`;
}

export function dayOfWeek(match) {
  const gameStart = match?.metadata?.game_start;
  if (!gameStart) return null;
  return DAY_LABELS[new Date(gameStart * 1000).getDay()];
}

// Suppose `matches` triés du plus récent au plus ancien (c'est l'ordre renvoyé par le cache SQLite).
export function formStats(matches, name, tag) {
  let streakType = null;
  let streakCount = 0;
  let streakBroken = false;

  let recentKills = 0;
  let recentDeaths = 0;
  let recentCount = 0;
  let totalKills = 0;
  let totalDeaths = 0;

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;

    totalKills += me.stats?.kills ?? 0;
    totalDeaths += me.stats?.deaths ?? 0;

    if (recentCount < 5) {
      recentKills += me.stats?.kills ?? 0;
      recentDeaths += me.stats?.deaths ?? 0;
      recentCount += 1;
    }

    const label = resultLabel(match, me);
    if (streakBroken || (label !== 'Victoire' && label !== 'Défaite')) return;
    if (streakType === null) {
      streakType = label;
      streakCount = 1;
    } else if (label === streakType) {
      streakCount += 1;
    } else {
      streakBroken = true;
    }
  });

  return {
    streakType,
    streakCount,
    overallKd: totalDeaths > 0 ? totalKills / totalDeaths : null,
    recentKd: recentDeaths > 0 ? recentKills / recentDeaths : null,
    recentCount,
  };
}

export function tiltStatus(matches, name, tag, form) {
  let last3Kills = 0;
  let last3Deaths = 0;
  let last3Count = 0;

  matches.forEach((match) => {
    if (last3Count >= 3) return;
    const me = findMe(match, name, tag);
    if (!me) return;
    last3Kills += me.stats?.kills ?? 0;
    last3Deaths += me.stats?.deaths ?? 0;
    last3Count += 1;
  });

  const last3Kd = last3Deaths > 0 ? last3Kills / last3Deaths : null;
  const lossStreakTilt = form.streakType === 'Défaite' && form.streakCount >= 3;
  const perfDegradation = last3Kd !== null && form.overallKd !== null && last3Kd < form.overallKd * 0.7;

  return { lossStreakTilt, perfDegradation, last3Kd, isTilted: lossStreakTilt || perfDegradation };
}

const PING_MATCH_MAX_GAP_MS = 10000;
const PING_SPIKE_RATIO = 1.3;

export function pingCorrelation(matches, pingSamples, name, tag) {
  let deathsAnalyzed = 0;
  let deathsNearSpike = 0;

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;

    const gameStartMs = (match.metadata?.game_start ?? 0) * 1000;
    const gameLengthMs = (match.metadata?.game_length ?? 0) * 1000;
    const windowSamples = pingSamples.filter(
      (s) => s.timestamp >= gameStartMs && s.timestamp <= gameStartMs + gameLengthMs,
    );
    if (windowSamples.length === 0) return;

    const baseline = windowSamples.reduce((sum, s) => sum + s.latency_ms, 0) / windowSamples.length;

    (match.kills || [])
      .filter((k) => k.victim_puuid === me.puuid)
      .forEach((death) => {
        const deathTime = gameStartMs + death.kill_time_in_match;
        let closest = null;
        let closestGap = Infinity;
        windowSamples.forEach((s) => {
          const gap = Math.abs(s.timestamp - deathTime);
          if (gap < closestGap) {
            closestGap = gap;
            closest = s;
          }
        });
        if (!closest || closestGap > PING_MATCH_MAX_GAP_MS) return;

        deathsAnalyzed += 1;
        if (closest.latency_ms > baseline * PING_SPIKE_RATIO) {
          deathsNearSpike += 1;
        }
      });
  });

  return { deathsAnalyzed, deathsNearSpike };
}
