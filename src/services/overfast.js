const BASE_URL = 'https://overfast-api.tekrop.fr';

function toPlayerId(battleTag) {
  return battleTag.replace('#', '-');
}

async function overfastFetch(path) {
  const response = await fetch(`${BASE_URL}${path}`);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error('Battletag introuvable (vérifie l\'orthographe et le tag numérique).');
    }
    throw new Error(`Erreur API OverFast (${response.status})`);
  }

  return response.json();
}

export async function getPlayerSummary(battleTag) {
  return overfastFetch(`/players/${encodeURIComponent(toPlayerId(battleTag))}/summary`);
}

export async function getPlayerStatsSummary(battleTag) {
  return overfastFetch(`/players/${encodeURIComponent(toPlayerId(battleTag))}/stats/summary`);
}
