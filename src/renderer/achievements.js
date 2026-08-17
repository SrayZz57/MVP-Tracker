function formatDate(ms) {
  if (!ms) return '?';
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function recordContext(record, extra) {
  if (!record) return null;
  const parts = [record.agent, record.map, record.roundNumber ? `round ${record.roundNumber}` : null, extra].filter(
    Boolean,
  );
  parts.push(formatDate(record.date));
  return parts.join(' — ');
}

function streakContext(streak) {
  if (!streak) return null;
  return `Du ${formatDate(streak.startDate)} au ${formatDate(streak.endDate)}`;
}

// 21 succès répartis en 9 groupes, tous dérivés de computeHallOfFame() — pas
// de seuil inventé sur des données qu'on n'a pas (pas de "précision globale"
// par ex., puisque Riot n'expose pas les tirs manqués ailleurs dans l'appli
// non plus).
export const ACHIEVEMENT_GROUPS = [
  {
    label: 'Multi-kills',
    items: [
      {
        id: 'triple',
        icon: '💢',
        title: 'Triple kill',
        description: '3 kills en un seul round',
        value: (hof) => hof.bestAce?.kills ?? 0,
        threshold: 3,
        context: (hof) => recordContext(hof.bestAce),
      },
      {
        id: 'quadra',
        icon: '⚡',
        title: 'Quadra kill',
        description: '4 kills en un seul round',
        value: (hof) => hof.bestAce?.kills ?? 0,
        threshold: 4,
        context: (hof) => recordContext(hof.bestAce),
      },
      {
        id: 'ace',
        icon: '💥',
        title: 'Ace',
        description: '5 kills en un seul round',
        value: (hof) => hof.bestAce?.kills ?? 0,
        threshold: 5,
        context: (hof) => recordContext(hof.bestAce),
      },
    ],
  },
  {
    label: 'Séries de victoires',
    items: [
      {
        id: 'streak3',
        icon: '🔥',
        title: 'Série de 3',
        description: "3 victoires d'affilée",
        value: (hof) => hof.longestWinStreak?.streak ?? 0,
        threshold: 3,
        context: (hof) => streakContext(hof.longestWinStreak),
      },
      {
        id: 'streak5',
        icon: '🔥',
        title: 'Série de 5',
        description: "5 victoires d'affilée",
        value: (hof) => hof.longestWinStreak?.streak ?? 0,
        threshold: 5,
        context: (hof) => streakContext(hof.longestWinStreak),
      },
      {
        id: 'streak8',
        icon: '🌋',
        title: 'Série de 8',
        description: "8 victoires d'affilée",
        value: (hof) => hof.longestWinStreak?.streak ?? 0,
        threshold: 8,
        context: (hof) => streakContext(hof.longestWinStreak),
      },
    ],
  },
  {
    label: 'Clutchs',
    items: [
      {
        id: 'clutch1',
        icon: '🎯',
        title: 'Clutch 1v1',
        description: 'Gagner un round en infériorité 1v1',
        value: (hof) => hof.bestClutch?.enemies ?? 0,
        threshold: 1,
        context: (hof) => recordContext(hof.bestClutch),
      },
      {
        id: 'clutch2',
        icon: '🎯',
        title: 'Clutch 1v2',
        description: 'Gagner un round en infériorité 1v2',
        value: (hof) => hof.bestClutch?.enemies ?? 0,
        threshold: 2,
        context: (hof) => recordContext(hof.bestClutch),
      },
      {
        id: 'clutch3',
        icon: '🎯',
        title: 'Clutch 1v3',
        description: 'Gagner un round en infériorité 1v3',
        value: (hof) => hof.bestClutch?.enemies ?? 0,
        threshold: 3,
        context: (hof) => recordContext(hof.bestClutch),
      },
      {
        id: 'clutch4',
        icon: '👑',
        title: 'Clutch légendaire',
        description: 'Gagner un round en infériorité 1v4 ou plus',
        value: (hof) => hof.bestClutch?.enemies ?? 0,
        threshold: 4,
        context: (hof) => recordContext(hof.bestClutch),
      },
    ],
  },
  {
    label: 'KDA sur un match',
    items: [
      {
        id: 'kda2',
        icon: '⭐',
        title: 'KDA 2.0+',
        description: '(kills + assists) / morts ≥ 2 sur un match',
        value: (hof) => hof.bestKda?.kda ?? 0,
        threshold: 2,
        context: (hof) => recordContext(hof.bestKda, hof.bestKda && `KDA ${hof.bestKda.kda.toFixed(2)}`),
      },
      {
        id: 'kda3',
        icon: '⭐',
        title: 'KDA 3.0+',
        description: '(kills + assists) / morts ≥ 3 sur un match',
        value: (hof) => hof.bestKda?.kda ?? 0,
        threshold: 3,
        context: (hof) => recordContext(hof.bestKda, hof.bestKda && `KDA ${hof.bestKda.kda.toFixed(2)}`),
      },
      {
        id: 'kda4',
        icon: '🌟',
        title: 'KDA 4.0+',
        description: '(kills + assists) / morts ≥ 4 sur un match',
        value: (hof) => hof.bestKda?.kda ?? 0,
        threshold: 4,
        context: (hof) => recordContext(hof.bestKda, hof.bestKda && `KDA ${hof.bestKda.kda.toFixed(2)}`),
      },
    ],
  },
  {
    label: 'Précision',
    items: [
      {
        id: 'hs30',
        icon: '🎯',
        title: '30% précision tête',
        description: '30%+ de headshots sur un match',
        value: (hof) => hof.bestHsPercent?.hsPercent ?? 0,
        threshold: 30,
        context: (hof) => recordContext(hof.bestHsPercent, hof.bestHsPercent && `${hof.bestHsPercent.hsPercent.toFixed(0)}%`),
      },
      {
        id: 'hs50',
        icon: '🎯',
        title: '50% précision tête',
        description: '50%+ de headshots sur un match',
        value: (hof) => hof.bestHsPercent?.hsPercent ?? 0,
        threshold: 50,
        context: (hof) => recordContext(hof.bestHsPercent, hof.bestHsPercent && `${hof.bestHsPercent.hsPercent.toFixed(0)}%`),
      },
    ],
  },
  {
    label: 'Kills sur un match',
    items: [
      {
        id: 'kills20',
        icon: '🔫',
        title: '20+ kills',
        description: '20 kills ou plus sur un seul match',
        value: (hof) => hof.bestKillsMatch?.kills ?? 0,
        threshold: 20,
        context: (hof) => recordContext(hof.bestKillsMatch),
      },
      {
        id: 'kills25',
        icon: '🔫',
        title: '25+ kills',
        description: '25 kills ou plus sur un seul match',
        value: (hof) => hof.bestKillsMatch?.kills ?? 0,
        threshold: 25,
        context: (hof) => recordContext(hof.bestKillsMatch),
      },
    ],
  },
  {
    label: 'Distance',
    items: [
      {
        id: 'dist30',
        icon: '🔭',
        title: 'Kill à 30m+',
        description: 'Un kill à 30 mètres ou plus',
        value: (hof) => hof.bestKillDistance?.distance ?? 0,
        threshold: 30,
        context: (hof) =>
          recordContext(hof.bestKillDistance, hof.bestKillDistance && `${hof.bestKillDistance.distance.toFixed(0)}m — ${hof.bestKillDistance.weapon ?? '?'}`),
      },
      {
        id: 'dist45',
        icon: '🏹',
        title: 'Kill à 45m+',
        description: 'Un kill à 45 mètres ou plus',
        value: (hof) => hof.bestKillDistance?.distance ?? 0,
        threshold: 45,
        context: (hof) =>
          recordContext(hof.bestKillDistance, hof.bestKillDistance && `${hof.bestKillDistance.distance.toFixed(0)}m — ${hof.bestKillDistance.weapon ?? '?'}`),
      },
    ],
  },
  {
    label: 'Polyvalence',
    items: [
      {
        id: 'agents5',
        icon: '🔄',
        title: '5 agents joués',
        description: '5 agents différents dans ton historique',
        value: (hof) => hof.agentDiversity ?? 0,
        threshold: 5,
        context: (hof) => `${hof.agentDiversity} agent(s) différents joués`,
      },
      {
        id: 'agents10',
        icon: '🎭',
        title: '10 agents joués',
        description: '10 agents différents dans ton historique',
        value: (hof) => hof.agentDiversity ?? 0,
        threshold: 10,
        context: (hof) => `${hof.agentDiversity} agent(s) différents joués`,
      },
    ],
  },
  {
    label: 'Perfection',
    items: [
      {
        id: 'perfect',
        icon: '✨',
        title: 'Match parfait',
        description: 'Gagner un match sans mourir une seule fois',
        value: (hof) => (hof.bestPerfectMatch ? 1 : 0),
        threshold: 1,
        context: (hof) => recordContext(hof.bestPerfectMatch, hof.bestPerfectMatch && `${hof.bestPerfectMatch.kills} kills`),
      },
    ],
  },
];

export function deriveAchievements(hof) {
  return ACHIEVEMENT_GROUPS.map((group) => ({
    label: group.label,
    items: group.items.map((item) => {
      const unlocked = item.value(hof) >= item.threshold;
      return { ...item, unlocked, contextText: unlocked ? item.context(hof) : null };
    }),
  }));
}
