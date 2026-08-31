// Logique pure de génération/lecture du bracket à élimination directe,
// aucun appel réseau ici, juste des transformations de données, pour rester
// facile à vérifier indépendamment de Supabase.

export function nextPowerOfTwo(n) {
  let size = 1;
  while (size < n) size *= 2;
  return size;
}

function shuffle(array) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * Construit les lignes `tournament_matches` pour un tournoi, à partir des
 * équipes qualifiées (déjà validées). Répartition aléatoire des équipes ET
 * des byes dans l'arbre.
 *
 * Byes : si le nombre d'équipes n'est pas une puissance de 2, on complète
 * jusqu'à la puissance de 2 supérieure avec des emplacements vides, une
 * équipe qui tombe face à un emplacement vide gagne son match automatiquement
 * (`is_bye: true`, `winner_id` déjà renseigné) SANS qu'aucun admin n'ait à
 * intervenir. Seul le premier tour peut contenir des byes : à partir du tour
 * 2, chaque match oppose forcément deux vainqueurs bien réels.
 */
export function generateBracketRows(tournamentId, teamIds) {
  const bracketSize = nextPowerOfTwo(teamIds.length);
  const byeCount = bracketSize - teamIds.length;
  const roundCount = Math.log2(bracketSize);

  // byeCount est toujours < bracketSize/2 (nombre de matchs du tour 1) : la
  // puissance de 2 supérieure ne peut jamais demander plus de la moitié des
  // matchs en byes. On construit donc chaque bye à part, une vraie équipe
  // face à un emplacement vide, PLUTÔT que de mélanger équipes et vides
  // dans un même tirage : un mélange global peut, par pur hasard, faire
  // tomber deux emplacements vides dans le même match (un "match" sans
  // aucune équipe, qui ne progresse jamais), bug réel rencontré en testant
  // avec 6 équipes avant ce correctif.
  const shuffled = shuffle(teamIds);
  const byeTeams = shuffled.slice(0, byeCount);
  const pairedTeams = shuffled.slice(byeCount);

  const pairs = byeTeams.map((teamId) => [teamId, null]);
  for (let i = 0; i < pairedTeams.length; i += 2) {
    pairs.push([pairedTeams[i], pairedTeams[i + 1]]);
  }
  const orderedPairs = shuffle(pairs); // ordre des matchs dans l'arbre, pas les paires elles-mêmes

  const rows = [];

  // Tour 1 : vraies paires, byes déjà résolus.
  orderedPairs.forEach(([team1Id, team2Id], position) => {
    const isBye = !team1Id || !team2Id;
    rows.push({
      tournament_id: tournamentId,
      round: 1,
      position,
      team1_id: team1Id,
      team2_id: team2Id,
      winner_id: isBye ? team1Id ?? team2Id : null,
      is_bye: isBye,
    });
  });

  // Tours suivants : matchs vides, remplis au fil des résultats (ou tout de
  // suite pour un match dont les deux entrées viennent d'un bye au tour 1).
  for (let round = 2; round <= roundCount; round++) {
    const matchesInRound = bracketSize / 2 ** round;
    for (let position = 0; position < matchesInRound; position++) {
      rows.push({ tournament_id: tournamentId, round, position, team1_id: null, team2_id: null, winner_id: null, is_bye: false });
    }
  }

  // Propage les vainqueurs de byes du tour 1 vers le tour 2, le seul cas où
  // un tour 2+ peut être partiellement rempli dès la génération.
  const round1ByesWithWinner = rows.filter((r) => r.round === 1 && r.winner_id);
  for (const bye of round1ByesWithWinner) {
    const nextMatch = rows.find((r) => r.round === 2 && r.position === Math.floor(bye.position / 2));
    if (!nextMatch) continue;
    if (bye.position % 2 === 0) nextMatch.team1_id = bye.winner_id;
    else nextMatch.team2_id = bye.winner_id;
  }

  return rows;
}

/** Regroupe une liste plate de matchs par round, triés par position. */
export function groupByRound(matches) {
  const rounds = new Map();
  for (const match of matches) {
    if (!rounds.has(match.round)) rounds.set(match.round, []);
    rounds.get(match.round).push(match);
  }
  for (const list of rounds.values()) list.sort((a, b) => a.position - b.position);
  return [...rounds.entries()].sort(([a], [b]) => a - b).map(([round, list]) => ({ round, matches: list }));
}
