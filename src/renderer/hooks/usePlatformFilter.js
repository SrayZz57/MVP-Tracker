import { useMemo, useState } from 'react';

function usePlatformFilter(matches, defaultPlatform = 'all') {
  const [platform, setPlatform] = useState(defaultPlatform);

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
