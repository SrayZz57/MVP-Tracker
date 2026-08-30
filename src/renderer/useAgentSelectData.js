import { useEffect, useState } from 'react';

// 4 s : la sélection dure environ 100 s et un joueur peut changer d'agent
// jusqu'au dernier moment. Plus court solliciterait le client pour rien,
// plus long ferait rater des changements.
const POLL_MS = 4000;

// Partagé entre le bandeau intégré (AgentSelectLive) et la fenêtre overlay
// (AgentSelectOverlay) : même source de données, deux affichages.
export function useAgentSelectData() {
  const [data, setData] = useState({ state: 'idle' });

  useEffect(() => {
    let cancelled = false;
    let timer = null;

    const poll = async () => {
      try {
        const result = await window.electronAPI.getAgentSelect();
        if (!cancelled) setData(result);
      } catch {
        // L'API locale est non officielle : un échec ne doit jamais casser
        // l'interface, on retentera au prochain tour.
        if (!cancelled) setData({ state: 'unavailable' });
      }
      if (!cancelled) timer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, []);

  return data;
}
