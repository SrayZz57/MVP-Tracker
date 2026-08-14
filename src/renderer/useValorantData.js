import { useEffect, useState } from 'react';

function useValorantData(settings) {
  const [matches, setMatches] = useState([]);
  const [pingSamples, setPingSamples] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    window.electronAPI.getCachedMatches().then(setMatches);
    window.electronAPI.getPingSamples().then(setPingSamples);
  }, []);

  const refresh = async () => {
    if (!settings) return;
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.getMatches(settings);
      setMatches(data || []);
      setPingSamples(await window.electronAPI.getPingSamples());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return { matches, pingSamples, loading, error, refresh };
}

export default useValorantData;
