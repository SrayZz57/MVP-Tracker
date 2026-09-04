import { groupStats } from '../stats/valorantStats.js';
import { getAgentMapTier } from '../strategy/mapAgentTiers.js';

const MIN_GAMES_FOR_PERSONAL_STATS = 3;
const ROLE_NAMES = ['Duelliste', 'Initiateur', 'Contrôleur', 'Sentinelle'];
const TIER_SCORE = { S: 85, A: 70, B: 55 };
const ROLE_GAP_BONUS = 15;

export function suggestAgents({ matches, name, tag, mapName, teammateAgentNames, agentRoles, max = 3 }) {
  if (!mapName || agentRoles.size === 0) return [];

  const mapMatches = matches.filter((m) => m.metadata?.map === mapName);
  const perAgentByName = new Map(
    groupStats(mapMatches, name, tag, (match, me) => me.character).map((a) => [a.key, a]),
  );

  const picked = new Set(teammateAgentNames.filter(Boolean));
  const pickedRoles = new Set([...picked].map((agent) => agentRoles.get(agent)?.roleName).filter(Boolean));
  const missingRoles = ROLE_NAMES.filter((role) => !pickedRoles.has(role));

  const scored = [...agentRoles.keys()]
    .filter((agent) => !picked.has(agent))
    .map((agent) => {
      const perso = perAgentByName.get(agent);
      const hasEnoughGames = perso && perso.games >= MIN_GAMES_FOR_PERSONAL_STATS && perso.winrate !== null;
      const tier = getAgentMapTier(agent, mapName);
      const baseScore = hasEnoughGames ? perso.winrate : tier ? TIER_SCORE[tier] : null;
      if (baseScore === null) return null;

      const role = agentRoles.get(agent)?.roleName ?? null;
      const fillsGap = role ? missingRoles.includes(role) : false;

      return {
        agent,
        score: baseScore + (fillsGap ? ROLE_GAP_BONUS : 0),
        source: hasEnoughGames ? 'personal' : 'community',
        winrate: hasEnoughGames ? Math.round(perso.winrate) : null,
        games: perso?.games ?? 0,
        role,
        fillsGap,
      };
    })
    .filter(Boolean);

  return scored.sort((a, b) => b.score - a.score).slice(0, max);
}
