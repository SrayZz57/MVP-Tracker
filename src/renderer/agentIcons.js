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
