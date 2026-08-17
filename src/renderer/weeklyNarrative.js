import { excludeDeathmatch, findMe, groupStats, formStats, overallHsPercent, overallWinrate } from './valorantStats.js';

// Recalcule le même récapitulatif que la carte "Ta semaine" (WeeklyRecapCard),
// plus une pire map, pour avoir de quoi écrire un vrai contraste dans le récit.
export function buildWeekRecap(weekAllMatches, name, tag) {
  const week = excludeDeathmatch(weekAllMatches);
  if (week.length === 0) return null;

  const agentRows = groupStats(week, name, tag, (match, me) => me.character);
  const mapRows = groupStats(week, name, tag, (match) => match.metadata?.map).filter(
    (row) => row.games >= 2 && row.winrate !== null,
  );
  const bestMap = mapRows.length > 0 ? mapRows.reduce((a, b) => (b.winrate > a.winrate ? b : a)) : null;
  const worstMap =
    mapRows.length > 1 ? mapRows.reduce((a, b) => (b.winrate < a.winrate ? b : a)) : null;

  let bestKd = null;
  week.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const kills = me.stats?.kills ?? 0;
    const deaths = me.stats?.deaths ?? 0;
    const kd = deaths > 0 ? kills / deaths : kills;
    if (bestKd === null || kd > bestKd) bestKd = kd;
  });

  return {
    games: week.length,
    winrate: overallWinrate(week, name, tag),
    kd: formStats(week, name, tag).overallKd,
    hsPercent: overallHsPercent(weekAllMatches, name, tag),
    bestAgent: agentRows[0] ?? null,
    bestMap,
    worstMap: worstMap && bestMap && worstMap.key !== bestMap.key ? worstMap : null,
    bestKd,
  };
}

function overviewParagraph(recap) {
  const { games, winrate } = recap;
  const gamesText = `${games} match${games > 1 ? 's' : ''} cette semaine`;

  if (winrate === null) {
    return `${gamesText}, sans assez de rounds décisifs pour dégager un vrai winrate — une semaine surtout faite de découverte ou de modes annexes.`;
  }
  if (winrate >= 60) {
    return `Grosse semaine : ${gamesText}, avec ${winrate.toFixed(0)}% de victoires. Ce genre de série ne tombe pas du ciel, profites-en.`;
  }
  if (winrate >= 45) {
    return `Semaine équilibrée : ${gamesText}, ${winrate.toFixed(0)}% de victoires. Ni une remontée fulgurante ni une dégringolade, du solide.`;
  }
  return `Semaine plus compliquée : ${gamesText}, seulement ${winrate.toFixed(0)}% de victoires. Ça arrive, l'important est de repartir sur de bonnes bases.`;
}

function highlightsParagraph(recap) {
  const parts = [];
  if (recap.bestAgent) {
    parts.push(`Tu as surtout tourné sur ${recap.bestAgent.key} (${recap.bestAgent.games} parties)`);
  }
  if (recap.bestMap) {
    parts.push(`ta meilleure map a été ${recap.bestMap.key} avec ${recap.bestMap.winrate.toFixed(0)}% de winrate`);
  }
  if (recap.worstMap) {
    parts.push(`${recap.worstMap.key} a été plus difficile (${recap.worstMap.winrate.toFixed(0)}%)`);
  }
  if (recap.bestKd !== null) {
    parts.push(`avec un pic à ${recap.bestKd.toFixed(2)} de K/D sur ton meilleur match`);
  }

  if (parts.length === 0) return null;
  return `${parts.join(', ')}.`.replace(/^./, (c) => c.toUpperCase());
}

function rankParagraph(currentRank, previousRank) {
  if (!currentRank) return null;
  const currentText = `${currentRank.tierName} (${currentRank.rr} RR)`;

  if (!previousRank) {
    return `Côté classement, tu es actuellement ${currentText} — premier snapshot enregistré, on pourra comparer la semaine prochaine.`;
  }

  const previousText = `${previousRank.tierName} (${previousRank.rr} RR)`;
  // Comparaison par tierId (ordre numérique officiel des rangs) : le RR seul
  // n'est pas comparable d'un tier à l'autre puisqu'il repart d'une base
  // différente à chaque changement de tier.
  const sameTier = previousRank.tierId === currentRank.tierId;

  if (sameTier && previousRank.rr === currentRank.rr) {
    return `Ton rang n'a pas bougé cette semaine : toujours ${currentText}.`;
  }
  if (sameTier) {
    return currentRank.rr > previousRank.rr
      ? `Tu progresses : de ${previousText} à ${currentText}.`
      : `Petit recul cette semaine : de ${previousText} à ${currentText}. Rien d'irréversible.`;
  }
  return currentRank.tierId > previousRank.tierId
    ? `Tu progresses : de ${previousText} à ${currentText}.`
    : `Petit recul cette semaine : de ${previousText} à ${currentText}. Rien d'irréversible.`;
}

// Génère 2-3 paragraphes à partir de règles simples (pas d'IA générative) —
// même logique que playerProfile.js : combiner des vraies stats en phrases
// lisibles, avec de la variation selon les tranches de valeurs.
export function generateNarrative(recap, currentRank, previousRank) {
  const paragraphs = [overviewParagraph(recap)];
  const highlights = highlightsParagraph(recap);
  if (highlights) paragraphs.push(highlights);
  const rankText = rankParagraph(currentRank, previousRank);
  if (rankText) paragraphs.push(rankText);
  return paragraphs;
}
