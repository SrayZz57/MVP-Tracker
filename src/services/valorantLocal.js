import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

// =============================================================================
// API LOCALE DE VALORANT
//
// Contrairement à HenrikDev (service tiers, quota de requêtes, données à
// quelques minutes de décalage), cette API est celle du client Valorant qui
// tourne sur la machine. Elle donne l'état EN DIRECT — notamment la sélection
// d'agent, que rien d'autre ne permet de voir.
//
// Contraintes qui en découlent :
//   - ne marche que sur le PC qui joue, client Riot lancé
//   - tout passe par le process principal : lecture de fichiers (lockfile,
//     log) et certificat auto-signé, deux choses impossibles depuis le
//     renderer (et que la CSP bloquerait de toute façon)
//   - API non officielle : les endpoints peuvent changer sans préavis, donc
//     chaque échec doit être silencieux côté interface, jamais bloquant
// =============================================================================

const LOCKFILE = path.join(
  process.env.LOCALAPPDATA ?? '',
  'Riot Games',
  'Riot Client',
  'Config',
  'lockfile',
);

const SHOOTER_LOG = path.join(
  process.env.LOCALAPPDATA ?? '',
  'VALORANT',
  'Saved',
  'Logs',
  'ShooterGame.log',
);

// En-tête d'identification du client attendu par les serveurs Riot. C'est la
// valeur canonique utilisée par le client PC (base64 d'un petit JSON décrivant
// la plateforme). Elle est figée volontairement : la ré-encoder soi-même
// change les octets (espaces, retours ligne) et Riot rejette la requête.
const CLIENT_PLATFORM =
  'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';

// Le client local présente un certificat auto-signé : sans exception, la
// requête échoue. L'exception est limitée à CE module et à 127.0.0.1 — on ne
// touche jamais à NODE_TLS_REJECT_UNAUTHORIZED, qui désactiverait la
// vérification pour toutes les requêtes de l'app (Supabase, HenrikDev...).
//
// On passe par https.request plutôt que fetch : le fetch intégré à Node
// (undici) ignore l'option `agent`, qui vient de node-fetch. Le certificat
// auto-signé serait donc refusé malgré le réglage.
function localRequest(url, headers) {
  return new Promise((resolve, reject) => {
    const req = https.request(
      url,
      { method: 'GET', headers, rejectUnauthorized: false },
      (res) => {
        let body = '';
        res.on('data', (chunk) => {
          body += chunk;
        });
        res.on('end', () => resolve({ status: res.statusCode, body }));
      },
    );
    req.on('error', reject);
    req.end();
  });
}

/** Lit le lockfile écrit par le client Riot au démarrage. */
export function readLockfile() {
  if (!fs.existsSync(LOCKFILE)) return null;
  const parts = fs.readFileSync(LOCKFILE, 'utf8').trim().split(':');
  if (parts.length < 5) return null;
  const [, , port, password, protocol] = parts;
  return { port, password, protocol };
}

/**
 * Jetons d'accès, obtenus auprès du client local.
 * `subject` est le puuid du joueur connecté — pas besoin de le demander
 * ailleurs ni de le faire saisir.
 */
async function getLocalAuth(lock) {
  const basic = Buffer.from(`riot:${lock.password}`).toString('base64');
  const res = await localRequest(
    `${lock.protocol}://127.0.0.1:${lock.port}/entitlements/v1/token`,
    { Authorization: `Basic ${basic}` },
  );
  if (res.status !== 200) throw new Error(`entitlements ${res.status}`);
  const json = JSON.parse(res.body);
  return { accessToken: json.accessToken, entitlements: json.token, puuid: json.subject };
}

/**
 * Base des serveurs de jeu (glz), lue dans le log du jeu.
 * La doc ne décrit pas comment dériver le couple région/shard, et le déduire
 * de la seule région est faux pour les comptes créés dans une autre zone. Le
 * log, lui, contient l'URL réellement utilisée par le client.
 */
export function readGlzBase() {
  if (!fs.existsSync(SHOOTER_LOG)) return null;
  const log = fs.readFileSync(SHOOTER_LOG, 'utf8');
  const match = log.match(/https:\/\/glz-[a-z0-9-]+\.[a-z0-9]+\.a\.pvp\.net/i);
  return match ? match[0] : null;
}

