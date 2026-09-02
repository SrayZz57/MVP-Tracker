// Historique de matchs fabriqué, à la forme exacte que produit
// src/services/matchNormalizer.js — donc celle que consomment Stats, Heatmap,
// Analyse, Graphiques, Perf & Forme, Tilt, Coéquipiers et Hall of Fame.
//
// Sert aux captures du site vitrine : les vrais composants sont montés avec ce
// jeu de données, ce qui donne un rendu exact au pixel près sans compte Riot ni
// historique réel, et sans exposer les données d'un joueur sur un site public.
//
// Tirage déterministe : la même graine redonne exactement les mêmes captures.

import MAP_POINTS from './map-points.json' with { type: 'json' };

const SEED = 20260902;

function makeRng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const rng = makeRng(SEED);
const pick = (arr) => arr[Math.floor(rng() * arr.length)];
const int = (min, max) => min + Math.floor(rng() * (max - min + 1));

export const ME = { name: 'Vyn', tag: '4021', puuid: 'me-0000-0000-0000' };

const MAPS = ['Ascent', 'Bind', 'Haven', 'Lotus', 'Sunset', 'Split', 'Icebox'];

// Agents joués, avec le rôle que l'app leur reconnaît : un profil crédible de
// joueur flexible plutôt qu'un one-trick, pour que le Profil ADN ait matière.
const MY_AGENTS = ['Jett', 'Raze', 'Omen', 'Sage', 'Chamber', 'Neon'];
const OTHER_AGENTS = ['Sova', 'Killjoy', 'Viper', 'Phoenix', 'Reyna', 'Cypher',
  'Breach', 'Skye', 'Astra', 'Fade', 'Harbor', 'Gekko'];

const WEAPONS = [
  { id: '9c82e19d-4575-0200-1a81-3eacf00cf872', name: 'Vandal', w: 40 },
  { id: 'ee8e8d15-496b-07ac-e5f6-8fae5d4c7b1a', name: 'Phantom', w: 26 },
  { id: '1baa85b4-4c70-1284-64bb-6481dfc3bb4e', name: 'Operator', w: 8 },
  { id: '29a0cfab-485b-f5d5-779a-b59f85e204a8', name: 'Classic', w: 8 },
  { id: '462080d1-4035-2937-7c09-27aa2a5c27a7', name: 'Spectre', w: 10 },
  { id: 'e336c6b8-418d-9340-d77f-7a9e4cfe0702', name: 'Sheriff', w: 5 },
  { id: 'ae3de142-4d85-2547-dd26-4e90bed35cf7', name: 'Bulldog', w: 3 },
];

function pickWeapon() {
  const total = WEAPONS.reduce((s, w) => s + w.w, 0);
  let r = rng() * total;
  for (const w of WEAPONS) {
    r -= w.w;
    if (r <= 0) return w;
  }
  return WEAPONS[0];
}

// Coordonnées monde d'une mort ou d'un kill, sur une map donnée.
//
// Un tirage geometrique (cercle, couronne) ne marche pas : chaque map a sa
// forme, et les points tombaient a cote, la heatmap montrait des morts dans
// le vide autour du plan. On part donc des pixels reellement dessines de la
// minimap, echantillonnes une fois par sample-maps.mjs, et on remonte aux
// coordonnees monde en inversant la formule de Riot :
//   fx = xMultiplier * world.y + xScalarToAdd
//   fy = yMultiplier * world.x + yScalarToAdd
function worldPoint(map) {
  const m = MAP_POINTS[map];
  if (!m || !m.points.length) return { x: 0, y: 0 };
  const [fx, fy] = m.points[Math.floor(rng() * m.points.length)];
  // Un peu de dispersion autour du pixel tire, sinon les points se rangent
  // sur la grille d'echantillonnage.
  const jitter = () => (rng() - 0.5) * 0.012;
  return {
    x: Math.round((fy + jitter() - m.yScalarToAdd) / m.yMultiplier),
    y: Math.round((fx + jitter() - m.xScalarToAdd) / m.xMultiplier),
  };
}

const TIERS = [
  { id: 21, name: 'Ascendant 1' }, { id: 22, name: 'Ascendant 2' },
  { id: 23, name: 'Ascendant 3' }, { id: 20, name: 'Diamant 3' },
  { id: 24, name: 'Immortel 1' }, { id: 19, name: 'Diamant 2' },
];

