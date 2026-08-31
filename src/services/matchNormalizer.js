// Traduit un match au format v4 de HenrikDev (seul format qui gère
// correctement les comptes console, v3 renvoie silencieusement 0 résultat
// pour eux, vérifié en conditions réelles) vers exactement la même forme que
// l'ancien format v3 déjà utilisé partout ailleurs dans l'app (Stats,
// Heatmap, Analyse tactique, Tilt, Hall of Fame, corrélation Aim Trainer...).
//
// Le but : que RIEN d'autre dans le code n'ait besoin de changer. Cette
// fonction est le seul endroit qui connaît la différence entre les deux
// formats.
//
// Champs volontairement absents de v4 et non reconstruits (jamais lus nulle
// part dans l'app, vérifié par recherche exhaustive du code) : les URLs
// d'assets (cartes/agents/armes, l'app les résout elle-même via
// valorant-api.com), le détail des dégâts encaissés par round, l'économie
// "spent" par round (approximée par loadout_value, voir plus bas).

function playerName(p) {
  return p ? `${p.name}#${p.tag}` : null;
}

// HenrikDev renvoie `weapon.id` mais pas `weapon.name` pour les "armes" qui
// sont en réalité des compétences équipables, le pistolet Headhunter et
// l'ult Tour De Force de Chamber, car elles n'existent pas dans son
// catalogue d'armes achetables. Sans ce repli, `damage_weapon_name` était
// vide et ces kills disparaissaient purement et simplement des stats par
// arme (filtrées par `weaponKillsFor` et consorts, qui exigent un nom non
// vide). IDs confirmés en croisant leur fréquence d'apparition sur tout
// l'historique local en cache : Headhunter revient plusieurs fois par
// partie (arme secondaire réutilisable), Tour De Force beaucoup plus
// rarement (dépend de la charge d'ult), cohérent avec leur rôle respectif.
export const ABILITY_WEAPON_NAMES = {
  '856d9a7e-4b06-dc37-15dc-9d809c37cb90': 'Headhunter',
  '39099fb5-4293-def4-1e09-2e9080ce7456': 'Tour De Force',
};

function normalizeKillEvent(k) {
  return {
    kill_time_in_round: k.time_in_round_in_ms,
    kill_time_in_match: k.time_in_match_in_ms,
    killer_puuid: k.killer?.puuid ?? null,
    killer_display_name: playerName(k.killer),
    killer_team: k.killer?.team ?? null,
    victim_puuid: k.victim?.puuid ?? null,
    victim_display_name: playerName(k.victim),
    victim_team: k.victim?.team ?? null,
    victim_death_location: k.location ?? null,
    damage_weapon_id: k.weapon?.id ?? null,
    damage_weapon_name: k.weapon?.name ?? ABILITY_WEAPON_NAMES[k.weapon?.id] ?? null,
    secondary_fire_mode: k.secondary_fire_mode ?? false,
    player_locations_on_kill: (k.player_locations ?? []).map((pl) => ({
      player_puuid: pl.player?.puuid ?? null,
      player_display_name: playerName(pl.player),
      player_team: pl.player?.team ?? null,
      location: pl.location,
      view_radians: pl.view_radians,
    })),
    assistants: k.assistants ?? [],
  };
}

function normalizePlayer(p) {
  return {
    puuid: p.puuid,
    name: p.name,
    tag: p.tag,
    team: p.team_id,
    level: p.account_level,
    character: p.agent?.name ?? null,
    currenttier: p.tier?.id ?? null,
    currenttier_patched: p.tier?.name ?? null,
    party_id: p.party_id,
    // Trois compteurs (kills/deaths/assists/headshots/bodyshots/legshots/score)
    // déjà nommés à l'identique entre v3 et v4, aucune traduction requise.
    stats: p.stats,
    ability_casts: p.ability_casts,
    behavior: p.behavior,
    economy: p.economy,
  };
}

