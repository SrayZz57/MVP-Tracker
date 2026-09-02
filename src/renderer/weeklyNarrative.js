import { excludeDeathmatch, findMe, groupStats, formStats, overallHsPercent, overallWinrate } from './valorantStats.js';

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

function overviewParagraph(t, recap) {
  const { games, winrate } = recap;
  const gamesText = t('weekly.narrative.gamesThisWeek', { count: games });

  if (winrate === null) {
    return t('weekly.narrative.overviewNoWinrate', { gamesText });
  }
  if (winrate >= 60) {
    return t('weekly.narrative.overviewGreat', { gamesText, winrate: winrate.toFixed(0) });
  }
  if (winrate >= 45) {
    return t('weekly.narrative.overviewBalanced', { gamesText, winrate: winrate.toFixed(0) });
  }
  return t('weekly.narrative.overviewHard', { gamesText, winrate: winrate.toFixed(0) });
}

function highlightsParagraph(t, recap) {
  const parts = [];
  if (recap.bestAgent) {
    parts.push(t('weekly.narrative.mostPlayedAgent', { agent: recap.bestAgent.key, count: recap.bestAgent.games }));
  }
  if (recap.bestMap) {
    parts.push(t('weekly.narrative.bestMapText', { map: recap.bestMap.key, percent: recap.bestMap.winrate.toFixed(0) }));
  }
  if (recap.worstMap) {
    parts.push(t('weekly.narrative.worstMapText', { map: recap.worstMap.key, percent: recap.worstMap.winrate.toFixed(0) }));
  }
  if (recap.bestKd !== null) {
    parts.push(t('weekly.narrative.bestKdText', { kd: recap.bestKd.toFixed(2) }));
  }

  if (parts.length === 0) return null;
  return `${parts.join(', ')}.`.replace(/^./, (c) => c.toUpperCase());
}

function rankParagraph(t, currentRank, previousRank) {
  if (!currentRank) return null;
  const currentText = `${currentRank.tierName} (${currentRank.rr} RR)`;

  if (!previousRank) {
    return t('weekly.narrative.rankFirstSnapshot', { current: currentText });
  }

  const previousText = `${previousRank.tierName} (${previousRank.rr} RR)`;
  const sameTier = previousRank.tierId === currentRank.tierId;

  if (sameTier && previousRank.rr === currentRank.rr) {
    return t('weekly.narrative.rankUnchanged', { current: currentText });
  }
  if (sameTier) {
    return currentRank.rr > previousRank.rr
      ? t('weekly.narrative.rankUp', { previous: previousText, current: currentText })
      : t('weekly.narrative.rankDown', { previous: previousText, current: currentText });
  }
  return currentRank.tierId > previousRank.tierId
    ? t('weekly.narrative.rankUp', { previous: previousText, current: currentText })
    : t('weekly.narrative.rankDown', { previous: previousText, current: currentText });
}

export function generateNarrative(t, recap, currentRank, previousRank) {
  const paragraphs = [overviewParagraph(t, recap)];
  const highlights = highlightsParagraph(t, recap);
  if (highlights) paragraphs.push(highlights);
  const rankText = rankParagraph(t, currentRank, previousRank);
  if (rankText) paragraphs.push(rankText);
  return paragraphs;
}
