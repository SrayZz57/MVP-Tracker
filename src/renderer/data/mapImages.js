import { useEffect, useState } from 'react';

let cache = null;
let minimapCache = null;
let coordinatesCache = null;

const REAL_MAPS = new Set([
  'Ascent', 'Bind', 'Breeze', 'Corrode', 'Fracture', 'Haven', 'Icebox',
  'Lotus', 'Pearl', 'Split', 'Summit', 'Sunset', 'Abyss',
]);

let mapsPromise = null;

function loadMaps() {
  if (!mapsPromise) {
    mapsPromise = fetch('https://valorant-api.com/v1/maps?language=fr-FR')
      .then((response) => response.json())
      .then((json) => json.data.filter((map) => REAL_MAPS.has(map.displayName)));
  }
  return mapsPromise;
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

let urlToNameCache = null;

async function loadMapUrlToName() {
  if (urlToNameCache) return urlToNameCache;
  const maps = await loadMaps();
  urlToNameCache = new Map(maps.map((map) => [map.mapUrl, map.displayName]));
  return urlToNameCache;
}

export function useMapUrlToName() {
  const [table, setTable] = useState(new Map());

  useEffect(() => {
    loadMapUrlToName().then(setTable);
  }, []);

  return table;
}

export function useMapsData() {
  const [maps, setMaps] = useState([]);

  useEffect(() => {
    loadMaps().then(setMaps);
  }, []);

  return maps;
}
