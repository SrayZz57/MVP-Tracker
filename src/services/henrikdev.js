import { normalizeV4Match } from './matchNormalizer.js';
import { debug } from '../logger.js';

const BASE_URL = 'https://api.henrikdev.xyz';

let requestCount = 0;

const inFlight = new Map();
let dedupedCount = 0;

export function henrikDedupCount() {
  return dedupedCount;
}

function henrikFetch(path, apiKey) {
  const key = `${apiKey}|${path}`;
  const pending = inFlight.get(key);
  if (pending) {
    dedupedCount += 1;
    debug(`[henrikdev] requête dédupliquée (déjà en vol) → ${path.split('?')[0]}`);
    return pending;
  }
  const promise = doHenrikFetch(path, apiKey).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

async function doHenrikFetch(path, apiKey) {
  requestCount += 1;
  const num = requestCount;
  const label = path.split('?')[0];
  const startedAt = Date.now();

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: apiKey },
  });
  const body = await response.json();
  const elapsed = Date.now() - startedAt;

  const remaining = response.headers.get('x-ratelimit-remaining');
  const quotaInfo = remaining !== null ? `, quota restant: ${remaining}` : '';
  debug(`[henrikdev] requête #${num} → ${label} (${response.status}, ${elapsed}ms${quotaInfo})`);

  if (!response.ok) {
    const message = body?.errors?.[0]?.message || `Erreur API (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body.data;
}

const STALE_MATCH_CACHE_ERROR = 'Error while fetching needed match data';

const ACCOUNT_NOT_FOUND_ERROR = 'Account not found';

export async function getAccount(name, tag, apiKey) {
  const path = `/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`;
  try {
    return await henrikFetch(path, apiKey);
  } catch (error) {
    if (error.message?.includes(STALE_MATCH_CACHE_ERROR) || error.message?.includes(ACCOUNT_NOT_FOUND_ERROR)) {
      return henrikFetch(`${path}?force=true`, apiKey);
    }
    throw error;
  }
}

export async function getMatches(region, platform, name, tag, apiKey, { size = 10, start = 0 } = {}) {
  const data = await henrikFetch(
    `/valorant/v4/matches/${region}/${platform}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=${size}&start=${start}`,
    apiKey,
  );
  return (data || []).map(normalizeV4Match);
}

export async function getMmr(region, platform, name, tag, apiKey) {
  return henrikFetch(
    `/valorant/v3/mmr/${region}/${platform}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    apiKey,
  );
}
