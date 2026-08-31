import { useEffect, useRef, useState } from 'react';

// 4 s : la sélection dure environ 100 s et un joueur peut changer d'agent
// jusqu'au dernier moment. Plus court solliciterait le client pour rien,
// plus long ferait rater des changements.
const POLL_MS = 4000;

// Riot n'expose aucun signal "le round a commencé, tu peux bouger" — l'API
// core-game reste active du chargement jusqu'à la fin du match, sans
// distinction. On masque donc nous-mêmes, à l'ancienneté, un délai fixe
// après l'apparition des adversaires (signe que le chargement est bien
// entamé) plutôt que de laisser le bandeau/l'overlay affichés toute la
// partie.
const AUTO_HIDE_AFTER_ENEMIES_MS = 25000;

// Partagé entre le bandeau intégré (AgentSelectLive) et la fenêtre overlay
// (AgentSelectOverlay) : même source de données, deux affichages.
export function useAgentSelectData() {
  const [data, setData] = useState({ state: 'idle' });
  // matchId du dernier résultat vu (pour détecter un nouveau match / la fin
  // du match courant) et matchId qu'on a décidé de masquer après le délai.
  const lastMatchIdRef = useRef(null);
  const hiddenMatchIdRef = useRef(null);
  const hideTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    let pollTimer = null;

    const clearHideTimer = () => {
      if (hideTimerRef.current) {
        clearTimeout(hideTimerRef.current);
        hideTimerRef.current = null;
      }
    };

    const poll = async () => {
      try {
        const result = await window.electronAPI.getAgentSelect();
        if (cancelled) return;

        const matchId = result.state === 'ok' ? result.matchId : null;
        if (matchId !== lastMatchIdRef.current) {
          // Nouveau match, ou plus de match du tout : la décision de
          // masquage précédente ne concernait que l'ancien.
          lastMatchIdRef.current = matchId;
          hiddenMatchIdRef.current = null;
          clearHideTimer();
        }

        const hasEnemies = result.state === 'ok' && result.phase === 'game' && result.players.some((p) => p.team === 'enemy');
        if (hasEnemies && !hideTimerRef.current && hiddenMatchIdRef.current !== matchId) {
          hideTimerRef.current = setTimeout(() => {
            hiddenMatchIdRef.current = matchId;
            hideTimerRef.current = null;
            if (!cancelled) setData({ state: 'idle' });
          }, AUTO_HIDE_AFTER_ENEMIES_MS);
        }

        setData(matchId !== null && matchId === hiddenMatchIdRef.current ? { state: 'idle' } : result);
      } catch {
        // L'API locale est non officielle : un échec ne doit jamais casser
        // l'interface, on retentera au prochain tour.
        if (!cancelled) setData({ state: 'unavailable' });
      }
      if (!cancelled) pollTimer = setTimeout(poll, POLL_MS);
    };

    poll();
    return () => {
      cancelled = true;
      if (pollTimer) clearTimeout(pollTimer);
      clearHideTimer();
    };
  }, []);

  return data;
}
