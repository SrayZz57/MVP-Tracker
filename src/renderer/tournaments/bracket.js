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

export function generateBracketRows(tournamentId, teamIds) {
  const bracketSize = nextPowerOfTwo(teamIds.length);
  const byeCount = bracketSize - teamIds.length;
  const roundCount = Math.log2(bracketSize);

  const shuffled = shuffle(teamIds);
  const byeTeams = shuffled.slice(0, byeCount);
  const pairedTeams = shuffled.slice(byeCount);

  const pairs = byeTeams.map((teamId) => [teamId, null]);
  for (let i = 0; i < pairedTeams.length; i += 2) {
    pairs.push([pairedTeams[i], pairedTeams[i + 1]]);
  }
  const orderedPairs = shuffle(pairs);

  const rows = [];

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

  for (let round = 2; round <= roundCount; round++) {
    const matchesInRound = bracketSize / 2 ** round;
    for (let position = 0; position < matchesInRound; position++) {
      rows.push({ tournament_id: tournamentId, round, position, team1_id: null, team2_id: null, winner_id: null, is_bye: false });
    }
  }

  const round1ByesWithWinner = rows.filter((r) => r.round === 1 && r.winner_id);
  for (const bye of round1ByesWithWinner) {
    const nextMatch = rows.find((r) => r.round === 2 && r.position === Math.floor(bye.position / 2));
    if (!nextMatch) continue;
    if (bye.position % 2 === 0) nextMatch.team1_id = bye.winner_id;
    else nextMatch.team2_id = bye.winner_id;
  }

  return rows;
}

export function groupByRound(matches) {
  const rounds = new Map();
  for (const match of matches) {
    if (!rounds.has(match.round)) rounds.set(match.round, []);
    rounds.get(match.round).push(match);
  }
  for (const list of rounds.values()) list.sort((a, b) => a.position - b.position);
  return [...rounds.entries()].sort(([a], [b]) => a - b).map(([round, list]) => ({ round, matches: list }));
}
