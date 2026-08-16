import { useEffect, useState } from 'react';

let agentsPromise = null;

function loadAgents() {
  if (!agentsPromise) {
    agentsPromise = fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
      .then((response) => response.json())
      .then((json) => json.data);
  }
  return agentsPromise;
}

export function useAgentIcons() {
  const [icons, setIcons] = useState(new Map());

  useEffect(() => {
    loadAgents().then((agents) => {
      setIcons(new Map(agents.map((agent) => [agent.displayName, agent.displayIcon])));
    });
  }, []);

  return icons;
}

export function useAgentPortraits() {
  const [portraits, setPortraits] = useState(new Map());

  useEffect(() => {
    loadAgents().then((agents) => {
      setPortraits(new Map(agents.map((agent) => [agent.displayName, agent.fullPortrait])));
    });
  }, []);

  return portraits;
}

const PLACEABLE_SLOTS = ['Ability1', 'Ability2', 'Grenade', 'Ultimate'];

export function useAgentAbilities() {
  const [abilities, setAbilities] = useState(new Map());

  useEffect(() => {
    loadAgents().then((agents) => {
      setAbilities(
        new Map(
          agents.map((agent) => [
            agent.displayName,
            agent.abilities
              .filter((ability) => PLACEABLE_SLOTS.includes(ability.slot) && ability.displayIcon)
              .map((ability) => ({ name: ability.displayName, icon: ability.displayIcon })),
          ]),
        ),
      );
    });
  }, []);

  return abilities;
}
