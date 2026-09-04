import { useEffect, useRef, useState } from 'react';

const POLL_MS = 4000;

const AUTO_HIDE_AFTER_ENEMIES_MS = 25000;
const AUTO_HIDE_NO_SELECT_MS = 30000;

export function useAgentSelectData() {
  const [data, setData] = useState({ state: 'idle' });
  const lastMatchIdRef = useRef(null);
  const hiddenMatchIdRef = useRef(null);
  const hideTimerRef = useRef(null);
  const hadSelectPhaseRef = useRef(false);

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
          lastMatchIdRef.current = matchId;
          hiddenMatchIdRef.current = null;
          hadSelectPhaseRef.current = false;
          clearHideTimer();
        }

        if (result.state === 'ok' && result.phase === 'select') {
          hadSelectPhaseRef.current = true;
        }

        const inGame = result.state === 'ok' && result.phase === 'game';
        const hasEnemies = inGame && result.players.some((p) => p.team === 'enemy');
        const shouldStartHideTimer = hadSelectPhaseRef.current ? hasEnemies : inGame;
        const hideDelay = hadSelectPhaseRef.current ? AUTO_HIDE_AFTER_ENEMIES_MS : AUTO_HIDE_NO_SELECT_MS;

        if (shouldStartHideTimer && !hideTimerRef.current && hiddenMatchIdRef.current !== matchId) {
          hideTimerRef.current = setTimeout(() => {
            hiddenMatchIdRef.current = matchId;
            hideTimerRef.current = null;
            if (!cancelled) setData({ state: 'idle' });
          }, hideDelay);
        }

        setData(matchId !== null && matchId === hiddenMatchIdRef.current ? { state: 'idle' } : result);
      } catch {
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
