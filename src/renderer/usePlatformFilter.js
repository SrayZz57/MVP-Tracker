import { useMemo, useState } from 'react';

// Détecte les plateformes réellement présentes dans un lot de matchs (un
// compte crossplay peut avoir de l'historique sur "pc" ET "console", voir
// main.js) et expose un filtre local à l'onglet qui l'utilise. Si une seule
// plateforme est présente, `platforms` reste vide : pas la peine de proposer
// un filtre à un joueur qui ne joue que sur une seule plateforme.
function usePlatformFilter(matches) {
  const [platform, setPlatform] = useState('all');

  const platforms = useMemo(() => {
    const set = new Set();
    (matches ?? []).forEach((match) => {
      const p = match?.metadata?.platform;
      if (p) set.add(String(p).toLowerCase());
    });
    return set.size > 1 ? [...set] : [];
  }, [matches]);

  const filteredMatches = useMemo(() => {
    if (platforms.length === 0 || platform === 'all') return matches;
    return (matches ?? []).filter((match) => String(match?.metadata?.platform).toLowerCase() === platform);
  }, [matches, platforms.length, platform]);

  return { platforms, platform, setPlatform, filteredMatches };
}

export default usePlatformFilter;
