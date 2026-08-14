import { useEffect, useState } from 'react';

let cache = null;

async function loadMapImages() {
  if (cache) return cache;
  const response = await fetch('https://valorant-api.com/v1/maps');
  const json = await response.json();
  cache = new Map(json.data.map((map) => [map.displayName, map.splash]));
  return cache;
}

export function useMapImages() {
  const [images, setImages] = useState(new Map());

  useEffect(() => {
    loadMapImages().then(setImages);
  }, []);

  return images;
}
