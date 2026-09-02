import { debug } from '../logger.js';

// =============================================================================
// CACHE TTL PARTAGÉ POUR LES APPELS D'API EXTERNES (HenrikDev)
//
// Trois problèmes distincts, un seul endroit pour les traiter :
//
//   1. Des données qui ne changent pas (puuid, region, plateformes d'un
//      compte) étaient redemandées à chaque rafraîchissement ET à chaque
//      sondage de fond, soit une requête de quota par appel pour un résultat
//      identique.
//   2. Deux appels identiques lancés en parallèle (montage de l'app + clic
//      sur Rafraîchir dans la même seconde) partaient deux fois.
//   3. Tout repartait de zéro au redémarrage de l'app, alors que la réponse
//      de la veille est encore valable pour l'identité d'un compte.
//
// D'où : cache en RAM + persistance electron-store (survit au redémarrage),
// et déduplication des requêtes identiques encore en vol.
//
// L'écriture disque est groupée : electron-store réécrit tout son JSON à
// chaque set(), le faire une fois par entrée coûtait plus cher que ce que le
// cache fait gagner sur une rafale d'écritures.
// =============================================================================

const STORE_KEY = 'apiCache';

// Au-delà, une entrée n'a plus aucune chance d'être réutilisée avec un TTL
// utile : on l'enlève au démarrage pour que le fichier ne gonfle pas
// indéfiniment avec les comptes consultés une seule fois.
const MAX_ENTRY_AGE_MS = 7 * 24 * 60 * 60 * 1000;

let store = null;
let entries = {};
const inFlight = new Map();

let hits = 0;
let misses = 0;
let dedups = 0;

export function initApiCache(electronStore) {
  store = electronStore;
  entries = store.get(STORE_KEY) || {};
  const now = Date.now();
  let pruned = 0;
  for (const [key, entry] of Object.entries(entries)) {
    if (!entry?.ts || now - entry.ts > MAX_ENTRY_AGE_MS) {
      delete entries[key];
      pruned += 1;
    }
  }
  if (pruned > 0) {
    store.set(STORE_KEY, entries);
    debug(`[apiCache] ${pruned} entrée(s) périmée(s) purgée(s) au démarrage`);
  }
}

let persistTimer = null;
function persist() {
  if (persistTimer || !store) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    store.set(STORE_KEY, entries);
  }, 1000);
  // Ne doit pas maintenir le process en vie à la fermeture de l'app.
  persistTimer.unref?.();
}

/** Âge de l'entrée en ms, Infinity si absente. */
export function ageOf(key) {
  const entry = entries[key];
  return entry?.ts ? Date.now() - entry.ts : Infinity;
}

/** Valeur en cache si elle est plus jeune que `ttlMs`, sinon undefined. */
export function peek(key, ttlMs) {
  const entry = entries[key];
  if (!entry?.ts) return undefined;
  if (ttlMs != null && Date.now() - entry.ts > ttlMs) return undefined;
  return entry.value;
}

export function write(key, value) {
  entries[key] = { value, ts: Date.now() };
  persist();
  return value;
}

export function forget(key) {
  if (key in entries) {
    delete entries[key];
    persist();
  }
}

/**
 * Renvoie la valeur en cache si elle est encore fraîche, sinon appelle
 * `producer` et met le résultat en cache. Deux appels concurrents sur la même
 * clé partagent la même requête au lieu d'en lancer deux.
 *
 * Un producteur qui échoue ne met rien en cache (l'erreur remonte telle
 * quelle) : une panne réseau passagère ne doit pas être mémorisée pendant
 * tout le TTL.
 */
export async function remember(key, ttlMs, producer) {
  const cached = peek(key, ttlMs);
  if (cached !== undefined) {
    hits += 1;
    return cached;
  }
  const pending = inFlight.get(key);
  if (pending) {
    dedups += 1;
    return pending;
  }

  misses += 1;
  const promise = (async () => producer())()
    .then((value) => write(key, value))
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

/** Compteurs de la session en cours, pour le log de bilan. */
export function cacheStats() {
  return { hits, misses, dedups, saved: hits + dedups };
}
