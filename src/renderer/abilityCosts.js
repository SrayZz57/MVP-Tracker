// Coûts en crédits des capacités achetables (Ability 1, Ability 2, Grenade/
// Signature, jamais l'Ultimate, qui se charge par kills/orbes/temps, pas
// avec des crédits). Recherchés le 2026-08-17 sur le wiki officiel Riot
// (wiki.playvalorant.com/en-us/Abilities) et croisés avec les vrais noms de
// capacités par slot (valorant-api.com) pour éviter toute erreur d'association.
//
// Couverture volontairement partielle : seuls les agents où les 3 coûts ont pu
// être confirmés sans ambiguïté sont inclus. Les agents récents (Miks, Veto)
// ne sont pas encore documentés par la source utilisée, et quelques agents au
// kit atypique (Astra, Clove, Cypher, Deadlock, Fade, Gekko, Harbor, Iso,
// KAY/O, Killjoy) ont une capacité dont le coût n'a pas pu être confirmé avec
// certitude, pas de valeur inventée pour combler ces trous.
export const ABILITY_COSTS_SOURCE_DATE = '2026-08-17';

// 0 = capacité gratuite (signature). Reyna : Devour/Dismiss partagent le même
// pool de charges (Œil d'âme), les deux sont listées au même coût par charge.
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

// Combine le coût (par slot, ci-dessus) avec le nom/icône réel de la capacité
// pour cet agent (déjà récupéré en français ailleurs dans l'app), jointure
// par slot, jamais par nom, donc valable quelle que soit la langue.
export function agentAbilityBudget(agentName, abilitiesForAgent) {
  const costs = AGENT_ABILITY_COSTS[agentName];
  if (!costs || !abilitiesForAgent) return null;

  return abilitiesForAgent
    .filter((ability) => PAID_SLOTS.includes(ability.slot) && costs[ability.slot] !== undefined)
    .map((ability) => ({ name: ability.name, icon: ability.icon, cost: costs[ability.slot] }));
}
