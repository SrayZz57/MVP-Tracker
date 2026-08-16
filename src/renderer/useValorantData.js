import { useEffect, useState } from 'react';

function useValorantData(settings) {
  const [matches, setMatches] = useState([]);
  const [pingSamples, setPingSamples] = useState([]);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const refresh = async () => {
    if (!settings) return;
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.getMatches(settings);
      setMatches(data || []);
      setPingSamples(await window.electronAPI.getPingSamples());
      setRank(await window.electronAPI.getRank());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!settings) return;
    // Recharge le cache local puis relance une recherche en direct dès que le
    // profil suivi change (nouvelle recherche depuis la barre du haut).
    window.electronAPI.getCachedMatches().then(setMatches);
    window.electronAPI.getPingSamples().then(setPingSamples);
    window.electronAPI.getRank().then(setRank);
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings?.name, settings?.tag]);

  return { matches, pingSamples, rank, loading, error, refresh };
}

export default useValorantData;
