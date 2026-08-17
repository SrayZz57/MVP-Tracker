import { useEffect, useState } from 'react';

let cache = null;
let minimapCache = null;
let coordinatesCache = null;

// L'endpoint /v1/maps renvoie aussi des maps d'entraînement/événements qui
// n'existent pas en vrai partie (Skirmish A-E, District, Kasbah, Drift,
// Glitch, Piazza, Basic Training, The Range) — vérifié via recherche du pool
// de maps réel (compétitif + celles juste sorties de rotation mais toujours
// jouables en Non classé/Swiftplay).
const REAL_MAPS = new Set([
  'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture', 'Haven', 'Icebox',
  'Lotus', 'Pearl', 'Split', 'Summit', 'Sunset', 'Abyss',
]);

async function loadMaps() {
  const response = await fetch('https://valorant-api.com/v1/maps');
  const json = await response.json();
  return json.data.filter((map) => REAL_MAPS.has(map.displayName));
}

async function loadMapImages() {
  if (cache) return cache;
  const maps = await loadMaps();
  cache = new Map(maps.map((map) => [map.displayName, map.splash]));
  return cache;
}

async function loadMapMinimaps() {
  if (minimapCache) return minimapCache;
  const maps = await loadMaps();
  minimapCache = new Map(maps.map((map) => [map.displayName, map.displayIcon]));
  return minimapCache;
}

export function useMapImages() {
  const [images, setImages] = useState(new Map());

  useEffect(() => {
    loadMapImages().then(setImages);
  }, []);

  return images;
}

export function useMapMinimaps() {
  const [minimaps, setMinimaps] = useState(new Map());

  useEffect(() => {
    loadMapMinimaps().then(setMinimaps);
  }, []);

  return minimaps;
}

async function loadMapCoordinates() {
  if (coordinatesCache) return coordinatesCache;
  const maps = await loadMaps();
  coordinatesCache = new Map(
    maps.map((map) => [
      map.displayName,
      {
        xMultiplier: map.xMultiplier,
        yMultiplier: map.yMultiplier,
        xScalarToAdd: map.xScalarToAdd,
        yScalarToAdd: map.yScalarToAdd,
      },
    ]),
  );
  return coordinatesCache;
}

export function useMapCoordinates() {
  const [coordinates, setCoordinates] = useState(new Map());

  useEffect(() => {
    loadMapCoordinates().then(setCoordinates);
  }, []);

  return coordinates;
}
