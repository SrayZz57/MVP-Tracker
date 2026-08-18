import {
  excludeDeathmatch,
  findMe,
  resultLabel,
  hitStats,
  killDistance,
  clutchStats,
  firstBloodStats,
  overallHsPercent,
  weaponKillsFor,
  duelDistanceStats,
} from './valorantStats.js';

const ACE_THRESHOLD = 5;

function matchContext(match) {
  return {
    matchId: match.metadata?.matchid,
    map: match.metadata?.map ?? '?',
    date: match.metadata?.game_start ? match.metadata.game_start * 1000 : null,
  };
}

// Meilleur "ace" : le round avec le plus de kills du joueur suivi (à partir
// de 5, seuil classique d'un ace en 5v5), toutes équipes confondues.
function findBestAce(matches, name, tag) {
  const fullName = `${name}#${tag}`.toLowerCase();
  let best = null;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.puuid) return;
    (match.rounds || []).forEach((round, roundIndex) => {
      const myPs = (round.player_stats || []).find((ps) => ps.player_puuid === me.puuid);
      // Exclut les kill_events où killer === victim : mort par l'explosion du
      // spike (ou suicide) n'est pas un kill, même si l'API le liste ici.
      const kills = (myPs?.kill_events || []).filter((k) => k.killer_puuid !== k.victim_puuid).length;
      if (kills < ACE_THRESHOLD) return;
      if (!best || kills > best.kills) {
        best = { kills, roundNumber: roundIndex + 1, agent: me.character, ...matchContext(match) };
      }
    });
  });

  return best;
}

// Plus longue série de victoires jamais observée dans l'historique (pas
// seulement la série en cours) — rejoue les résultats en ordre chronologique.
function findLongestWinStreak(matches, name, tag) {
  const chronological = [...excludeDeathmatch(matches)].reverse();
  let bestStreak = 0;
  let bestStart = null;
  let bestEnd = null;
  let currentStreak = 0;
  let currentStart = null;

  chronological.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const label = resultLabel(match, me);
    if (label === 'Victoire') {
      if (currentStreak === 0) currentStart = match;
      currentStreak += 1;
      if (currentStreak > bestStreak) {
        bestStreak = currentStreak;
        bestStart = currentStart;
        bestEnd = match;
      }
    } else if (label === 'Défaite') {
      currentStreak = 0;
      currentStart = null;
    }
  });

  if (bestStreak === 0) return null;
  return {
    streak: bestStreak,
    startDate: bestStart?.metadata?.game_start ? bestStart.metadata.game_start * 1000 : null,
    endDate: bestEnd?.metadata?.game_start ? bestEnd.metadata.game_start * 1000 : null,
    endMap: bestEnd?.metadata?.map ?? '?',
  };
}

// Meilleur clutch gagné : le round où le joueur suivi a été le dernier vivant
// de son équipe face au plus grand nombre d'adversaires encore en vie, ET a
// gagné le round. Même reconstruction que clutchStats(), mais on garde la
// meilleure occurrence plutôt qu'un agrégat.
function findBestClutch(matches, name, tag) {
  let best = null;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.puuid || !me?.team) return;

    (match.rounds || []).forEach((round, roundIndex) => {
      const playerStats = round.player_stats || [];
      const teammates = playerStats.filter((ps) => ps.player_team === me.team).map((ps) => ps.player_puuid);
      if (!teammates.includes(me.puuid)) return;

      const allKills = [];
      playerStats.forEach((ps) => (ps.kill_events || []).forEach((k) => allKills.push(k)));
      allKills.sort((a, b) => a.kill_time_in_round - b.kill_time_in_round);

      const aliveTeammates = new Set(teammates);
      const aliveEnemies = new Set(playerStats.filter((ps) => ps.player_team !== me.team).map((ps) => ps.player_puuid));
      let maxEnemiesInClutch = 0;

      allKills.forEach((k) => {
        aliveTeammates.delete(k.victim_puuid);
        aliveEnemies.delete(k.victim_puuid);
        if (aliveTeammates.size === 1 && aliveTeammates.has(me.puuid) && aliveEnemies.size >= 1) {
          maxEnemiesInClutch = Math.max(maxEnemiesInClutch, aliveEnemies.size);
        }
      });

      if (maxEnemiesInClutch > 0 && round.winning_team === me.team) {
        if (!best || maxEnemiesInClutch > best.enemies) {
          best = { enemies: maxEnemiesInClutch, roundNumber: roundIndex + 1, agent: me.character, ...matchContext(match) };
        }
      }
    });
  });

  return best;
}

