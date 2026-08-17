import { excludeDeathmatch, findMe, resultLabel } from './valorantStats.js';

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
      const kills = myPs?.kill_events?.length ?? 0;
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

export function computeHallOfFame(matches, name, tag) {
  return {
    bestAce: findBestAce(matches, name, tag),
    longestWinStreak: findLongestWinStreak(matches, name, tag),
    bestClutch: findBestClutch(matches, name, tag),
    bestKda: findBestKda(matches, name, tag),
  };
}