// Quelques joueurs reviennent d'un match à l'autre : sans ça, l'onglet
// Coéquipiers & Rivaux n'a personne à classer.
const REGULARS = [
  { name: 'Kaori', tag: '2277', puuid: 'reg-1' },
  { name: 'Malo', tag: 'EUW', puuid: 'reg-2' },
  { name: 'Nyx', tag: '0001', puuid: 'reg-3' },
  { name: 'Sable', tag: '9312', puuid: 'reg-4' },
];
const RIVALS = [
  { name: 'Orso', tag: '1120', puuid: 'riv-1' },
  { name: 'Tessa', tag: 'EUNE', puuid: 'riv-2' },
];

let anon = 0;
const randomPlayer = () => ({ name: `Joueur${++anon}`, tag: String(int(1000, 9999)), puuid: `anon-${anon}` });

function buildPlayer(identity, team, agent, stats) {
  const tier = pick(TIERS);
  return {
    puuid: identity.puuid,
    name: identity.name,
    tag: identity.tag,
    team,
    level: int(40, 320),
    character: agent,
    currenttier: tier.id,
    currenttier_patched: tier.name,
    party_id: null,
    stats,
    ability_casts: null,
    behavior: null,
    economy: null,
  };
}

function shotStats(kills) {
  // Autour de 23 % de précision tête, la moyenne d'un joueur de ce niveau.
  const shots = kills * int(4, 7) + int(10, 40);
  const headshots = Math.round(shots * (0.18 + rng() * 0.12));
  const legshots = Math.round(shots * (0.03 + rng() * 0.04));
  return { headshots, bodyshots: shots - headshots - legshots, legshots };
}

// Repartition des maps de la derniere semaine complete. Sept parties etalees
// sur sept maps donnent des winrates par map a une ou deux parties, d'ou un
// « meilleure map : 33 % » a cote d'un global a 57 % dans le Wrapped. Une
// semaine reelle tourne sur deux ou trois maps.
const LAST_WEEK_MAPS = ['Ascent', 'Ascent', 'Ascent', 'Split', 'Lotus', 'Split', 'Lotus'];

