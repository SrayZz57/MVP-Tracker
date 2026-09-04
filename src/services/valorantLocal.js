import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';

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

const CLIENT_PLATFORM =
  'ew0KCSJwbGF0Zm9ybVR5cGUiOiAiUEMiLA0KCSJwbGF0Zm9ybU9TIjogIldpbmRvd3MiLA0KCSJwbGF0Zm9ybU9TVmVyc2lvbiI6ICIxMC4wLjE5MDQyLjEuMjU2LjY0Yml0IiwNCgkicGxhdGZvcm1DaGlwc2V0IjogIlVua25vd24iDQp9';

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

export function readLockfile() {
  if (!fs.existsSync(LOCKFILE)) return null;
  const parts = fs.readFileSync(LOCKFILE, 'utf8').trim().split(':');
  if (parts.length < 5) return null;
  const [, , port, password, protocol] = parts;
  return { port, password, protocol };
}

let authCache = null;
const AUTH_CACHE_MS = 5 * 60 * 1000;

async function getLocalAuth(lock) {
  if (authCache && authCache.password === lock.password && authCache.expiresAt > Date.now()) {
    return authCache.auth;
  }
  const basic = Buffer.from(`riot:${lock.password}`).toString('base64');
  const res = await localRequest(
    `${lock.protocol}://127.0.0.1:${lock.port}/entitlements/v1/token`,
    { Authorization: `Basic ${basic}` },
  );
  if (res.status !== 200) throw new Error(`entitlements ${res.status}`);
  const json = JSON.parse(res.body);
  const auth = { accessToken: json.accessToken, entitlements: json.token, puuid: json.subject };
  authCache = { password: lock.password, auth, expiresAt: Date.now() + AUTH_CACHE_MS };
  return auth;
}

let glzBaseCache = null;

export function readGlzBase() {
  if (glzBaseCache) return glzBaseCache;
  if (!fs.existsSync(SHOOTER_LOG)) return null;
  const log = fs.readFileSync(SHOOTER_LOG, 'utf8');
  const match = log.match(/https:\/\/glz-[a-z0-9-]+\.[a-z0-9]+\.a\.pvp\.net/i);
  if (match) glzBaseCache = match[0];
  return match ? match[0] : null;
}

let versionCache = null;

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

function pdBaseFromGlz(glz) {
  const match = glz.match(/^https:\/\/glz-[a-z0-9-]+\.([a-z0-9-]+)\.a\.pvp\.net$/i);
  return match ? `https://pd.${match[1]}.a.pvp.net` : null;
}

const mmrCache = new Map();
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

async function fillMissingRanks(pdBase, headers, players, mode) {
  if (mode === 'competitive') return players;
  await Promise.all(
    players.map(async (p) => {
      if (p.competitiveTier > 0) return;
      p.competitiveTier = await fetchMmrTier(pdBase, headers, p.puuid);
    }),
  );
  return players;
}

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
    competitiveTier: p.CompetitiveTier ?? 0,
    agentId: p.CharacterID || null,
    selectionState: p.CharacterSelectionState ?? '',
    accountLevel: p.PlayerIdentity?.AccountLevel ?? null,
    incognito: p.PlayerIdentity?.Incognito ?? false,
    isMe: p.Subject === puuid,
    team: 'ally',
  }));

  if (pdBase) await fillMissingRanks(pdBase, headers, players, match.QueueID ?? null);

  return { state: 'ok', phase: 'select', matchId, mapId: match.MapID ?? null, mode: match.QueueID ?? null, players };
}

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
    competitiveTier: p.SeasonalBadgeInfo?.Rank ?? 0,
    agentId: p.CharacterID || null,
    selectionState: 'locked',
    accountLevel: p.PlayerIdentity?.AccountLevel ?? null,
    incognito: p.PlayerIdentity?.Incognito ?? false,
    isMe: p.Subject === puuid,
    team: myTeam && p.TeamID === myTeam ? 'ally' : 'enemy',
  }));

  if (pdBase) await fillMissingRanks(pdBase, headers, players, match.ModeID ?? null);

  return { state: 'ok', phase: 'game', matchId, mapId: match.MapID ?? null, mode: match.ModeID ?? null, players };
}

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
    return { state: 'unavailable', reason: err.message };
  }
}
