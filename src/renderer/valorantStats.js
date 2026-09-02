export function excludeDeathmatch(matches) {
  return matches.filter(
    (m) =>
      m.metadata?.mode_id !== 'deathmatch' &&
      m.metadata?.mode_id !== 'custom' &&
      m.metadata?.mode_id !== '' &&
      m.metadata?.mode_id !== 'ggteam',
  );
}

const DIACRITICS_RE = new RegExp('[' + String.fromCharCode(768) + '-' + String.fromCharCode(879) + ']', 'g');

export function normalizeRiotIdPart(value) {
  return (value ?? '')
    .trim()
    .normalize('NFD')
    .replace(DIACRITICS_RE, '')
    .toLowerCase();
}

export function findMe(match, name, tag) {
  const players = match?.players?.all_players || [];
  const targetName = normalizeRiotIdPart(name);
  const targetTag = normalizeRiotIdPart(tag);
  return players.find(
    (p) => normalizeRiotIdPart(p.name) === targetName && normalizeRiotIdPart(p.tag) === targetTag,
  );
}

export function deathLocationsOnMap(matches, name, tag, mapName, mode = 'deaths') {
  const fullName = normalizeRiotIdPart(`${name}#${tag}`);
  const points = [];

  matches
    .filter((m) => m.metadata?.map === mapName)
    .forEach((match) => {
      const me = findMe(match, name, tag);
      if (!me?.team) return;
      const attackerByRound = attackerTeamByRound(match);

      (match.rounds || []).forEach((round, roundIndex) => {
        const attackerTeam = attackerByRound[roundIndex];
        const side = attackerTeam === null ? null : attackerTeam === me.team ? 'attack' : 'defense';
        const myRoundStats = (round.player_stats || []).find((p) => p.player_puuid === me.puuid);
        const myWeaponId = myRoundStats?.economy?.weapon?.id ?? null;

        (round.player_stats || []).forEach((ps) => {
          (ps.kill_events || []).forEach((k) => {
            const relevant =
              mode === 'kills'
                ? normalizeRiotIdPart(k.killer_display_name) === fullName
                : normalizeRiotIdPart(k.victim_display_name) === fullName;
            if (relevant && k.victim_death_location) {
              points.push({
                ...k.victim_death_location,
                side,
                weapon: k.damage_weapon_name ?? null,
                roundIndex,
                myWeaponId,
              });
            }
          });
        });
      });
    });

  return points;
}

const DEATH_TIMING_BUCKETS = [
  { id: 'early', label: 'Entrée (0-20s)', max: 20000 },
  { id: 'mid', label: 'Milieu de round (20-60s)', max: 60000 },
  { id: 'late', label: 'Fin de round (60s+)', max: Infinity },
];

export function deathTimingStats(matches, name, tag) {
  const fullName = normalizeRiotIdPart(`${name}#${tag}`);
  const counts = { early: 0, mid: 0, late: 0 };
  let total = 0;

  excludeDeathmatch(matches).forEach((match) => {
    (match.rounds || []).forEach((round) => {
      (round.player_stats || []).forEach((ps) => {
        (ps.kill_events || []).forEach((k) => {
          if (normalizeRiotIdPart(k.victim_display_name) !== fullName) return;
          total += 1;
          const bucket = DEATH_TIMING_BUCKETS.find((b) => k.kill_time_in_round < b.max);
          counts[bucket.id] += 1;
        });
      });
    });
  });

  return {
    total,
    buckets: DEATH_TIMING_BUCKETS.map((b) => ({
      id: b.id,
      label: b.label,
      count: counts[b.id],
      percent: total > 0 ? (counts[b.id] / total) * 100 : null,
    })),
  };
}

export function clutchStats(matches, name, tag) {
  let attempts = 0;
  let wins = 0;

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.puuid || !me?.team) return;

    (match.rounds || []).forEach((round) => {
      const playerStats = round.player_stats || [];
      const teammates = playerStats.filter((ps) => ps.player_team === me.team).map((ps) => ps.player_puuid);
      if (!teammates.includes(me.puuid)) return;

      const allKills = [];
      playerStats.forEach((ps) => (ps.kill_events || []).forEach((k) => allKills.push(k)));
      allKills.sort((a, b) => a.kill_time_in_round - b.kill_time_in_round);

      const aliveTeammates = new Set(teammates);
      const aliveEnemies = new Set(playerStats.filter((ps) => ps.player_team !== me.team).map((ps) => ps.player_puuid));
      let wasClutch = false;

      allKills.forEach((k) => {
        aliveTeammates.delete(k.victim_puuid);
        aliveEnemies.delete(k.victim_puuid);
        if (!wasClutch && aliveTeammates.size === 1 && aliveTeammates.has(me.puuid) && aliveEnemies.size >= 1) {
          wasClutch = true;
        }
      });

      if (wasClutch) {
        attempts += 1;
        if (round.winning_team === me.team) wins += 1;
      }
    });
  });

  return { attempts, wins, winrate: attempts > 0 ? (wins / attempts) * 100 : null };
}

