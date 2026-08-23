const ROLE_NAMES = {
  duelist: 'Duelliste',
  initiator: 'Initiateur',
  controller: 'Contrôleur',
  sentinel: 'Sentinelle',
};

// Règles générales largement admises dans la communauté Valorant — des conseils,
// pas un verdict garanti (aucune donnée de winrate par compo/map n'est disponible
// publiquement pour aller plus loin que ça).
export function analyzeComposition(agentNames, agentRoles) {
  const counts = { Duelliste: 0, Initiateur: 0, Contrôleur: 0, Sentinelle: 0 };
  const chosen = agentNames.filter(Boolean);

  chosen.forEach((agent) => {
    const roleName = agentRoles.get(agent)?.roleName;
    if (roleName && counts[roleName] !== undefined) {
      counts[roleName] += 1;
    }
  });

  const notes = [];

  if (chosen.length === 5) {
    if (counts.Contrôleur === 0) {
      notes.push({ level: 'warning', textKey: 'composition.notes.noController' });
    }
    if (counts.Initiateur === 0) {
      notes.push({ level: 'warning', textKey: 'composition.notes.noInitiator' });
    }
    if (counts.Sentinelle === 0) {
      notes.push({ level: 'info', textKey: 'composition.notes.noSentinel' });
    }
    if (counts.Duelliste === 0) {
      notes.push({ level: 'info', textKey: 'composition.notes.noDuelist' });
    }
    if (counts.Duelliste >= 3) {
      notes.push({ level: 'info', textKey: 'composition.notes.tooManyDuelists' });
    }
    if (counts.Duelliste >= 1 && counts.Initiateur >= 1 && counts.Contrôleur >= 1 && counts.Sentinelle >= 1) {
      notes.push({ level: 'good', textKey: 'composition.notes.balanced' });
    }
  }

  return { counts, notes, roleNames: ROLE_NAMES };
}

const TIER_POINTS = { S: 100, A: 78, B: 55 };
const NOTE_WEIGHT = { warning: -20, info: -8, good: 5 };

// Score composite /100 = 50% équilibre des rôles + 50% "fit" map/agent
// (avis communautaires figés, voir mapAgentTiers.js). Volontairement pas une
// science exacte — combine deux estimations, pas des winrates mesurés.
export function scoreComposition(agentNames, mapName, agentRoles, getAgentMapTier) {
  const chosen = agentNames.filter(Boolean);
  if (chosen.length < 5 || !mapName) return null;

  const { notes } = analyzeComposition(agentNames, agentRoles);
  const roleScore = Math.max(0, Math.min(100, 70 + notes.reduce((sum, n) => sum + NOTE_WEIGHT[n.level], 0)));

  const tierResults = chosen.map((agent) => ({ agent, tier: getAgentMapTier(agent, mapName) }));
  const knownTiers = tierResults.filter((t) => t.tier !== null);
  const mapFitScore =
    knownTiers.length > 0
      ? knownTiers.reduce((sum, t) => sum + TIER_POINTS[t.tier], 0) / knownTiers.length
      : null;

  const overall = mapFitScore === null ? roleScore : Math.round(roleScore * 0.5 + mapFitScore * 0.5);

  return { overall, roleScore: Math.round(roleScore), mapFitScore: mapFitScore === null ? null : Math.round(mapFitScore), tierResults };
}