function buildMatch(index, now) {
  const map = index <= 6 ? LAST_WEEK_MAPS[index] : pick(MAPS);
  const mode = rng() < 0.78 ? 'competitive' : 'unrated';

  // Etalé sur six semaines en remontant depuis la fin de la derniere semaine
  // complete, avec une majorite de sessions le soir : c'est ce qui donne de la
  // matiere a Perf & Forme et aux Graphiques (grille jour x creneau horaire).
  //
  // L'ancrage sur la derniere semaine complete n'est pas cosmetique : le
  // Wrapped ne regarde que cette fenetre-la. Une date de reference figee
  // donnait une carte vide des que les captures etaient regenerees un mois
  // plus tard.
  const daysAgo = Math.floor((index / 40) * 42);
  const evening = rng() < 0.72;
  const hour = evening ? int(19, 23) : int(11, 17);
  const start = new Date(now);
  start.setDate(start.getDate() - daysAgo);
  start.setHours(hour, int(0, 59), 0, 0);

  const myTeam = rng() < 0.5 ? 'Red' : 'Blue';
  const enemyTeam = myTeam === 'Red' ? 'Blue' : 'Red';

  // Serie de defaites volontaire autour des matchs 12 a 16 : l'onglet Tilt et
  // la detection de serie n'ont rien a montrer sur un historique lisse.
  // La serie de defaites est placee hors de la derniere semaine complete :
  // c'est la fenetre que montre le Wrapped, et elle doit se lire comme une
  // bonne semaine ordinaire, pas comme une descente aux enfers.
  const slump = index >= 20 && index <= 24;
  // Les sept matchs de la derniere semaine complete (index 0 a 6) sont fixes
  // a quatre victoires pour trois defaites : ni 100 % qui sonne truque, ni
  // 14 % qui donne une carte deprimante avec une « meilleure map » a 0 %.
  const lastWeek = index <= 6;
  const won = slump ? false : lastWeek ? ![1, 3, 5].includes(index) : rng() < 0.56;

  const myRounds = won ? 13 : int(4, 11);
  const theirRounds = won ? int(4, 11) : 13;
  const roundsPlayed = myRounds + theirRounds;

  const myKills = slump ? int(9, 15) : int(13, 27);
  const myDeaths = slump ? int(17, 22) : int(11, 19);
  const myAssists = int(2, 9);

  const teamIdentities = [ME, ...[...REGULARS].sort(() => rng() - 0.5).slice(0, int(1, 3))];
  while (teamIdentities.length < 5) teamIdentities.push(randomPlayer());
  const enemyIdentities = [...RIVALS.filter(() => rng() < 0.45)];
  while (enemyIdentities.length < 5) enemyIdentities.push(randomPlayer());

  const agentPool = [...OTHER_AGENTS].sort(() => rng() - 0.5);
  const myAgent = pick(MY_AGENTS);

  const players = [];
  teamIdentities.forEach((id, i) => {
    const isMe = id.puuid === ME.puuid;
    const k = isMe ? myKills : int(8, 22);
    const d = isMe ? myDeaths : int(10, 20);
    players.push(buildPlayer(id, myTeam, isMe ? myAgent : agentPool[i], {
      kills: k, deaths: d, assists: isMe ? myAssists : int(2, 10),
      score: k * int(180, 260), ...shotStats(k),
    }));
  });
  enemyIdentities.forEach((id, i) => {
    const k = int(8, 24);
    players.push(buildPlayer(id, enemyTeam, agentPool[i + 5], {
      kills: k, deaths: int(10, 20), assists: int(2, 10),
      score: k * int(180, 260), ...shotStats(k),
    }));
  });

  const me = players.find((p) => p.puuid === ME.puuid);
  const displayName = (p) => `${p.name}#${p.tag}`;

  // Répartition des kills du joueur suivi sur les rounds, plus ses morts,
  // chacun avec une position monde : c'est ce que lit la Heatmap.
  const rounds = [];
  const allKills = [];
  let killsLeft = myKills;
  let deathsLeft = myDeaths;

  for (let r = 0; r < roundsPlayed; r += 1) {
    const roundWonByMe = r < myRounds ? rng() < 0.62 : rng() < 0.38;
    const remaining = roundsPlayed - r;
    // Un ace et quelques multikills places explicitement : un tirage a un ou
    // deux kills par round ne produit jamais de round a cinq, et le Hall of
    // Fame affichait « Meilleur ace : pas encore debloque » sur la page qui
    // vend justement la detection automatique des records.
    const aceRound = index === 8 && r === 6;
    const multiKill = (index === 3 && r === 4) || (index === 17 && r === 9) || (index === 26 && r === 2);
    const myKillsThisRound = aceRound
      ? 5
      : multiKill
        ? int(3, 4)
        : Math.min(killsLeft, rng() < killsLeft / remaining ? int(1, 2) : 0);
    const iDie = !aceRound && deathsLeft > 0 && rng() < deathsLeft / remaining;
    killsLeft -= myKillsThisRound;
    if (iDie) deathsLeft -= 1;

    const mates = players.filter((p) => p.team === myTeam && p.puuid !== me.puuid);
    const foes = players.filter((p) => p.team === enemyTeam);

    // L'échange du round : le camp perdant perd plus de monde que l'autre.
    // Assez d'adversaires a abattre pour que mes kills du round tiennent.
    const myTeamDeaths = aceRound ? int(2, 4) : roundWonByMe ? int(0, 3) : int(3, 5);
    const foeDeaths = Math.max(myKillsThisRound, roundWonByMe ? int(3, 5) : int(0, 3));

    const victims = [];
    const matePool = [...mates].sort(() => rng() - 0.5);
    const matesToKill = myTeamDeaths - (iDie ? 1 : 0);
    if (iDie) victims.push({ victim: me, byEnemy: true, isMyDeath: true });
    for (let i = 0; i < Math.max(0, matesToKill) && i < matePool.length; i += 1) {
      victims.push({ victim: matePool[i], byEnemy: true });
    }
    const foePool = [...foes].sort(() => rng() - 0.5);
    for (let i = 0; i < foeDeaths && i < foePool.length; i += 1) {
      victims.push({ victim: foePool[i], byEnemy: false, byMe: i < myKillsThisRound });
    }

    // Ordre d'abord aléatoire : en gardant l'ordre de construction, ma mort
    // ouvrait le round à chaque fois et le score d'agressivité, qui compare
    // premiers sangs et premières morts, tombait à 3 sur 100.
    victims.sort(() => rng() - 0.5);

    const first = (test) => {
      const i = victims.findIndex(test);
      if (i > 0) victims.unshift(victims.splice(i, 1)[0]);
      return i >= 0;
    };
    const last = (test) => {
      const i = victims.findIndex(test);
      if (i >= 0 && i < victims.length - 1) victims.push(victims.splice(i, 1)[0]);
    };

    // Clutch : je reste seul en vie de mon camp face à au moins un adversaire.
    // Il faut donc que mes coéquipiers tombent avant mon kill, qui passe en
    // dernier.
    // Pas de condition sur mes kills : l'app compte la tentative des que je
    // reste seul en vie face a un adversaire, meme sans avoir tue. La
    // restreindre laissait la majorite des clutchs hors du tirage de victoire,
    // d'ou un facteur a 12 au lieu du tiers attendu.
    const isClutch = !iDie && myTeamDeaths >= 3;
    if (isClutch) {
      last((v) => v.byMe);
    } else if (rng() < 0.36 && myKillsThisRound > 0) {
      first((v) => v.byMe);
    } else if (rng() < 0.4 && iDie) {
      first((v) => v.isMyDeath);
    }

    // Le sort du round se décide APRÈS : un clutch se gagne une fois sur trois,
    // sinon on garde le tirage initial. Avant, le round était tranché avant de
    // savoir s'il finissait en clutch, donc aucun clutch n'était jamais gagné.
    const clutchWon = isClutch && rng() < 0.34;
    const winning_team = isClutch ? (clutchWon ? myTeam : enemyTeam) : roundWonByMe ? myTeam : enemyTeam;

    // Instants croissants sur la durée d'un round, sans doublon : c'est
    // l'ordre qui décide du premier sang.
    const times = victims
      .map(() => int(8000, 96000))
      .sort((a, b) => a - b)
      .map((t, i) => t + i);

    const roundKills = victims.map((v, i) => {
      const killer = v.byMe
        ? me
        : v.byEnemy
          ? foePool[int(0, foePool.length - 1)]
          : matePool[int(0, Math.max(0, matePool.length - 1))] || me;
      const weapon = pickWeapon();
      return {
        kill_time_in_round: times[i],
        kill_time_in_match: r * 100000 + times[i],
        killer_puuid: killer.puuid,
        killer_display_name: displayName(killer),
        killer_team: killer.team,
        victim_puuid: v.victim.puuid,
        victim_display_name: displayName(v.victim),
        victim_team: v.victim.team,
        victim_death_location: worldPoint(map),
        damage_weapon_id: weapon.id,
        damage_weapon_name: weapon.name,
        secondary_fire_mode: false,
        player_locations_on_kill: [
          {
            player_puuid: killer.puuid,
            player_display_name: displayName(killer),
            player_team: killer.team,
            location: worldPoint(map),
            view_radians: rng() * 6.28,
          },
        ],
        assistants: [],
      };
    });

    // Un round sur cinq en éco, le reste en achat plein : le simulateur
    // d'achat et l'analyse économique ont besoin des deux.
    const eco = rng() < 0.2;
    const loadout = eco ? int(900, 2100) : int(3900, 5400);

    rounds.push({
      winning_team,
      end_type: pick(['Elimination', 'Bomb detonated', 'Bomb defused', 'Round timer expired']),
      bomb_planted: rng() < 0.45,
      bomb_defused: rng() < 0.15,
      plant_events: null,
      defuse_events: null,
      player_stats: players.map((p) => ({
        ability_casts: null,
        player_puuid: p.puuid,
        player_display_name: displayName(p),
        player_team: p.team,
        damage_events: [],
        damage: int(0, 480),
        headshots: int(0, 3),
        bodyshots: int(0, 6),
        legshots: int(0, 2),
        kill_events: roundKills.filter((k) => k.killer_puuid === p.puuid),
        kills: roundKills.filter((k) => k.killer_puuid === p.puuid).length,
        score: int(0, 600),
        economy: {
          loadout_value: p.puuid === me.puuid ? loadout : int(1500, 5200),
          remaining: int(0, 6500),
          spent: p.puuid === me.puuid ? loadout : int(1500, 5200),
          weapon: null,
          armor: null,
        },
        was_afk: false,
        was_penalized: false,
        stayed_in_spawn: false,
      })),
    });

    allKills.push(...roundKills);
  }

  return {
    metadata: {
      map,
      game_version: 'release-11.02',
      game_length: roundsPlayed * int(95, 135),
      game_start: Math.round(start.getTime() / 1000),
      game_start_patched: start.toISOString(),
      rounds_played: roundsPlayed,
      mode: mode === 'competitive' ? 'Compétition' : 'Non classé',
      mode_id: mode,
      queue: mode,
      season_id: 'e11a3',
      platform: 'pc',
      matchid: `demo-${index}`,
      premier_info: { tournament_id: null, matchup_id: null },
      region: 'eu',
      cluster: 'Paris',
    },
    players: {
      all_players: players,
      red: players.filter((p) => p.team === 'Red'),
      blue: players.filter((p) => p.team === 'Blue'),
    },
    observers: [],
    coaches: [],
    teams: {
      [myTeam.toLowerCase()]: { has_won: won, rounds_won: myRounds, rounds_lost: theirRounds, roster: null },
      [enemyTeam.toLowerCase()]: { has_won: !won, rounds_won: theirRounds, rounds_lost: myRounds, roster: null },
    },
    rounds,
    kills: allKills,
  };
}