export function firstBloodStats(matches, name, tag) {
  const fullName = normalizeRiotIdPart(`${name}#${tag}`);
  let firstBloods = 0;
  let firstDeaths = 0;
  let roundsWithKills = 0;

  excludeDeathmatch(matches).forEach((match) => {
    (match.rounds || []).forEach((round) => {
      const allKills = [];
      (round.player_stats || []).forEach((ps) => (ps.kill_events || []).forEach((k) => allKills.push(k)));
      if (allKills.length === 0) return;

      allKills.sort((a, b) => a.kill_time_in_round - b.kill_time_in_round);
      const first = allKills[0];
      roundsWithKills += 1;
      if (normalizeRiotIdPart(first.killer_display_name) === fullName) firstBloods += 1;
      else if (normalizeRiotIdPart(first.victim_display_name) === fullName) firstDeaths += 1;
    });
  });

  const involved = firstBloods + firstDeaths;
  return { firstBloods, firstDeaths, roundsWithKills, ratio: involved > 0 ? (firstBloods / involved) * 100 : null };
}

export function tiltFrequency(matches, name, tag) {
  const chronological = [...excludeDeathmatch(matches)].reverse();
  const results = chronological
    .map((match) => {
      const me = findMe(match, name, tag);
      return me ? resultLabel(match, me) : null;
    })
    .filter(Boolean);

  if (results.length === 0) return { total: 0, tiltedCount: 0, percent: null };

  let tiltedCount = 0;
  let streak = 0;
  results.forEach((label) => {
    if (label === 'Défaite') {
      streak += 1;
      if (streak >= 3) tiltedCount += 1;
    } else {
      streak = 0;
    }
  });

  return { total: results.length, tiltedCount, percent: (tiltedCount / results.length) * 100 };
}

const UNITS_PER_METER = 100;

const DISTANCE_BUCKETS = [
  { id: 'close', label: 'Courte (< 8m)', max: 8 },
  { id: 'mid', label: 'Moyenne (8-20m)', max: 20 },
  { id: 'long', label: 'Longue (20-35m)', max: 35 },
  { id: 'verylong', label: 'Très longue (35m+)', max: Infinity },
];

export function killDistance(k) {
  const killerLocation = k.player_locations_on_kill?.find((p) => p.player_puuid === k.killer_puuid)?.location;
  if (!killerLocation || !k.victim_death_location) return null;
  const dx = killerLocation.x - k.victim_death_location.x;
  const dy = killerLocation.y - k.victim_death_location.y;
  return Math.sqrt(dx * dx + dy * dy) / UNITS_PER_METER;
}

export function duelDistanceStats(matches, name, tag) {
  const fullName = normalizeRiotIdPart(`${name}#${tag}`);
  const buckets = {};
  DISTANCE_BUCKETS.forEach((b) => { buckets[b.id] = { kills: 0, deaths: 0 }; });

  const killDistances = [];
  const deathDistances = [];

  excludeDeathmatch(matches).forEach((match) => {
    (match.rounds || []).forEach((round) => {
      (round.player_stats || []).forEach((ps) => {
        (ps.kill_events || []).forEach((k) => {
          const isMyKill = normalizeRiotIdPart(k.killer_display_name) === fullName;
          const isMyDeath = normalizeRiotIdPart(k.victim_display_name) === fullName;
          if (!isMyKill && !isMyDeath) return;

          const distance = killDistance(k);
          if (distance === null) return;

          const bucket = DISTANCE_BUCKETS.find((b) => distance < b.max);
          if (isMyKill) {
            buckets[bucket.id].kills += 1;
            killDistances.push(distance);
          }
          if (isMyDeath) {
            buckets[bucket.id].deaths += 1;
            deathDistances.push(distance);
          }
        });
      });
    });
  });

  const average = (arr) => (arr.length > 0 ? arr.reduce((sum, v) => sum + v, 0) / arr.length : null);

  const rows = DISTANCE_BUCKETS.map((b) => {
    const { kills, deaths } = buckets[b.id];
    const total = kills + deaths;
    return { id: b.id, label: b.label, kills, deaths, total, winrate: total > 0 ? (kills / total) * 100 : null };
  });

  const withEnoughDuels = rows.filter((r) => r.total >= 3);
  const closest = withEnoughDuels[0] ?? null;
  const farthest = withEnoughDuels.length > 0 ? withEnoughDuels[withEnoughDuels.length - 1] : null;
  const dropOff =
    closest && farthest && closest.id !== farthest.id ? closest.winrate - farthest.winrate : null;

  return {
    rows,
    avgKillDistance: average(killDistances),
    avgDeathDistance: average(deathDistances),
    dropOff,
  };
}

