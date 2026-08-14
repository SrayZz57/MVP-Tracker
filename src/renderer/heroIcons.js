import { useEffect, useState } from 'react';

let cache = null;

async function loadHeroIcons() {
  if (cache) return cache;
  const response = await fetch('https://overfast-api.tekrop.fr/heroes');
  const heroes = await response.json();
  cache = new Map(heroes.map((hero) => [hero.key, hero.portrait]));
  return cache;
}

export function useHeroIcons() {
  const [icons, setIcons] = useState(new Map());

  useEffect(() => {
    loadHeroIcons().then(setIcons);
  }, []);

  return icons;
}