let versionCache = null;

/** Version du client, exigée en en-tête. Mise en cache pour la session. */
async function getClientVersion() {
  if (versionCache) return versionCache;
  const res = await fetch('https://valorant-api.com/v1/version');
  if (!res.ok) throw new Error(`version ${res.status}`);
  const json = await res.json();
  versionCache = json.data.riotClientVersion;
  return versionCache;
}

function glzHeaders(auth, version) {
  return {
    Authorization: `Bearer ${auth.accessToken}`,
    'X-Riot-Entitlements-JWT': auth.entitlements,
    'X-Riot-ClientPlatform': CLIENT_PLATFORM,
    'X-Riot-ClientVersion': version,
  };
}

// pregame/core-game vivent sur les serveurs "glz" (par région de partie),
// mais le rang classé d'un joueur, lui, vit sur "pd" (par shard du compte,
// peu importe la partie) — même hôte que glz, sans le préfixe régional.
// ex. glz-eu-1.eu.a.pvp.net -> pd.eu.a.pvp.net
function pdBaseFromGlz(glz) {
  const match = glz.match(/^https:\/\/glz-[a-z0-9-]+\.([a-z0-9-]+)\.a\.pvp\.net$/i);
  return match ? `https://pd.${match[1]}.a.pvp.net` : null;
}

// CompetitiveTier dans pregame/core-game ne reflète que le classement DE LA
// PARTIE EN COURS — vide (0) hors file Compétitive. L'endpoint MMR, lui,
// donne le rang classé du joueur indépendamment du mode actuellement joué
// (c'est ce que font les trackers tiers pour afficher un rang même en Spike
// Rush) — voir player-mmr sur valapidocs.techchrism.me. Un cache court évite
// de le refaire à chaque poll (4s) pour les mêmes joueurs pendant un même
// pregame/partie.
const mmrCache = new Map(); // puuid -> { tier, expiresAt }
const MMR_CACHE_MS = 5 * 60 * 1000;

async function fetchMmrTier(pdBase, headers, puuid) {
  const cached = mmrCache.get(puuid);
  if (cached && cached.expiresAt > Date.now()) return cached.tier;

  try {
    const res = await fetch(`${pdBase}/mmr/v1/players/${puuid}`, { headers });
    if (!res.ok) return 0;
    const json = await res.json();
    const seasonId = json.LatestCompetitiveUpdate?.SeasonID;
    const tier = seasonId
      ? json.QueueSkills?.competitive?.SeasonalInfoBySeasonID?.[seasonId]?.CompetitiveTier ?? 0
      : 0;
    mmrCache.set(puuid, { tier, expiresAt: Date.now() + MMR_CACHE_MS });
    return tier;
  } catch {
    return 0;
  }
}

// Ne rappelle l'endpoint MMR que pour les joueurs dont le rang embarqué est
// vide (0) — en Compétitif, il est déjà correct et gratuit, pas besoin d'un
// appel de plus par joueur.
async function fillMissingRanks(pdBase, headers, players) {
  await Promise.all(
    players.map(async (p) => {
      if (p.competitiveTier > 0) return;
      p.competitiveTier = await fetchMmrTier(pdBase, headers, p.puuid);
    }),
  );
  return players;
}

// Sélection d'agent ('pregame') : seule MON équipe est exposée par Riot à ce
// stade en classé (`EnemyTeam` est null) — rien à faire côté adversaires ici.
async function fetchPregame(glz, pdBase, headers, puuid) {
  const playerRes = await fetch(`${glz}/pregame/v1/players/${puuid}`, { headers });
  if (playerRes.status === 404) return null;
  if (!playerRes.ok) throw new Error(`pregame-player ${playerRes.status}`);
  const { MatchID: matchId } = await playerRes.json();
  if (!matchId) return null;

  const matchRes = await fetch(`${glz}/pregame/v1/matches/${matchId}`, { headers });
  if (matchRes.status === 404) return null;
  if (!matchRes.ok) throw new Error(`pregame-match ${matchRes.status}`);
  const match = await matchRes.json();

  const players = (match.AllyTeam?.Players ?? []).map((p) => ({
    puuid: p.Subject,
    // Numéro de palier ; la conversion en nom et en icône se fait côté
    // interface, avec la table déjà utilisée pour le rang du joueur.
    competitiveTier: p.CompetitiveTier ?? 0,
    agentId: p.CharacterID || null,
    // '' | 'selected' | 'locked'
    selectionState: p.CharacterSelectionState ?? '',
    accountLevel: p.PlayerIdentity?.AccountLevel ?? null,
    incognito: p.PlayerIdentity?.Incognito ?? false,
    isMe: p.Subject === puuid,
    team: 'ally',
  }));

  if (pdBase) await fillMissingRanks(pdBase, headers, players);

  return { state: 'ok', phase: 'select', matchId, mapId: match.MapID ?? null, mode: match.QueueID ?? null, players };
}

