import { useEffect, useRef, useState } from 'react';

function useValorantData(settings) {
  const [matches, setMatches] = useState([]);
  const [pingSamples, setPingSamples] = useState([]);
  const [rank, setRank] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Incrémenté à chaque changement de profil suivi. Une requête réseau lancée
  // pour un profil précédent peut répondre APRÈS que l'utilisateur soit déjà
  // passé à un autre profil (ex. rate limit qui retarde la réponse), sans ce
  // garde-fou, cette réponse tardive écraserait l'affichage du nouveau profil
  // avec les données de l'ancien.
  const requestIdRef = useRef(0);

  const refresh = async () => {
    if (!settings) return;
    const requestId = requestIdRef.current;
    setLoading(true);
    setError(null);
    try {
      const { matches: freshMatches, rank: freshRank } = await window.electronAPI.getMatches(settings);
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
    // Vide tout de suite (synchrone) avant même de relire le cache, sinon,
    // le temps que les appels async ci-dessous répondent, le nom affiché en
    // haut peut déjà être le nouveau pendant que la photo/le rang à l'écran
    // sont encore ceux du profil précédent.
    setMatches([]);
    setRank(null);
    // Recharge le cache local puis relance une recherche en direct dès que le
    // profil suivi change (nouvelle recherche depuis la barre du haut).
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