// Meilleur KDA sur un match : (kills + assists) / max(deaths, 1), complète le
// "meilleur K/D" déjà affiché ailleurs en valorisant aussi le soutien.
function findBestKda(matches, name, tag) {
  let best = null;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const kills = me.stats?.kills ?? 0;
    const deaths = me.stats?.deaths ?? 0;
    const assists = me.stats?.assists ?? 0;
    const kda = (kills + assists) / Math.max(deaths, 1);
    if (!best || kda > best.kda) {
      best = { kda, kills, deaths, assists, agent: me.character, ...matchContext(match) };
    }
  });

  return best;
}

// Meilleure précision tête sur un match (au moins un tir enregistré).
function findBestHsPercent(matches, name, tag) {
  let best = null;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const { hsPercent, headshots, bodyshots, legshots } = hitStats(me);
    if (hsPercent === null || headshots + bodyshots + legshots < 5) return;
    if (!best || hsPercent > best.hsPercent) {
      best = { hsPercent, agent: me.character, ...matchContext(match) };
    }
  });

  return best;
}

// Match avec le plus de kills du joueur suivi.
function findBestKillsMatch(matches, name, tag) {
  let best = null;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const kills = me.stats?.kills ?? 0;
    if (!best || kills > best.kills) {
      best = { kills, agent: me.character, ...matchContext(match) };
    }
  });

  return best;
}

// Kill le plus lointain jamais enregistré (mêmes coordonnées/conversion que
// duelDistanceStats — voir killDistance() dans valorantStats.js).
function findBestKillDistance(matches, name, tag) {
  const fullName = `${name}#${tag}`.toLowerCase();
  let best = null;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    (match.rounds || []).forEach((round) => {
      (round.player_stats || []).forEach((ps) => {
        (ps.kill_events || []).forEach((k) => {
          if (k.killer_display_name?.toLowerCase() !== fullName) return;
          const distance = killDistance(k);
          if (distance === null) return;
          if (!best || distance > best.distance) {
            best = { distance, weapon: k.damage_weapon_name ?? null, agent: me.character, ...matchContext(match) };
          }
        });
      });
    });
  });

  return best;
}

// Nombre d'agents distincts joués (matchs classés/non-deathmatch).
function countAgentDiversity(matches, name, tag) {
  const agents = new Set();
  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (me?.character) agents.add(me.character);
  });
  return agents.size;
}

// Meilleur "match parfait" : victoire sans être mort une seule fois — on
// garde celui avec le plus de kills parmi ces occurrences.
function findBestPerfectMatch(matches, name, tag) {
  let best = null;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const deaths = me.stats?.deaths ?? 0;
    const kills = me.stats?.kills ?? 0;
    if (deaths !== 0 || kills === 0) return;
    if (resultLabel(match, me) !== 'Victoire') return;
    if (!best || kills > best.kills) {
      best = { kills, agent: me.character, ...matchContext(match) };
    }
  });

  return best;
}

