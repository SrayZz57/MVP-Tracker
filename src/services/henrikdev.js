import { normalizeV4Match } from './matchNormalizer.js';

const BASE_URL = 'https://api.henrikdev.xyz';

// Compteur de requêtes HenrikDev pour CETTE session de l'app (remis à zéro à
// chaque lancement), pour voir en direct dans la console ce qui consomme le
// quota (utile pour repérer d'où vient un 429, ex. ouvrir Amis vs Rafraîchir).
let requestCount = 0;

// Requêtes identiques encore en vol, par chemin. Deux composants qui
// demandent la même chose dans la même seconde (montage de l'app + clic sur
// Rafraîchir, sondage de fond qui tombe pendant un rafraîchissement manuel)
// partagent la réponse au lieu de consommer deux fois le quota. Chaque entrée
// est retirée dès que la requête se termine, il n'y a donc jamais de donnée
// périmée servie ici — c'est de la déduplication, pas du cache.
const inFlight = new Map();
let dedupedCount = 0;

/** Nombre de requêtes économisées par la déduplication, pour le log de bilan. */
export function henrikDedupCount() {
  return dedupedCount;
}

function henrikFetch(path, apiKey) {
  // La clé inclut la clé d'API : deux comptes utilisant des clés différentes
  // ne doivent pas se partager une réponse, même sur un chemin identique.
  const key = `${apiKey}|${path}`;
  const pending = inFlight.get(key);
  if (pending) {
    dedupedCount += 1;
    console.log(`[henrikdev] requête dédupliquée (déjà en vol) → ${path.split('?')[0]}`);
    return pending;
  }
  const promise = doHenrikFetch(path, apiKey).finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

async function doHenrikFetch(path, apiKey) {
  requestCount += 1;
  // Capturé tout de suite : avec des requêtes concurrentes, `requestCount`
  // (variable partagée) aurait déjà changé au moment du log plus bas, ce qui
  // faisait apparaître deux requêtes différentes sous le même numéro.
  const num = requestCount;
  const label = path.split('?')[0];
  const startedAt = Date.now();

  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: apiKey },
  });
  const body = await response.json();
  const elapsed = Date.now() - startedAt;

  // HenrikDev renvoie parfois le quota restant dans les en-têtes, affiché
  // s'il est présent, sans faire planter le log s'il ne l'est pas.
  const remaining = response.headers.get('x-ratelimit-remaining');
  const quotaInfo = remaining !== null ? `, quota restant: ${remaining}` : '';
  console.log(`[henrikdev] requête #${num} → ${label} (${response.status}, ${elapsed}ms${quotaInfo})`);

  if (!response.ok) {
    const message = body?.errors?.[0]?.message || `Erreur API (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body.data;
}

// HenrikDev met en cache le résultat de v2/account (niveau de compte, carte)
// dérivé du dernier match du joueur. Si ce tout premier calcul échoue (hoquet
// temporaire de leur côté), c'est CETTE erreur qui reste en cache et qui est
// renvoyée à chaque appel suivant, même si le compte est parfaitement valide
//, confirmé sur un cas réel où le compte apparaissait normalement sur un
// autre tracker. `force=true` contourne ce cache et force un nouveau calcul.
const STALE_MATCH_CACHE_ERROR = 'Error while fetching needed match data';

// Même piège pour un compte jamais recherché avant sur HenrikDev : leur v2/account
// renvoie un vrai 404 "Account not found" tant que personne n'a déclenché la toute
// première récupération côté Riot, confirmé en conditions réelles (le champ
// `updated_at` de la réponse ne date que du retry ci-dessous, jamais d'avant).
// `force=true` déclenche cette récupération immédiatement au lieu de faire
// échouer la recherche pour un compte pourtant bien réel.
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

// `platform` : "pc" ou "console", l'ancien point d'accès v3/matches (sans
// notion de plateforme) renvoie silencieusement 0 résultat pour un compte
// console, vérifié en conditions réelles (voir accountPlatform() dans
// main.js pour la détection automatique). v4/matches renvoie déjà le détail
// complet de chaque match (round par round, kills avec position), plus
// besoin d'un aller-retour "liste d'IDs" puis "détail par ID" comme avant.
//
// `size` plafonné à 10 par requête quel que soit ce qu'on demande, confirmé
// en test réel (même limite silencieuse que l'ancien v3/matches), mais
// `start` permet de paginer au-delà, également vérifié en conditions
// réelles (deux pages consécutives renvoient bien des matchs différents).
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
