export const MAP_TIER_SOURCE_DATE = '2026-08-17';

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

export function getAgentMapTier(agent, mapName) {
  const tiers = MAP_AGENT_TIERS[mapName];
  if (!tiers) return null;
  if (tiers.S.includes(agent)) return 'S';
  if (tiers.A.includes(agent)) return 'A';
  return 'B';
}
