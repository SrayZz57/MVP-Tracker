function formatDate(t, i18nLang, ms) {
  if (!ms) return '?';
  return new Date(ms).toLocaleDateString(i18nLang === 'en' ? 'en-US' : 'fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function recordContext(t, i18nLang, record, extra) {
  if (!record) return null;
  const parts = [
    record.agent,
    record.map,
    record.roundNumber ? t('hallOfFame.roundLabel', { n: record.roundNumber }) : null,
    extra,
  ].filter(Boolean);
  parts.push(formatDate(t, i18nLang, record.date));
  return parts.join(' — ');
}

function streakContext(t, i18nLang, streak) {
  if (!streak) return null;
  return t('hallOfFame.streakRange', {
    start: formatDate(t, i18nLang, streak.startDate),
    end: formatDate(t, i18nLang, streak.endDate),
  });
}

function formatHours(seconds) {
  return (seconds / 3600).toFixed(0);
}

// Tous dérivés de computeHallOfFame() — pas de seuil inventé sur des données
// qu'on n'a pas (pas de "précision globale" par ex., puisque Riot n'expose
// pas les tirs manqués ailleurs dans l'appli non plus). Les groupes "carrière"
// (volume, temps de jeu, maîtrise...) s'ajoutent aux records ponctuels pour
// donner des objectifs à long terme plutôt que juste des exploits ponctuels.
// Titres/descriptions résolus via t('hallOfFame.groups.<group>.items.<id>.*'),
// contextes construits à l'affichage (deriveAchievements) car ils dépendent
// de hof + t.
function buildGroups(t, i18nLang) {
  const rc = (record, extra) => recordContext(t, i18nLang, record, extra);
  const sc = (streak) => streakContext(t, i18nLang, streak);

  return [
    {
      key: 'multiKills',
      items: [
        { id: 'triple', icon: '💢', value: (hof) => hof.bestAce?.kills ?? 0, threshold: 3, context: (hof) => rc(hof.bestAce) },
        { id: 'quadra', icon: '⚡', value: (hof) => hof.bestAce?.kills ?? 0, threshold: 4, context: (hof) => rc(hof.bestAce) },
        { id: 'ace', icon: '💥', value: (hof) => hof.bestAce?.kills ?? 0, threshold: 5, context: (hof) => rc(hof.bestAce) },
      ],
    },
    {
      key: 'winStreaks',
      items: [
        { id: 'streak3', icon: '🔥', value: (hof) => hof.longestWinStreak?.streak ?? 0, threshold: 3, context: (hof) => sc(hof.longestWinStreak) },
        { id: 'streak5', icon: '🔥', value: (hof) => hof.longestWinStreak?.streak ?? 0, threshold: 5, context: (hof) => sc(hof.longestWinStreak) },
        { id: 'streak8', icon: '🌋', value: (hof) => hof.longestWinStreak?.streak ?? 0, threshold: 8, context: (hof) => sc(hof.longestWinStreak) },
      ],
    },
    {
      key: 'clutches',
      items: [
        { id: 'clutch1', icon: '🎯', value: (hof) => hof.bestClutch?.enemies ?? 0, threshold: 1, context: (hof) => rc(hof.bestClutch) },
        { id: 'clutch2', icon: '🎯', value: (hof) => hof.bestClutch?.enemies ?? 0, threshold: 2, context: (hof) => rc(hof.bestClutch) },
        { id: 'clutch3', icon: '🎯', value: (hof) => hof.bestClutch?.enemies ?? 0, threshold: 3, context: (hof) => rc(hof.bestClutch) },
        { id: 'clutch4', icon: '👑', value: (hof) => hof.bestClutch?.enemies ?? 0, threshold: 4, context: (hof) => rc(hof.bestClutch) },
      ],
    },
    {
      key: 'kdaMatch',
      items: [
        { id: 'kda2', icon: '⭐', value: (hof) => hof.bestKda?.kda ?? 0, threshold: 2, context: (hof) => rc(hof.bestKda, hof.bestKda && t('hallOfFame.kdaExtra', { value: hof.bestKda.kda.toFixed(2) })) },
        { id: 'kda3', icon: '⭐', value: (hof) => hof.bestKda?.kda ?? 0, threshold: 3, context: (hof) => rc(hof.bestKda, hof.bestKda && t('hallOfFame.kdaExtra', { value: hof.bestKda.kda.toFixed(2) })) },
        { id: 'kda4', icon: '🌟', value: (hof) => hof.bestKda?.kda ?? 0, threshold: 4, context: (hof) => rc(hof.bestKda, hof.bestKda && t('hallOfFame.kdaExtra', { value: hof.bestKda.kda.toFixed(2) })) },
        { id: 'kda5', icon: '🌟', value: (hof) => hof.bestKda?.kda ?? 0, threshold: 5, context: (hof) => rc(hof.bestKda, hof.bestKda && t('hallOfFame.kdaExtra', { value: hof.bestKda.kda.toFixed(2) })) },
      ],
    },
    {
      key: 'accuracy',
      items: [
        { id: 'hs30', icon: '🎯', value: (hof) => hof.bestHsPercent?.hsPercent ?? 0, threshold: 30, context: (hof) => rc(hof.bestHsPercent, hof.bestHsPercent && `${hof.bestHsPercent.hsPercent.toFixed(0)}%`) },
        {
          id: 'longrangeduel',
          icon: '🔭',
          value: (hof) => (hof.longRangeDuels && hof.longRangeDuels.total >= 5 ? hof.longRangeDuels.winrate : 0),
          threshold: 50,
          context: (hof) => hof.longRangeDuels && t('hallOfFame.longRangeDuelContext', { percent: hof.longRangeDuels.winrate.toFixed(0), count: hof.longRangeDuels.total }),
        },
        {
          id: 'verylongrangeduel',
          icon: '🏹',
          value: (hof) => (hof.veryLongRangeDuels && hof.veryLongRangeDuels.total >= 5 ? hof.veryLongRangeDuels.winrate : 0),
          threshold: 60,
          context: (hof) => hof.veryLongRangeDuels && t('hallOfFame.veryLongRangeDuelContext', { percent: hof.veryLongRangeDuels.winrate.toFixed(0), count: hof.veryLongRangeDuels.total }),
        },
        { id: 'careerHs20', icon: '🎯', value: (hof) => hof.careerHsPercent ?? 0, threshold: 20, context: (hof) => t('hallOfFame.careerHsContext', { percent: hof.careerHsPercent?.toFixed(1) }) },
        { id: 'careerHs28', icon: '🎯', value: (hof) => hof.careerHsPercent ?? 0, threshold: 28, context: (hof) => t('hallOfFame.careerHsContext', { percent: hof.careerHsPercent?.toFixed(1) }) },
      ],
    },
    {
      key: 'killsPerMatch',
      items: [
        { id: 'kills20', icon: '🔫', value: (hof) => hof.bestKillsMatch?.kills ?? 0, threshold: 20, context: (hof) => rc(hof.bestKillsMatch) },
        { id: 'kills25', icon: '🔫', value: (hof) => hof.bestKillsMatch?.kills ?? 0, threshold: 25, context: (hof) => rc(hof.bestKillsMatch) },
        { id: 'kills30', icon: '☠️', value: (hof) => hof.bestKillsMatch?.kills ?? 0, threshold: 30, context: (hof) => rc(hof.bestKillsMatch) },
      ],
    },
    {
      key: 'distance',
      items: [
        { id: 'dist30', icon: '🔭', value: (hof) => hof.bestKillDistance?.distance ?? 0, threshold: 30, context: (hof) => rc(hof.bestKillDistance, hof.bestKillDistance && t('hallOfFame.distanceExtra', { distance: hof.bestKillDistance.distance.toFixed(0), weapon: hof.bestKillDistance.weapon ?? '?' })) },
        { id: 'dist45', icon: '🏹', value: (hof) => hof.bestKillDistance?.distance ?? 0, threshold: 45, context: (hof) => rc(hof.bestKillDistance, hof.bestKillDistance && t('hallOfFame.distanceExtra', { distance: hof.bestKillDistance.distance.toFixed(0), weapon: hof.bestKillDistance.weapon ?? '?' })) },
        { id: 'dist60', icon: '🏹', value: (hof) => hof.bestKillDistance?.distance ?? 0, threshold: 60, context: (hof) => rc(hof.bestKillDistance, hof.bestKillDistance && t('hallOfFame.distanceExtra', { distance: hof.bestKillDistance.distance.toFixed(0), weapon: hof.bestKillDistance.weapon ?? '?' })) },
      ],
    },
    {
      key: 'versatility',
      items: [
        { id: 'agents5', icon: '🔄', value: (hof) => hof.agentDiversity ?? 0, threshold: 5, context: (hof) => t('hallOfFame.agentsPlayedContext', { count: hof.agentDiversity }) },
        { id: 'agents10', icon: '🎭', value: (hof) => hof.agentDiversity ?? 0, threshold: 10, context: (hof) => t('hallOfFame.agentsPlayedContext', { count: hof.agentDiversity }) },
        { id: 'agents15', icon: '🎭', value: (hof) => hof.agentDiversity ?? 0, threshold: 15, context: (hof) => t('hallOfFame.agentsPlayedContext', { count: hof.agentDiversity }) },
        { id: 'maps5', icon: '🗺️', value: (hof) => hof.mapsPlayedCount ?? 0, threshold: 5, context: (hof) => t('hallOfFame.mapsPlayedContext', { count: hof.mapsPlayedCount }) },
        { id: 'maps8', icon: '🗺️', value: (hof) => hof.mapsPlayedCount ?? 0, threshold: 8, context: (hof) => t('hallOfFame.mapsPlayedContext', { count: hof.mapsPlayedCount }) },
        { id: 'modes3', icon: '🎮', value: (hof) => hof.modesPlayedCount ?? 0, threshold: 3, context: (hof) => t('hallOfFame.modesPlayedContext', { count: hof.modesPlayedCount }) },
        { id: 'modes5', icon: '🎮', value: (hof) => hof.modesPlayedCount ?? 0, threshold: 5, context: (hof) => t('hallOfFame.modesPlayedContext', { count: hof.modesPlayedCount }) },
      ],
    },
    {
      key: 'perfection',
      items: [
        { id: 'perfect', icon: '✨', value: (hof) => (hof.bestPerfectMatch ? 1 : 0), threshold: 1, context: (hof) => rc(hof.bestPerfectMatch, hof.bestPerfectMatch && t('detail.killsCount', { count: hof.bestPerfectMatch.kills })) },
      ],
    },
    {
      key: 'matchVolume',
      items: [
        { id: 'matches10', icon: '🏁', value: (hof) => hof.totalMatches ?? 0, threshold: 10, context: (hof) => t('hallOfFame.matchesTotalContext', { count: hof.totalMatches }) },
        { id: 'matches50', icon: '🏁', value: (hof) => hof.totalMatches ?? 0, threshold: 50, context: (hof) => t('hallOfFame.matchesTotalContext', { count: hof.totalMatches }) },
        { id: 'matches100', icon: '🏁', value: (hof) => hof.totalMatches ?? 0, threshold: 100, context: (hof) => t('hallOfFame.matchesTotalContext', { count: hof.totalMatches }) },
        { id: 'matches250', icon: '🎖️', value: (hof) => hof.totalMatches ?? 0, threshold: 250, context: (hof) => t('hallOfFame.matchesTotalContext', { count: hof.totalMatches }) },
        { id: 'matches500', icon: '🎖️', value: (hof) => hof.totalMatches ?? 0, threshold: 500, context: (hof) => t('hallOfFame.matchesTotalContext', { count: hof.totalMatches }) },
      ],
    },
    {
      key: 'totalWins',
      items: [
        { id: 'wins10', icon: '🏆', value: (hof) => hof.totalWins ?? 0, threshold: 10, context: (hof) => t('hallOfFame.winsTotalContext', { count: hof.totalWins }) },
        { id: 'wins50', icon: '🏆', value: (hof) => hof.totalWins ?? 0, threshold: 50, context: (hof) => t('hallOfFame.winsTotalContext', { count: hof.totalWins }) },
        { id: 'wins100', icon: '🏆', value: (hof) => hof.totalWins ?? 0, threshold: 100, context: (hof) => t('hallOfFame.winsTotalContext', { count: hof.totalWins }) },
        { id: 'wins250', icon: '👑', value: (hof) => hof.totalWins ?? 0, threshold: 250, context: (hof) => t('hallOfFame.winsTotalContext', { count: hof.totalWins }) },
      ],
    },
    {
      key: 'totalKills',
      items: [
        { id: 'totalkills100', icon: '🔫', value: (hof) => hof.totalKills ?? 0, threshold: 100, context: (hof) => t('hallOfFame.killsTotalContext', { count: hof.totalKills }) },
        { id: 'totalkills500', icon: '🔫', value: (hof) => hof.totalKills ?? 0, threshold: 500, context: (hof) => t('hallOfFame.killsTotalContext', { count: hof.totalKills }) },
        { id: 'totalkills1000', icon: '💀', value: (hof) => hof.totalKills ?? 0, threshold: 1000, context: (hof) => t('hallOfFame.killsTotalContext', { count: hof.totalKills }) },
        { id: 'totalkills2500', icon: '💀', value: (hof) => hof.totalKills ?? 0, threshold: 2500, context: (hof) => t('hallOfFame.killsTotalContext', { count: hof.totalKills }) },
        { id: 'totalkills5000', icon: '⚰️', value: (hof) => hof.totalKills ?? 0, threshold: 5000, context: (hof) => t('hallOfFame.killsTotalContext', { count: hof.totalKills }) },
      ],
    },
    {
      key: 'playtime',
      items: [
        { id: 'hours10', icon: '⏱️', value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600, threshold: 10, context: (hof) => t('hallOfFame.hoursTotalContext', { hours: formatHours(hof.totalPlaytimeSeconds) }) },
        { id: 'hours50', icon: '⏱️', value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600, threshold: 50, context: (hof) => t('hallOfFame.hoursTotalContext', { hours: formatHours(hof.totalPlaytimeSeconds) }) },
        { id: 'hours100', icon: '⌛', value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600, threshold: 100, context: (hof) => t('hallOfFame.hoursTotalContext', { hours: formatHours(hof.totalPlaytimeSeconds) }) },
        { id: 'hours250', icon: '⌛', value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600, threshold: 250, context: (hof) => t('hallOfFame.hoursTotalContext', { hours: formatHours(hof.totalPlaytimeSeconds) }) },
      ],
    },
    {
      key: 'agentMastery',
      items: [
        { id: 'agentkills100', icon: '🧬', value: (hof) => hof.maxAgentKills?.kills ?? 0, threshold: 100, context: (hof) => hof.maxAgentKills && t('hallOfFame.agentKillsContext', { count: hof.maxAgentKills.kills, agent: hof.maxAgentKills.agent }) },
        { id: 'agentkills500', icon: '🧬', value: (hof) => hof.maxAgentKills?.kills ?? 0, threshold: 500, context: (hof) => hof.maxAgentKills && t('hallOfFame.agentKillsContext', { count: hof.maxAgentKills.kills, agent: hof.maxAgentKills.agent }) },
        { id: 'agentkills1000', icon: '🧬', value: (hof) => hof.maxAgentKills?.kills ?? 0, threshold: 1000, context: (hof) => hof.maxAgentKills && t('hallOfFame.agentKillsContext', { count: hof.maxAgentKills.kills, agent: hof.maxAgentKills.agent }) },
        { id: 'agentgames10', icon: '💛', value: (hof) => hof.maxAgentGames?.games ?? 0, threshold: 10, context: (hof) => hof.maxAgentGames && t('hallOfFame.agentGamesContext', { count: hof.maxAgentGames.games, agent: hof.maxAgentGames.agent }) },
        { id: 'agentgames50', icon: '💛', value: (hof) => hof.maxAgentGames?.games ?? 0, threshold: 50, context: (hof) => hof.maxAgentGames && t('hallOfFame.agentGamesContext', { count: hof.maxAgentGames.games, agent: hof.maxAgentGames.agent }) },
        { id: 'agentgames100', icon: '💛', value: (hof) => hof.maxAgentGames?.games ?? 0, threshold: 100, context: (hof) => hof.maxAgentGames && t('hallOfFame.agentGamesContext', { count: hof.maxAgentGames.games, agent: hof.maxAgentGames.agent }) },
      ],
    },
    {
      key: 'weaponMastery',
      items: [
        { id: 'weaponkills50', icon: '🔧', value: (hof) => hof.maxWeaponKills?.kills ?? 0, threshold: 50, context: (hof) => hof.maxWeaponKills && t('hallOfFame.weaponKillsContext', { count: hof.maxWeaponKills.kills, weapon: hof.maxWeaponKills.weapon }) },
        { id: 'weaponkills150', icon: '🔧', value: (hof) => hof.maxWeaponKills?.kills ?? 0, threshold: 150, context: (hof) => hof.maxWeaponKills && t('hallOfFame.weaponKillsContext', { count: hof.maxWeaponKills.kills, weapon: hof.maxWeaponKills.weapon }) },
        { id: 'weaponkills300', icon: '🛠️', value: (hof) => hof.maxWeaponKills?.kills ?? 0, threshold: 300, context: (hof) => hof.maxWeaponKills && t('hallOfFame.weaponKillsContext', { count: hof.maxWeaponKills.kills, weapon: hof.maxWeaponKills.weapon }) },
      ],
    },
    {
      key: 'composure',
      items: [
        { id: 'clutches1', icon: '🧊', value: (hof) => hof.totalClutchWins ?? 0, threshold: 1, context: (hof) => t('hallOfFame.clutchesContext', { count: hof.totalClutchWins }) },
        { id: 'clutches5', icon: '🧊', value: (hof) => hof.totalClutchWins ?? 0, threshold: 5, context: (hof) => t('hallOfFame.clutchesContext', { count: hof.totalClutchWins }) },
        { id: 'clutches15', icon: '🥶', value: (hof) => hof.totalClutchWins ?? 0, threshold: 15, context: (hof) => t('hallOfFame.clutchesContext', { count: hof.totalClutchWins }) },
        { id: 'clutches30', icon: '🥶', value: (hof) => hof.totalClutchWins ?? 0, threshold: 30, context: (hof) => t('hallOfFame.clutchesContext', { count: hof.totalClutchWins }) },
      ],
    },
    {
      key: 'firstBlood',
      items: [
        { id: 'firstblood10', icon: '🩸', value: (hof) => hof.totalFirstBloods ?? 0, threshold: 10, context: (hof) => t('hallOfFame.firstBloodContext', { count: hof.totalFirstBloods }) },
        { id: 'firstblood50', icon: '🩸', value: (hof) => hof.totalFirstBloods ?? 0, threshold: 50, context: (hof) => t('hallOfFame.firstBloodContext', { count: hof.totalFirstBloods }) },
        { id: 'firstblood150', icon: '🩸', value: (hof) => hof.totalFirstBloods ?? 0, threshold: 150, context: (hof) => t('hallOfFame.firstBloodContext', { count: hof.totalFirstBloods }) },
      ],
    },
    {
      key: 'spike',
      items: [
        { id: 'plants10', icon: '💣', value: (hof) => hof.totalPlants ?? 0, threshold: 10, context: (hof) => t('hallOfFame.plantsContext', { count: hof.totalPlants }) },
        { id: 'plants50', icon: '💣', value: (hof) => hof.totalPlants ?? 0, threshold: 50, context: (hof) => t('hallOfFame.plantsContext', { count: hof.totalPlants }) },
        { id: 'plants150', icon: '💣', value: (hof) => hof.totalPlants ?? 0, threshold: 150, context: (hof) => t('hallOfFame.plantsContext', { count: hof.totalPlants }) },
        { id: 'defuses5', icon: '✂️', value: (hof) => hof.totalDefuses ?? 0, threshold: 5, context: (hof) => t('hallOfFame.defusesContext', { count: hof.totalDefuses }) },
        { id: 'defuses25', icon: '✂️', value: (hof) => hof.totalDefuses ?? 0, threshold: 25, context: (hof) => t('hallOfFame.defusesContext', { count: hof.totalDefuses }) },
        { id: 'defuses75', icon: '✂️', value: (hof) => hof.totalDefuses ?? 0, threshold: 75, context: (hof) => t('hallOfFame.defusesContext', { count: hof.totalDefuses }) },
      ],
    },
    {
      key: 'endurance',
      items: [
        { id: 'overtime', icon: '🕰️', value: (hof) => hof.longestMatch?.rounds ?? 0, threshold: 16, context: (hof) => hof.longestMatch && t('hallOfFame.overtimeContext', { rounds: hof.longestMatch.rounds, map: hof.longestMatch.map, date: formatDate(t, i18nLang, hof.longestMatch.date) }) },
        { id: 'doubleovertime', icon: '🕰️', value: (hof) => hof.longestMatch?.rounds ?? 0, threshold: 24, context: (hof) => hof.longestMatch && t('hallOfFame.overtimeContext', { rounds: hof.longestMatch.rounds, map: hof.longestMatch.map, date: formatDate(t, i18nLang, hof.longestMatch.date) }) },
      ],
    },
  ];
}

// Trie chaque groupe : débloqués d'abord (dans leur ordre de définition),
// puis verrouillés du plus proche du déblocage au plus loin — pour que la
// prochaine étape logique saute aux yeux plutôt que de scroller 75 succès
// dans un ordre figé.
export function deriveAchievements(t, i18nLang, hof) {
  const groups = buildGroups(t, i18nLang);
  return groups.map((group) => {
    const items = group.items.map((item) => {
      const value = item.value(hof) ?? 0;
      const unlocked = value >= item.threshold;
      const progressPercent = item.threshold > 0 ? Math.min(100, Math.max(0, (value / item.threshold) * 100)) : 0;
      return {
        ...item,
        title: t(`hallOfFame.groups.${group.key}.items.${item.id}.title`),
        description: t(`hallOfFame.groups.${group.key}.items.${item.id}.description`),
        unlocked,
        contextText: unlocked ? item.context(hof) : null,
        progressPercent,
      };
    });
    const sorted = [...items].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (!a.unlocked) return b.progressPercent - a.progressPercent;
      return 0;
    });
    const unlockedCount = items.filter((i) => i.unlocked).length;
    return { key: group.key, label: t(`hallOfFame.groups.${group.key}.label`), items: sorted, unlockedCount, total: items.length };
  });
}
