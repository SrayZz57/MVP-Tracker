// Avis communautaires sur les meilleurs agents par map, recherchés le
// 2026-08-17 (patch 13.00, Acte 4), PAS une donnée officielle ni un calcul
// à partir de vraies stats de winrate (aucune API publique ne les expose).
// Ça va devenir obsolète au fil des patchs (rééquilibrages, nouveaux agents,
// rotation du pool de maps) : à ressourcer périodiquement plutôt qu'à
// considérer comme figé pour toujours.
export const MAP_TIER_SOURCE_DATE = '2026-08-17';

// Un agent absent de la liste n'est pas forcément mauvais sur la map, il
// n'a juste pas été cité comme un des meilleurs choix par les sources
// consultées. Corrode et Summit ne sont pas couverts par la source trouvée
// (map trop récente/peu documentée) : pas de données inventées pour elles.
export const MAP_AGENT_TIERS = {
  Haven: { S: ['Clove', 'Sova', 'Jett'], A: ['Fade', 'Killjoy', 'Cypher'] },
  Ascent: { S: ['Killjoy', 'Jett', 'Sova'], A: ['KAY/O', 'Omen', 'Sage'] },
  Bind: { S: ['Raze', 'Viper', 'Skye'], A: ['Brimstone', 'Reyna', 'Fade'] },
  Icebox: { S: ['Viper', 'Jett', 'Sage'], A: ['Reyna', 'Sova', 'Gekko'] },
  Breeze: { S: ['Viper', 'Jett', 'Sova'], A: ['Chamber', 'Fade', 'KAY/O'] },
  Fracture: { S: ['Breach', 'Raze', 'Brimstone'], A: ['Neon', 'Fade', 'Cypher'] },
  Pearl: { S: ['Fade', 'Viper', 'Killjoy'], A: ['Sova', 'Clove', 'Harbor'] },
  Lotus: { S: ['Clove', 'Raze', 'Omen'], A: ['Jett', 'Killjoy', 'Viper'] },
  Split: { S: ['Raze', 'Omen', 'Cypher'], A: ['Sage', 'Jett', 'Skye'] },
  Sunset: { S: ['Clove', 'Raze', 'Sova'], A: ['Cypher', 'Omen', 'Gekko'] },
  Abyss: { S: ['Jett', 'Clove', 'Sova'], A: ['Neon', 'Skye', 'Omen'] },
};

// null = pas de donnée pour cette map (pas "neutre", vraiment "inconnu").
export function getAgentMapTier(agent, mapName) {
  const tiers = MAP_AGENT_TIERS[mapName];
  if (!tiers) return null;
  if (tiers.S.includes(agent)) return 'S';
  if (tiers.A.includes(agent)) return 'A';
  return 'B';
}