// Partie en cours ('core-game'), à partir du chargement juste après la
// sélection : contrairement au pregame, LES DEUX équipes sont exposées ici —
// c'est ce qui permet d'afficher enfin les adversaires.
async function fetchCoregame(glz, pdBase, headers, puuid) {
  const playerRes = await fetch(`${glz}/core-game/v1/players/${puuid}`, { headers });
  if (playerRes.status === 404) return null;
  if (!playerRes.ok) throw new Error(`coregame-player ${playerRes.status}`);
  const { MatchID: matchId } = await playerRes.json();
  if (!matchId) return null;

  const matchRes = await fetch(`${glz}/core-game/v1/matches/${matchId}`, { headers });
  if (matchRes.status === 404) return null;
  if (!matchRes.ok) throw new Error(`coregame-match ${matchRes.status}`);
  const match = await matchRes.json();

  const myTeam = (match.Players ?? []).find((p) => p.Subject === puuid)?.TeamID ?? null;

  const players = (match.Players ?? []).map((p) => ({
    puuid: p.Subject,
    // Rang vit sous un autre nom que côté pregame (`SeasonalBadgeInfo.Rank`
    // plutôt que `CompetitiveTier`), même numéro de palier en dessous.
    competitiveTier: p.SeasonalBadgeInfo?.Rank ?? 0,
    agentId: p.CharacterID || null,
    selectionState: 'locked',
    accountLevel: p.PlayerIdentity?.AccountLevel ?? null,
    incognito: p.PlayerIdentity?.Incognito ?? false,
    isMe: p.Subject === puuid,
    team: myTeam && p.TeamID === myTeam ? 'ally' : 'enemy',
  }));

  if (pdBase) await fillMissingRanks(pdBase, headers, players);

  return { state: 'ok', phase: 'game', matchId, mapId: match.MapID ?? null, mode: match.ModeID ?? null, players };
}

/**
 * État de la sélection d'agent, puis de la partie qui suit (chargement +
 * début de match), en direct.
 *
 * Renvoie toujours un objet avec un `state`, jamais une exception : cette
 * fonction est appelée en boucle par l'interface, et « le joueur n'est ni en
 * sélection ni en partie » est le cas NORMAL, pas une erreur.
 *
 *   'idle'        — ni en sélection ni en partie (cas courant)
 *   'unavailable' — client fermé, log absent, ou API injoignable
 *   'ok'          — `players` renseigné, `phase` distingue 'select' (agents
 *                    alliés uniquement) de 'game' (alliés + adversaires,
 *                    `team` sur chaque joueur)
 */
export async function getAgentSelect() {
  try {
    const lock = readLockfile();
    if (!lock) return { state: 'unavailable', reason: 'client-closed' };

    const glz = readGlzBase();
    if (!glz) return { state: 'unavailable', reason: 'no-glz' };

    const pdBase = pdBaseFromGlz(glz);
    const auth = await getLocalAuth(lock);
    const version = await getClientVersion();
    const headers = glzHeaders(auth, version);

    const pregame = await fetchPregame(glz, pdBase, headers, auth.puuid);
    if (pregame) return pregame;

    const coregame = await fetchCoregame(glz, pdBase, headers, auth.puuid);
    if (coregame) return coregame;

    return { state: 'idle' };
  } catch (err) {
    // Réseau coupé, client fermé en cours de route, endpoint modifié par
    // Riot... Rien de tout ça ne doit remonter jusqu'à l'interface.
    return { state: 'unavailable', reason: err.message };
  }
}