// Fin de la derniere semaine complete (dimanche soir). Le tirage reste
// deterministe — meme graine, memes ecarts, memes scores — seule la date
// absolue suit le calendrier, pour que le Wrapped et Perf & Forme aient
// toujours quelque chose a montrer.
function lastCompletedWeekEnd() {
  const now = new Date();
  const day = (now.getDay() + 6) % 7; // 0 = lundi
  const thisMonday = new Date(now);
  thisMonday.setDate(now.getDate() - day);
  thisMonday.setHours(0, 0, 0, 0);
  const end = new Date(thisMonday);
  end.setDate(end.getDate() - 1); // dimanche precedent
  return end;
}

const REFERENCE_DATE = lastCompletedWeekEnd();

export const MATCHES = Array.from({ length: 40 }, (_, i) => buildMatch(i, REFERENCE_DATE));

export const RANK = {
  tierId: 22,
  tierName: 'Ascendant 2',
  rr: 64,
  cardUuid: null,
  peakTierName: 'Ascendant 3',
  peakSeason: 'Épisode 11 — ACTE II',
};

export const SETTINGS = { name: ME.name, tag: ME.tag, puuid: ME.puuid, apiKey: 'demo' };

// Relevés de ping, un toutes les dix secondes pendant chaque match, forme
// { timestamp, latency_ms } comme la table ping_samples. Base autour de 30 ms
// avec des pics ponctuels, dont une partie tombe juste avant une de mes morts :
// sans cette corrélation volontaire, l'onglet Réseau affiche « 0 % » et ne
// montre rien de ce qu'il sait faire.
export const PING_SAMPLES = (() => {
  const out = [];
  MATCHES.forEach((match) => {
    const startMs = match.metadata.game_start * 1000;
    const endMs = startMs + match.metadata.game_length * 1000;

    // Instants de mes morts dans ce match, en absolu.
    const myDeaths = [];
    match.rounds.forEach((round, i) => {
      round.player_stats.forEach((ps) => {
        ps.kill_events.forEach((k) => {
          if (k.victim_puuid === ME.puuid) myDeaths.push(startMs + i * 100000 + k.kill_time_in_round);
        });
      });
    });
    const spikeAt = myDeaths.filter(() => rng() < 0.34);

    for (let t = startMs; t < endMs; t += 10000) {
      const nearSpike = spikeAt.some((d) => Math.abs(d - t) < 12000);
      const latency = nearSpike ? int(95, 180) : int(22, 41);
      out.push({ timestamp: Math.round(t), latency_ms: latency });
    }
  });
  return out;
})();
