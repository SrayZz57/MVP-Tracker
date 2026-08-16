import { useEffect, useState } from 'react';

let cache = null;

async function loadWeaponIcons() {
  if (cache) return cache;
  const response = await fetch('https://valorant-api.com/v1/weapons');
  const json = await response.json();
  cache = new Map(json.data.map((weapon) => [weapon.displayName, weapon.displayIcon]));
  return cache;
}

export function useWeaponIcons() {
  const [icons, setIcons] = useState(new Map());

  useEffect(() => {
    loadWeaponIcons().then(setIcons);
  }, []);

  return icons;
}
