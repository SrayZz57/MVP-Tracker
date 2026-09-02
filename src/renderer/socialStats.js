import { excludeDeathmatch, findMe, resultLabel, normalizeRiotIdPart } from './valorantStats.js';

const MIN_GAMES_TOGETHER = 2;
const MIN_GAMES_FACED = 2;
const MIN_DUELS_VS_AGENT = 5;

export function computeTeammateSynergy(matches, name, tag) {
  const stats = new Map();

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.puuid || !me?.team) return;

    const label = resultLabel(match, me);
    if (label !== 'Victoire' && label !== 'Défaite') return;

    const kills = me.stats?.kills ?? 0;
    const deaths = me.stats?.deaths ?? 0;
    const assists = me.stats?.assists ?? 0;

    (match.players?.all_players || [])
      .filter((p) => p.team === me.team && p.puuid !== me.puuid)
      .forEach((teammate) => {
        if (!stats.has(teammate.puuid)) {
          stats.set(teammate.puuid, {
            puuid: teammate.puuid,
            name: teammate.name,
            tag: teammate.tag,
            games: 0,
            wins: 0,
            kills: 0,
            deaths: 0,
            assists: 0,
          });
        }
        const s = stats.get(teammate.puuid);
        s.games += 1;
        if (label === 'Victoire') s.wins += 1;
        s.kills += kills;
        s.deaths += deaths;
        s.assists += assists;
      });
  });

  return [...stats.values()]
    .filter((s) => s.games >= MIN_GAMES_TOGETHER)
    .map((s) => ({
      ...s,
      winrate: (s.wins / s.games) * 100,
      kd: s.deaths > 0 ? s.kills / s.deaths : s.kills,
    }))
    .sort((a, b) => b.winrate - a.winrate);
}

function computeAgentNemesis(matches, name, tag) {
  const fullName = normalizeRiotIdPart(`${name}#${tag}`);
  const stats = new Map();

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.puuid) return;
    const characterByPuuid = new Map((match.players?.all_players || []).map((p) => [p.puuid, p.character]));

    (match.rounds || []).forEach((round) => {
      (round.player_stats || []).forEach((ps) => {
        (ps.kill_events || []).forEach((k) => {
          const isMyKill = normalizeRiotIdPart(k.killer_display_name) === fullName;
          const isMyDeath = normalizeRiotIdPart(k.victim_display_name) === fullName;
          if (!isMyKill && !isMyDeath) return;

          const enemyPuuid = isMyKill ? k.victim_puuid : k.killer_puuid;
          const agent = characterByPuuid.get(enemyPuuid);
          if (!agent) return;

          if (!stats.has(agent)) stats.set(agent, { agent, kills: 0, deaths: 0 });
          const s = stats.get(agent);
          if (isMyKill) s.kills += 1;
          else s.deaths += 1;
        });
      });
    });
  });

  return [...stats.values()]
    .filter((s) => s.kills + s.deaths >= MIN_DUELS_VS_AGENT)
    .map((s) => ({ ...s, kd: s.deaths > 0 ? s.kills / s.deaths : s.kills }))
    .sort((a, b) => a.kd - b.kd);
}

function computePlayerNemesis(matches, name, tag) {
  const stats = new Map();

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me?.puuid || !me?.team) return;

    const label = resultLabel(match, me);
    if (label !== 'Victoire' && label !== 'Défaite') return;

    (match.players?.all_players || [])
      .filter((p) => p.team !== me.team)
      .forEach((enemy) => {
        if (!stats.has(enemy.puuid)) {
          stats.set(enemy.puuid, { puuid: enemy.puuid, name: enemy.name, tag: enemy.tag, games: 0, wins: 0 });
        }
        const s = stats.get(enemy.puuid);
        s.games += 1;
        if (label === 'Victoire') s.wins += 1;
      });
  });

  return [...stats.values()]
    .filter((s) => s.games >= MIN_GAMES_FACED)
    .map((s) => ({ ...s, winrate: (s.wins / s.games) * 100 }))
    .sort((a, b) => a.winrate - b.winrate);
}

export function computeNemesis(matches, name, tag) {
  return {
    agents: computeAgentNemesis(matches, name, tag),
    players: computePlayerNemesis(matches, name, tag),
  };
}