// Compteurs "carrière" (cumulés sur tout l'historique en cache), pour des
// succès de progression sur le long terme plutôt que des records ponctuels.
function careerCounters(matches, name, tag) {
  const clean = excludeDeathmatch(matches);
  let totalKills = 0;
  let totalWins = 0;
  let totalPlaytimeSeconds = 0;
  const maps = new Set();
  const modes = new Set();
  const killsByAgent = new Map();
  const gamesByAgent = new Map();
  const killsByWeapon = new Map();
  let longestMatch = null;

  clean.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;

    totalKills += me.stats?.kills ?? 0;
    if (resultLabel(match, me) === 'Victoire') totalWins += 1;
    totalPlaytimeSeconds += match.metadata?.game_length ?? 0;
    if (match.metadata?.map) maps.add(match.metadata.map);
    if (match.metadata?.mode) modes.add(match.metadata.mode);

    if (me.character) {
      killsByAgent.set(me.character, (killsByAgent.get(me.character) || 0) + (me.stats?.kills ?? 0));
      gamesByAgent.set(me.character, (gamesByAgent.get(me.character) || 0) + 1);
    }

    weaponKillsFor(match, me.puuid).forEach((weapon) => {
      killsByWeapon.set(weapon, (killsByWeapon.get(weapon) || 0) + 1);
    });

    const rounds = match.rounds?.length ?? 0;
    if (rounds > 0 && (!longestMatch || rounds > longestMatch.rounds)) {
      longestMatch = { rounds, agent: me.character, ...matchContext(match) };
    }
  });

  const topByValue = (map) => {
    let bestKey = null;
    let bestValue = 0;
    map.forEach((value, key) => {
      if (value > bestValue) {
        bestValue = value;
        bestKey = key;
      }
    });
    return bestKey ? { key: bestKey, value: bestValue } : null;
  };

  const bestAgentKills = topByValue(killsByAgent);
  const bestAgentGames = topByValue(gamesByAgent);
  const bestWeaponKills = topByValue(killsByWeapon);

  return {
    totalMatches: clean.length,
    totalKills,
    totalWins,
    totalPlaytimeSeconds,
    mapsPlayedCount: maps.size,
    modesPlayedCount: modes.size,
    maxAgentKills: bestAgentKills && { agent: bestAgentKills.key, kills: bestAgentKills.value },
    maxAgentGames: bestAgentGames && { agent: bestAgentGames.key, games: bestAgentGames.value },
    maxWeaponKills: bestWeaponKills && { weapon: bestWeaponKills.key, kills: bestWeaponKills.value },
    longestMatch,
  };
}

// Nombre de spikes posés / désamorcés par le joueur suivi — plant_events et
// defuse_events n'existent que sur le round où l'action a eu lieu (sinon les
// champs sont null), pas besoin de reconstruire quoi que ce soit.
function countSpikeActions(matches, name, tag) {
  const fullName = `${name}#${tag}`.toLowerCase();
  let plants = 0;
  let defuses = 0;

  excludeDeathmatch(matches).forEach((match) => {
    (match.rounds || []).forEach((round) => {
      if (round.plant_events?.planted_by?.display_name?.toLowerCase() === fullName) plants += 1;
      if (round.defuse_events?.defused_by?.display_name?.toLowerCase() === fullName) defuses += 1;
    });
  });

  return { plants, defuses };
}

export function computeHallOfFame(matches, name, tag) {
  const career = careerCounters(matches, name, tag);
  const spikeActions = countSpikeActions(matches, name, tag);
  const clutch = clutchStats(matches, name, tag);
  const firstBlood = firstBloodStats(matches, name, tag);
  const duelStats = duelDistanceStats(matches, name, tag);

  return {
    bestAce: findBestAce(matches, name, tag),
    longestWinStreak: findLongestWinStreak(matches, name, tag),
    bestClutch: findBestClutch(matches, name, tag),
    bestKda: findBestKda(matches, name, tag),
    bestHsPercent: findBestHsPercent(matches, name, tag),
    bestKillsMatch: findBestKillsMatch(matches, name, tag),
    bestKillDistance: findBestKillDistance(matches, name, tag),
    agentDiversity: countAgentDiversity(matches, name, tag),
    bestPerfectMatch: findBestPerfectMatch(matches, name, tag),
    careerHsPercent: overallHsPercent(matches, name, tag),
    totalClutchWins: clutch.wins,
    totalFirstBloods: firstBlood.firstBloods,
    totalPlants: spikeActions.plants,
    totalDefuses: spikeActions.defuses,
    longRangeDuels: duelStats.rows.find((r) => r.id === 'long') ?? null,
    veryLongRangeDuels: duelStats.rows.find((r) => r.id === 'verylong') ?? null,
    ...career,
  };
}
