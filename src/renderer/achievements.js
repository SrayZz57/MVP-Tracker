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

function formatHours(seconds) {
  return (seconds / 3600).toFixed(0);
}

// Tous dérivés de computeHallOfFame() — pas de seuil inventé sur des données
// qu'on n'a pas (pas de "précision globale" par ex., puisque Riot n'expose
// pas les tirs manqués ailleurs dans l'appli non plus). Les groupes "carrière"
// (volume, temps de jeu, maîtrise...) s'ajoutent aux records ponctuels pour
// donner des objectifs à long terme plutôt que juste des exploits ponctuels.
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
      {
        id: 'kda5',
        icon: '🌟',
        title: 'KDA 5.0+',
        description: '(kills + assists) / morts ≥ 5 sur un match',
        value: (hof) => hof.bestKda?.kda ?? 0,
        threshold: 5,
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
        id: 'longrangeduel',
        icon: '🔭',
        title: 'Sniper occasionnel',
        description: 'Winrate ≥ 50% dans tes duels longue portée (20-35m), sur au moins 5 duels',
        value: (hof) => (hof.longRangeDuels && hof.longRangeDuels.total >= 5 ? hof.longRangeDuels.winrate : 0),
        threshold: 50,
        context: (hof) =>
          hof.longRangeDuels && `${hof.longRangeDuels.winrate.toFixed(0)}% de winrate sur ${hof.longRangeDuels.total} duels longue portée`,
      },
      {
        id: 'verylongrangeduel',
        icon: '🏹',
        title: 'Sniper d\'élite',
        description: 'Winrate ≥ 60% dans tes duels très longue portée (35m+), sur au moins 5 duels',
        value: (hof) => (hof.veryLongRangeDuels && hof.veryLongRangeDuels.total >= 5 ? hof.veryLongRangeDuels.winrate : 0),
        threshold: 60,
        context: (hof) =>
          hof.veryLongRangeDuels && `${hof.veryLongRangeDuels.winrate.toFixed(0)}% de winrate sur ${hof.veryLongRangeDuels.total} duels très longue portée`,
      },
      {
        id: 'careerHs20',
        icon: '🎯',
        title: '20% précision tête (carrière)',
        description: 'Moyenne de précision tête ≥ 20% sur tout ton historique',
        value: (hof) => hof.careerHsPercent ?? 0,
        threshold: 20,
        context: (hof) => `${hof.careerHsPercent?.toFixed(1)}% de moyenne carrière`,
      },
      {
        id: 'careerHs28',
        icon: '🎯',
        title: '28% précision tête (carrière)',
        description: 'Moyenne de précision tête ≥ 28% sur tout ton historique',
        value: (hof) => hof.careerHsPercent ?? 0,
        threshold: 28,
        context: (hof) => `${hof.careerHsPercent?.toFixed(1)}% de moyenne carrière`,
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
      {
        id: 'kills30',
        icon: '☠️',
        title: '30+ kills',
        description: '30 kills ou plus sur un seul match',
        value: (hof) => hof.bestKillsMatch?.kills ?? 0,
        threshold: 30,
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
      {
        id: 'dist60',
        icon: '🏹',
        title: 'Kill à 60m+',
        description: 'Un kill à 60 mètres ou plus — quasi la traversée d\'une map',
        value: (hof) => hof.bestKillDistance?.distance ?? 0,
        threshold: 60,
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
      {
        id: 'agents15',
        icon: '🎭',
        title: '15 agents joués',
        description: '15 agents différents dans ton historique',
        value: (hof) => hof.agentDiversity ?? 0,
        threshold: 15,
        context: (hof) => `${hof.agentDiversity} agent(s) différents joués`,
      },
      {
        id: 'maps5',
        icon: '🗺️',
        title: '5 maps différentes',
        description: '5 maps différentes dans ton historique',
        value: (hof) => hof.mapsPlayedCount ?? 0,
        threshold: 5,
        context: (hof) => `${hof.mapsPlayedCount} map(s) différentes jouées`,
      },
      {
        id: 'maps8',
        icon: '🗺️',
        title: '8 maps différentes',
        description: '8 maps différentes dans ton historique',
        value: (hof) => hof.mapsPlayedCount ?? 0,
        threshold: 8,
        context: (hof) => `${hof.mapsPlayedCount} map(s) différentes jouées`,
      },
      {
        id: 'modes3',
        icon: '🎮',
        title: '3 modes de jeu',
        description: '3 modes de jeu différents essayés',
        value: (hof) => hof.modesPlayedCount ?? 0,
        threshold: 3,
        context: (hof) => `${hof.modesPlayedCount} mode(s) différents essayés`,
      },
      {
        id: 'modes5',
        icon: '🎮',
        title: '5 modes de jeu',
        description: '5 modes de jeu différents essayés',
        value: (hof) => hof.modesPlayedCount ?? 0,
        threshold: 5,
        context: (hof) => `${hof.modesPlayedCount} mode(s) différents essayés`,
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
  {
    label: 'Volume de matchs',
    items: [
      {
        id: 'matches10',
        icon: '🏁',
        title: '10 matchs joués',
        description: '10 matchs dans ton historique',
        value: (hof) => hof.totalMatches ?? 0,
        threshold: 10,
        context: (hof) => `${hof.totalMatches} matchs au total`,
      },
      {
        id: 'matches50',
        icon: '🏁',
        title: '50 matchs joués',
        description: '50 matchs dans ton historique',
        value: (hof) => hof.totalMatches ?? 0,
        threshold: 50,
        context: (hof) => `${hof.totalMatches} matchs au total`,
      },
      {
        id: 'matches100',
        icon: '🏁',
        title: '100 matchs joués',
        description: '100 matchs dans ton historique',
        value: (hof) => hof.totalMatches ?? 0,
        threshold: 100,
        context: (hof) => `${hof.totalMatches} matchs au total`,
      },
      {
        id: 'matches250',
        icon: '🎖️',
        title: '250 matchs joués',
        description: '250 matchs dans ton historique',
        value: (hof) => hof.totalMatches ?? 0,
        threshold: 250,
        context: (hof) => `${hof.totalMatches} matchs au total`,
      },
      {
        id: 'matches500',
        icon: '🎖️',
        title: '500 matchs joués',
        description: '500 matchs dans ton historique',
        value: (hof) => hof.totalMatches ?? 0,
        threshold: 500,
        context: (hof) => `${hof.totalMatches} matchs au total`,
      },
    ],
  },
  {
    label: 'Victoires cumulées',
    items: [
      {
        id: 'wins10',
        icon: '🏆',
        title: '10 victoires',
        description: '10 matchs gagnés au total',
        value: (hof) => hof.totalWins ?? 0,
        threshold: 10,
        context: (hof) => `${hof.totalWins} victoires au total`,
      },
      {
        id: 'wins50',
        icon: '🏆',
        title: '50 victoires',
        description: '50 matchs gagnés au total',
        value: (hof) => hof.totalWins ?? 0,
        threshold: 50,
        context: (hof) => `${hof.totalWins} victoires au total`,
      },
      {
        id: 'wins100',
        icon: '🏆',
        title: '100 victoires',
        description: '100 matchs gagnés au total',
        value: (hof) => hof.totalWins ?? 0,
        threshold: 100,
        context: (hof) => `${hof.totalWins} victoires au total`,
      },
      {
        id: 'wins250',
        icon: '👑',
        title: '250 victoires',
        description: '250 matchs gagnés au total',
        value: (hof) => hof.totalWins ?? 0,
        threshold: 250,
        context: (hof) => `${hof.totalWins} victoires au total`,
      },
    ],
  },
  {
    label: 'Kills cumulés',
    items: [
      {
        id: 'totalkills100',
        icon: '🔫',
        title: '100 kills',
        description: '100 kills au total sur tout ton historique',
        value: (hof) => hof.totalKills ?? 0,
        threshold: 100,
        context: (hof) => `${hof.totalKills} kills au total`,
      },
      {
        id: 'totalkills500',
        icon: '🔫',
        title: '500 kills',
        description: '500 kills au total sur tout ton historique',
        value: (hof) => hof.totalKills ?? 0,
        threshold: 500,
        context: (hof) => `${hof.totalKills} kills au total`,
      },
      {
        id: 'totalkills1000',
        icon: '💀',
        title: '1000 kills',
        description: '1000 kills au total sur tout ton historique',
        value: (hof) => hof.totalKills ?? 0,
        threshold: 1000,
        context: (hof) => `${hof.totalKills} kills au total`,
      },
      {
        id: 'totalkills2500',
        icon: '💀',
        title: '2500 kills',
        description: '2500 kills au total sur tout ton historique',
        value: (hof) => hof.totalKills ?? 0,
        threshold: 2500,
        context: (hof) => `${hof.totalKills} kills au total`,
      },
      {
        id: 'totalkills5000',
        icon: '⚰️',
        title: '5000 kills',
        description: '5000 kills au total sur tout ton historique',
        value: (hof) => hof.totalKills ?? 0,
        threshold: 5000,
        context: (hof) => `${hof.totalKills} kills au total`,
      },
    ],
  },
  {
    label: 'Temps de jeu',
    items: [
      {
        id: 'hours10',
        icon: '⏱️',
        title: '10 heures de jeu',
        description: '10 heures cumulées dans ton historique',
        value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600,
        threshold: 10,
        context: (hof) => `${formatHours(hof.totalPlaytimeSeconds)}h au total`,
      },
      {
        id: 'hours50',
        icon: '⏱️',
        title: '50 heures de jeu',
        description: '50 heures cumulées dans ton historique',
        value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600,
        threshold: 50,
        context: (hof) => `${formatHours(hof.totalPlaytimeSeconds)}h au total`,
      },
      {
        id: 'hours100',
        icon: '⌛',
        title: '100 heures de jeu',
        description: '100 heures cumulées dans ton historique',
        value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600,
        threshold: 100,
        context: (hof) => `${formatHours(hof.totalPlaytimeSeconds)}h au total`,
      },
      {
        id: 'hours250',
        icon: '⌛',
        title: '250 heures de jeu',
        description: '250 heures cumulées dans ton historique',
        value: (hof) => (hof.totalPlaytimeSeconds ?? 0) / 3600,
        threshold: 250,
        context: (hof) => `${formatHours(hof.totalPlaytimeSeconds)}h au total`,
      },
    ],
  },
  {
    label: 'Maîtrise d\'agent',
    items: [
      {
        id: 'agentkills100',
        icon: '🧬',
        title: '100 kills avec un agent',
        description: '100 kills cumulés avec ton agent le plus joué',
        value: (hof) => hof.maxAgentKills?.kills ?? 0,
        threshold: 100,
        context: (hof) => hof.maxAgentKills && `${hof.maxAgentKills.kills} kills avec ${hof.maxAgentKills.agent}`,
      },
      {
        id: 'agentkills500',
        icon: '🧬',
        title: '500 kills avec un agent',
        description: '500 kills cumulés avec ton agent le plus joué',
        value: (hof) => hof.maxAgentKills?.kills ?? 0,
        threshold: 500,
        context: (hof) => hof.maxAgentKills && `${hof.maxAgentKills.kills} kills avec ${hof.maxAgentKills.agent}`,
      },
      {
        id: 'agentkills1000',
        icon: '🧬',
        title: '1000 kills avec un agent',
        description: '1000 kills cumulés avec ton agent le plus joué',
        value: (hof) => hof.maxAgentKills?.kills ?? 0,
        threshold: 1000,
        context: (hof) => hof.maxAgentKills && `${hof.maxAgentKills.kills} kills avec ${hof.maxAgentKills.agent}`,
      },
      {
        id: 'agentgames10',
        icon: '💛',
        title: 'Agent de cœur',
        description: '10 parties avec le même agent',
        value: (hof) => hof.maxAgentGames?.games ?? 0,
        threshold: 10,
        context: (hof) => hof.maxAgentGames && `${hof.maxAgentGames.games} parties avec ${hof.maxAgentGames.agent}`,
      },
      {
        id: 'agentgames50',
        icon: '💛',
        title: 'Agent principal',
        description: '50 parties avec le même agent',
        value: (hof) => hof.maxAgentGames?.games ?? 0,
        threshold: 50,
        context: (hof) => hof.maxAgentGames && `${hof.maxAgentGames.games} parties avec ${hof.maxAgentGames.agent}`,
      },
      {
        id: 'agentgames100',
        icon: '💛',
        title: 'Agent signature',
        description: '100 parties avec le même agent',
        value: (hof) => hof.maxAgentGames?.games ?? 0,
        threshold: 100,
        context: (hof) => hof.maxAgentGames && `${hof.maxAgentGames.games} parties avec ${hof.maxAgentGames.agent}`,
      },
    ],
  },
  {
    label: 'Maîtrise d\'arme',
    items: [
      {
        id: 'weaponkills50',
        icon: '🔧',
        title: '50 kills avec une arme',
        description: '50 kills cumulés avec ton arme la plus utilisée',
        value: (hof) => hof.maxWeaponKills?.kills ?? 0,
        threshold: 50,
        context: (hof) => hof.maxWeaponKills && `${hof.maxWeaponKills.kills} kills avec ${hof.maxWeaponKills.weapon}`,
      },
      {
        id: 'weaponkills150',
        icon: '🔧',
        title: '150 kills avec une arme',
        description: '150 kills cumulés avec ton arme la plus utilisée',
        value: (hof) => hof.maxWeaponKills?.kills ?? 0,
        threshold: 150,
        context: (hof) => hof.maxWeaponKills && `${hof.maxWeaponKills.kills} kills avec ${hof.maxWeaponKills.weapon}`,
      },
      {
        id: 'weaponkills300',
        icon: '🛠️',
        title: '300 kills avec une arme',
        description: '300 kills cumulés avec ton arme la plus utilisée',
        value: (hof) => hof.maxWeaponKills?.kills ?? 0,
        threshold: 300,
        context: (hof) => hof.maxWeaponKills && `${hof.maxWeaponKills.kills} kills avec ${hof.maxWeaponKills.weapon}`,
      },
    ],
  },
  {
    label: 'Sang-froid',
    items: [
      {
        id: 'clutches1',
        icon: '🧊',
        title: 'Premier clutch',
        description: 'Gagner ton premier round en clutch',
        value: (hof) => hof.totalClutchWins ?? 0,
        threshold: 1,
        context: (hof) => `${hof.totalClutchWins} clutch(s) gagné(s) au total`,
      },
      {
        id: 'clutches5',
        icon: '🧊',
        title: '5 clutchs gagnés',
        description: '5 rounds gagnés en clutch au total',
        value: (hof) => hof.totalClutchWins ?? 0,
        threshold: 5,
        context: (hof) => `${hof.totalClutchWins} clutch(s) gagné(s) au total`,
      },
      {
        id: 'clutches15',
        icon: '🥶',
        title: '15 clutchs gagnés',
        description: '15 rounds gagnés en clutch au total',
        value: (hof) => hof.totalClutchWins ?? 0,
        threshold: 15,
        context: (hof) => `${hof.totalClutchWins} clutch(s) gagné(s) au total`,
      },
      {
        id: 'clutches30',
        icon: '🥶',
        title: '30 clutchs gagnés',
        description: '30 rounds gagnés en clutch au total',
        value: (hof) => hof.totalClutchWins ?? 0,
        threshold: 30,
        context: (hof) => `${hof.totalClutchWins} clutch(s) gagné(s) au total`,
      },
    ],
  },
  {
    label: 'Premier sang',
    items: [
      {
        id: 'firstblood10',
        icon: '🩸',
        title: '10 premiers sangs',
        description: 'Premier kill du round, 10 fois au total',
        value: (hof) => hof.totalFirstBloods ?? 0,
        threshold: 10,
        context: (hof) => `${hof.totalFirstBloods} premier(s) sang au total`,
      },
      {
        id: 'firstblood50',
        icon: '🩸',
        title: '50 premiers sangs',
        description: 'Premier kill du round, 50 fois au total',
        value: (hof) => hof.totalFirstBloods ?? 0,
        threshold: 50,
        context: (hof) => `${hof.totalFirstBloods} premier(s) sang au total`,
      },
      {
        id: 'firstblood150',
        icon: '🩸',
        title: '150 premiers sangs',
        description: 'Premier kill du round, 150 fois au total',
        value: (hof) => hof.totalFirstBloods ?? 0,
        threshold: 150,
        context: (hof) => `${hof.totalFirstBloods} premier(s) sang au total`,
      },
    ],
  },
  {
    label: 'Spike',
    items: [
      {
        id: 'plants10',
        icon: '💣',
        title: '10 spikes posés',
        description: 'Poser la spike, 10 fois au total',
        value: (hof) => hof.totalPlants ?? 0,
        threshold: 10,
        context: (hof) => `${hof.totalPlants} pose(s) au total`,
      },
      {
        id: 'plants50',
        icon: '💣',
        title: '50 spikes posés',
        description: 'Poser la spike, 50 fois au total',
        value: (hof) => hof.totalPlants ?? 0,
        threshold: 50,
        context: (hof) => `${hof.totalPlants} pose(s) au total`,
      },
      {
        id: 'plants150',
        icon: '💣',
        title: '150 spikes posés',
        description: 'Poser la spike, 150 fois au total',
        value: (hof) => hof.totalPlants ?? 0,
        threshold: 150,
        context: (hof) => `${hof.totalPlants} pose(s) au total`,
      },
      {
        id: 'defuses5',
        icon: '✂️',
        title: '5 spikes désamorcés',
        description: 'Désamorcer la spike, 5 fois au total',
        value: (hof) => hof.totalDefuses ?? 0,
        threshold: 5,
        context: (hof) => `${hof.totalDefuses} désamorçage(s) au total`,
      },
      {
        id: 'defuses25',
        icon: '✂️',
        title: '25 spikes désamorcés',
        description: 'Désamorcer la spike, 25 fois au total',
        value: (hof) => hof.totalDefuses ?? 0,
        threshold: 25,
        context: (hof) => `${hof.totalDefuses} désamorçage(s) au total`,
      },
      {
        id: 'defuses75',
        icon: '✂️',
        title: '75 spikes désamorcés',
        description: 'Désamorcer la spike, 75 fois au total',
        value: (hof) => hof.totalDefuses ?? 0,
        threshold: 75,
        context: (hof) => `${hof.totalDefuses} désamorçage(s) au total`,
      },
    ],
  },
  {
    label: 'Endurance',
    items: [
      {
        id: 'overtime',
        icon: '🕰️',
        title: 'Prolongation',
        description: 'Jouer un match qui va en prolongation (16 rounds ou plus)',
        value: (hof) => hof.longestMatch?.rounds ?? 0,
        threshold: 16,
        context: (hof) => hof.longestMatch && `${hof.longestMatch.rounds} rounds — ${hof.longestMatch.map}, ${formatDate(hof.longestMatch.date)}`,
      },
      {
        id: 'doubleovertime',
        icon: '🕰️',
        title: 'Double prolongation',
        description: 'Jouer un match de 24 rounds ou plus',
        value: (hof) => hof.longestMatch?.rounds ?? 0,
        threshold: 24,
        context: (hof) => hof.longestMatch && `${hof.longestMatch.rounds} rounds — ${hof.longestMatch.map}, ${formatDate(hof.longestMatch.date)}`,
      },
    ],
  },
];

// Trie chaque groupe : débloqués d'abord (dans leur ordre de définition),
// puis verrouillés du plus proche du déblocage au plus loin — pour que la
// prochaine étape logique saute aux yeux plutôt que de scroller 75 succès
// dans un ordre figé.
export function deriveAchievements(hof) {
  return ACHIEVEMENT_GROUPS.map((group) => {
    const items = group.items.map((item) => {
      const value = item.value(hof) ?? 0;
      const unlocked = value >= item.threshold;
      const progressPercent = item.threshold > 0 ? Math.min(100, Math.max(0, (value / item.threshold) * 100)) : 0;
      return { ...item, unlocked, contextText: unlocked ? item.context(hof) : null, progressPercent };
    });
    const sorted = [...items].sort((a, b) => {
      if (a.unlocked !== b.unlocked) return a.unlocked ? -1 : 1;
      if (!a.unlocked) return b.progressPercent - a.progressPercent;
      return 0;
    });
    const unlockedCount = items.filter((i) => i.unlocked).length;
    return { label: group.label, items: sorted, unlockedCount, total: items.length };
  });
}
