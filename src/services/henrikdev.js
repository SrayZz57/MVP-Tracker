const BASE_URL = 'https://api.henrikdev.xyz';

async function henrikFetch(path, apiKey) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: apiKey },
  });
  const body = await response.json();

  if (!response.ok) {
    const message = body?.errors?.[0]?.message || `Erreur API (${response.status})`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return body.data;
}

export async function getAccount(name, tag, apiKey) {
  return henrikFetch(`/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, apiKey);
}

// size=50 demandé, mais confirmé en test réel : la liste "derniers matchs"
// est plafonnée à 10 résultats sur une clé Basic, quel que soit `size`. Sert
// surtout à garantir la fraîcheur des tout derniers matchs — le reste de la
// profondeur d'historique vient de getStoredMatchIds + getMatchDetail.
export async function getMatches(region, name, tag, apiKey) {
  return henrikFetch(
    `/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=50`,
    apiKey,
  );
}

// Liste étendue (jusqu'à 50, pas plafonnée à 10) des matchs déjà connus de
// HenrikDev pour ce joueur — mais seulement un résumé par match (pas de
// round par round, pas de position des kills). Sert uniquement à découvrir
// des IDs de matchs à récupérer en détail via getMatchDetail.
export async function getStoredMatchIds(region, name, tag, apiKey) {
  const data = await henrikFetch(
    `/valorant/v1/stored-matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=50`,
    apiKey,
  );
  return (data || []).map((m) => m.meta?.id).filter(Boolean);
}

// Détail complet d'un seul match (round par round, kills avec position et
// timing, économie) — même richesse que getMatches, mais match par match,
// sans la limite de 10 puisqu'il n'y a pas de notion de "liste" ici.
export async function getMatchDetail(matchId, apiKey) {
  return henrikFetch(`/valorant/v2/match/${matchId}`, apiKey);
}

export async function getMmr(region, name, tag, apiKey) {
  return henrikFetch(
    `/valorant/v3/mmr/${region}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    apiKey,
  );
}
