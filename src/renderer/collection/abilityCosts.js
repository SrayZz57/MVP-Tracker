export const ABILITY_COSTS_SOURCE_DATE = '2026-08-17';

export const AGENT_ABILITY_COSTS = {
  Breach: { Ability1: 250, Ability2: 0, Grenade: 200 },
  Brimstone: { Ability1: 250, Ability2: 100, Grenade: 200 },
  Chamber: { Ability1: 100, Ability2: 0, Grenade: 200 },
  Jett: { Ability1: 150, Ability2: 0, Grenade: 200 },
  Neon: { Ability1: 200, Ability2: 150, Grenade: 250 },
  Omen: { Ability1: 250, Ability2: 150, Grenade: 100 },
  Phoenix: { Ability1: 200, Ability2: 250, Grenade: 150 },
  Raze: { Ability1: 200, Ability2: 0, Grenade: 300 },
  Reyna: { Ability1: 200, Ability2: 200, Grenade: 250 },
  Sage: { Ability1: 200, Ability2: 0, Grenade: 300 },
  Skye: { Ability1: 300, Ability2: 250, Grenade: 150 },
  Sova: { Ability1: 150, Ability2: 0, Grenade: 400 },
  Tejo: { Ability1: 200, Ability2: 150, Grenade: 400 },
  Viper: { Ability1: 200, Ability2: 0, Grenade: 300 },
  Vyse: { Ability1: 200, Ability2: 0, Grenade: 150 },
  Waylay: { Ability1: 300, Ability2: 0, Grenade: 300 },
  Yoru: { Ability1: 250, Ability2: 150, Grenade: 200 },
};

const PAID_SLOTS = ['Ability1', 'Ability2', 'Grenade'];

export function agentAbilityBudget(agentName, abilitiesForAgent) {
  const costs = AGENT_ABILITY_COSTS[agentName];
  if (!costs || !abilitiesForAgent) return null;

  return abilitiesForAgent
    .filter((ability) => PAID_SLOTS.includes(ability.slot) && costs[ability.slot] !== undefined)
    .map((ability) => ({ name: ability.name, icon: ability.icon, cost: costs[ability.slot] }));
}
