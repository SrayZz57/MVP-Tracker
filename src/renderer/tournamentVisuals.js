function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export function pickSplash(tournamentId, mapImages) {
  const names = [...mapImages.keys()];
  if (names.length === 0) return null;
  return mapImages.get(names[hashString(tournamentId) % names.length]);
}
