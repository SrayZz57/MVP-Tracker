const BASE_URL = 'https://api.henrikdev.xyz';

async function henrikFetch(path, apiKey) {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Authorization: apiKey },
  });
  const body = await response.json();

  if (!response.ok) {
    const message = body?.errors?.[0]?.message || `Erreur API (${response.status})`;
    throw new Error(message);
  }

  return body.data;
}

export async function getAccount(name, tag, apiKey) {
  return henrikFetch(`/valorant/v2/account/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`, apiKey);
}

export async function getMatches(region, name, tag, apiKey) {
  return henrikFetch(
    `/valorant/v3/matches/${region}/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?size=20`,
    apiKey,
  );
}

export async function getMmr(region, name, tag, apiKey) {
  return henrikFetch(
    `/valorant/v3/mmr/${region}/pc/${encodeURIComponent(name)}/${encodeURIComponent(tag)}`,
    apiKey,
  );
}