function normalizeRoundStat(s, killsThisRound) {
  return {
    ability_casts: s.ability_casts,
    player_puuid: s.player?.puuid ?? null,
    player_display_name: playerName(s.player),
    player_team: s.player?.team ?? null,
    damage_events: s.damage_events,
    damage: (s.damage_events ?? []).reduce((sum, d) => sum + (d.damage ?? 0), 0),
    headshots: s.stats?.headshots ?? 0,
    bodyshots: s.stats?.bodyshots ?? 0,
    legshots: s.stats?.legshots ?? 0,
    kill_events: killsThisRound.filter((k) => k.killer?.puuid === s.player?.puuid).map(normalizeKillEvent),
    kills: s.stats?.kills ?? 0,
    score: s.stats?.score ?? 0,
    economy: s.economy
      ? {
          loadout_value: s.economy.loadout_value,
          remaining: s.economy.remaining,
          // v4 ne renvoie pas "spent" au niveau du round (seulement
          // loadout_value/remaining), loadout_value reste la meilleure
          // approximation disponible plutôt que 0, qui fausserait le calcul
          // du budget total dans le simulateur d'achat.
          spent: s.economy.loadout_value,
          weapon: s.economy.weapon,
          armor: s.economy.armor,
        }
      : null,
    was_afk: s.was_afk,
    was_penalized: s.received_penalty,
    stayed_in_spawn: s.stayed_in_spawn,
  };
}

function normalizeRound(round, allKills) {
  const killsThisRound = allKills.filter((k) => k.round === round.id);
  return {
    winning_team: round.winning_team,
    end_type: round.result === '' ? 'Round timer expired' : round.result,
    bomb_planted: !!round.plant,
    bomb_defused: !!round.defuse,
    plant_events: round.plant
      ? {
          plant_location: round.plant.location,
          planted_by: {
            puuid: round.plant.player?.puuid ?? null,
            display_name: playerName(round.plant.player),
            team: round.plant.player?.team ?? null,
          },
          plant_site: round.plant.site,
          plant_time_in_round: round.plant.round_time_in_ms,
          player_locations_on_plant: (round.plant.player_locations ?? []).map((pl) => ({
            player_puuid: pl.player?.puuid ?? null,
            player_display_name: playerName(pl.player),
            player_team: pl.player?.team ?? null,
            location: pl.location,
            view_radians: pl.view_radians,
          })),
        }
      : null,
    defuse_events: round.defuse
      ? {
          defuse_location: round.defuse.location,
          defused_by: {
            puuid: round.defuse.player?.puuid ?? null,
            display_name: playerName(round.defuse.player),
            team: round.defuse.player?.team ?? null,
          },
          defuse_time_in_round: round.defuse.round_time_in_ms,
        }
      : null,
    player_stats: (round.stats ?? []).map((s) => normalizeRoundStat(s, killsThisRound)),
  };
}

function normalizeTeams(teams) {
  const out = {};
  (teams ?? []).forEach((t) => {
    const key = String(t.team_id ?? '').toLowerCase();
    if (!key) return;
    out[key] = { has_won: t.won, rounds_won: t.rounds?.won ?? 0, rounds_lost: t.rounds?.lost ?? 0, roster: null };
  });
  return out;
}

export function normalizeV4Match(m) {
  const allPlayers = (m.players ?? []).map(normalizePlayer);
  const allKills = m.kills ?? [];

  return {
    metadata: {
      map: m.metadata.map?.name ?? null,
      game_version: m.metadata.game_version,
      game_length: Math.round((m.metadata.game_length_in_ms ?? 0) / 1000),
      game_start: Math.round(new Date(m.metadata.started_at).getTime() / 1000),
      game_start_patched: m.metadata.started_at,
      rounds_played: (m.rounds ?? []).length,
      mode: m.metadata.queue?.name ?? null,
      mode_id: (m.metadata.queue?.id ?? '').replace(/^console_/, ''),
      queue: m.metadata.queue?.mode_type ?? null,
      season_id: m.metadata.season?.id ?? null,
      platform: m.metadata.platform,
      matchid: m.metadata.match_id,
      premier_info: { tournament_id: null, matchup_id: null },
      region: m.metadata.region,
      cluster: m.metadata.cluster,
    },
    players: {
      all_players: allPlayers,
      red: allPlayers.filter((p) => p.team === 'Red'),
      blue: allPlayers.filter((p) => p.team === 'Blue'),
    },
    observers: m.observers ?? [],
    coaches: m.coaches ?? [],
    teams: normalizeTeams(m.teams),
    rounds: (m.rounds ?? []).map((r) => normalizeRound(r, allKills)),
    kills: allKills.map(normalizeKillEvent),
  };
}