export const ECONOMY_TIERS = [
  { id: 'eco', label: 'Éco', max: 2000 },
  { id: 'semi', label: 'Semi-buy', max: 3900 },
  { id: 'full', label: 'Full buy', max: Infinity },
];

export function economyImpactStats(matches, name, tag) {
  const fullName = normalizeRiotIdPart(`${name}#${tag}`);
  const buckets = { eco: { rounds: 0, wins: 0 }, semi: { rounds: 0, wins: 0 }, full: { rounds: 0, wins: 0 } };

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.team) return;

    (match.rounds || []).forEach((round) => {
      const ps = (round.player_stats || []).find((p) => normalizeRiotIdPart(p.player_display_name) === fullName);
      const loadoutValue = ps?.economy?.loadout_value;
      if (loadoutValue === undefined) return;

      const tier = ECONOMY_TIERS.find((t) => loadoutValue < t.max);
      buckets[tier.id].rounds += 1;
      if (round.winning_team === me.team) buckets[tier.id].wins += 1;
    });
  });

  return ECONOMY_TIERS.map((t) => ({
    id: t.id,
    label: t.label,
    rounds: buckets[t.id].rounds,
    winrate: buckets[t.id].rounds > 0 ? (buckets[t.id].wins / buckets[t.id].rounds) * 100 : null,
  }));
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

const RESULT_LABEL_KEYS = {
  Victoire: 'result.win',
  Défaite: 'result.loss',
  'Match nul': 'result.draw',
  'Sans équipe': 'result.noTeam',
};

export function resultLabelKey(label) {
  return RESULT_LABEL_KEYS[label] ?? null;
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

export function weaponDetailStats(matches, name, tag, weaponName) {
  const fullName = normalizeRiotIdPart(`${name}#${tag}`);
  let totalKills = 0;
  const byMap = new Map();
  const byAgent = new Map();
  const distances = [];

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    (match.kills || []).forEach((k) => {
      if (normalizeRiotIdPart(k.killer_display_name) !== fullName || k.damage_weapon_name !== weaponName) return;
      totalKills += 1;
      byMap.set(match.metadata?.map ?? '?', (byMap.get(match.metadata?.map ?? '?') || 0) + 1);
      const agent = me?.character ?? '?';
      byAgent.set(agent, (byAgent.get(agent) || 0) + 1);
      const distance = killDistance(k);
      if (distance !== null) distances.push(distance);
    });
  });

  return {
    totalKills,
    avgDistance: distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : null,
    byMap: [...byMap.entries()].sort((a, b) => b[1] - a[1]),
    byAgent: [...byAgent.entries()].sort((a, b) => b[1] - a[1]),
  };
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

export function attackerTeamByRound(match) {
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

  return attackerByRound;
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
      const attackerByRound = attackerTeamByRound(match);

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

const DAY_LABEL_KEYS = {
  Lundi: 'days.monday',
  Mardi: 'days.tuesday',
  Mercredi: 'days.wednesday',
  Jeudi: 'days.thursday',
  Vendredi: 'days.friday',
  Samedi: 'days.saturday',
  Dimanche: 'days.sunday',
};

export function dayLabelKey(day) {
  return DAY_LABEL_KEYS[day] ?? null;
}

export function overallHsPercent(matches, name, tag) {
  let headshots = 0;
  let total = 0;
  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const hs = hitStats(me);
    headshots += hs.headshots;
    total += hs.headshots + hs.bodyshots + hs.legshots;
  });
  return total > 0 ? (headshots / total) * 100 : null;
}

export function overallWinrate(matches, name, tag) {
  let wins = 0;
  let decided = 0;
  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const label = resultLabel(match, me);
    if (label === 'Victoire' || label === 'Défaite') {
      decided += 1;
      if (label === 'Victoire') wins += 1;
    }
  });
  return decided > 0 ? (wins / decided) * 100 : null;
}

function startOfCurrentWeek() {
  const now = new Date();
  const day = now.getDay();
  const diffToMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diffToMonday);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export function lastCompletedWeekStart() {
  const thisMonday = startOfCurrentWeek().getTime();
  return new Date(thisMonday - 7 * 24 * 60 * 60 * 1000);
}

export function weekStartKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function matchesInWeek(matches, weekStart) {
  const start = weekStart.getTime();
  const end = start + 7 * 24 * 60 * 60 * 1000;
  return matches.filter((match) => {
    const gameStart = match?.metadata?.game_start;
    if (!gameStart) return false;
    const ts = gameStart * 1000;
    return ts >= start && ts < end;
  });
}

export function matchesInCurrentWeek(matches) {
  return matchesInWeek(matches, lastCompletedWeekStart());
}

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
