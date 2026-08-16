import { useEffect, useState } from 'react';

let cache = null;
let minimapCache = null;
let coordinatesCache = null;

async function loadMaps() {
  const response = await fetch('https://valorant-api.com/v1/maps');
  const json = await response.json();
  return json.data.filter((map) => map.displayName !== 'The Range');
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
