import { useEffect, useRef, useState } from 'react';

function useValorantData(settings) {
  const [matches, setMatches] = useState([]);
  const [pingSamples, setPingSamples] = useState([]);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const requestIdRef = useRef(0);

  const refresh = async ({ force = false } = {}) => {
    if (!settings) return;
    const requestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { matches: freshMatches, rank: freshRank } = await window.electronAPI.getMatches(settings, { force });
      const pingData = await window.electronAPI.getPingSamples();
      if (requestId !== requestIdRef.current) return;
      setMatches(freshMatches || []);
      setRank(freshRank);
      setPingSamples(pingData);
    } catch (err) {
      if (requestId !== requestIdRef.current) return;
      setError(err.message);
    } finally {
      if (requestId === requestIdRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    if (!settings) return;
    requestIdRef.current += 1;
    const requestId = requestIdRef.current;
    setMatches([]);
    setRank(null);
    window.electronAPI.getCachedMatches().then((cached) => {
      if (requestId === requestIdRef.current) setMatches(cached);
    });
    window.electronAPI.getPingSamples().then((samples) => {
      if (requestId === requestIdRef.current) setPingSamples(samples);
    });
    if (settings.puuid) {
      window.electronAPI.getRankFor(settings.puuid).then((cachedRank) => {
        if (requestId === requestIdRef.current) setRank(cachedRank);
      });
    }
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.name, settings?.tag]);

  return { matches, pingSamples, rank, loading, error, refresh };
}

export default useValorantData;
