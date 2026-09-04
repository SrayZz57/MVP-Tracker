import { useEffect, useState } from 'react';

let cache = null;

const ABILITY_WEAPON_ICONS = {
  Headhunter: 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/abilities/ability1/displayicon.png',
  'Tour De Force': 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/abilities/ultimate/displayicon.png',
};

async function loadWeaponIcons() {
  if (cache) return cache;
  const response = await fetch('https://valorant-api.com/v1/weapons');
  const json = await response.json();
  cache = new Map(json.data.map((weapon) => [weapon.displayName, weapon.displayIcon]));
  Object.entries(ABILITY_WEAPON_ICONS).forEach(([name, icon]) => cache.set(name, icon));
  return cache;
}

export function useWeaponIcons() {
  const [icons, setIcons] = useState(new Map());

  useEffect(() => {
    loadWeaponIcons().then(setIcons);
  }, []);

  return icons;
}

let shopWeaponsPromise = null;

function loadShopWeapons() {
  if (!shopWeaponsPromise) {
    shopWeaponsPromise = fetch('https://valorant-api.com/v1/weapons?language=fr-FR')
      .then((response) => response.json())
      .then((json) =>
        json.data
          .filter((w) => w.shopData)
          .map((w) => ({
            name: w.displayName,
            icon: w.displayIcon,
            cost: w.shopData.cost,
            category: w.shopData.category,
          })),
      );
  }
  return shopWeaponsPromise;
}

export function useShopWeapons() {
  const [weapons, setWeapons] = useState([]);

  useEffect(() => {
    loadShopWeapons().then(setWeapons);
  }, []);

  return weapons;
}

let weaponCostsPromise = null;

function loadWeaponCosts() {
  if (!weaponCostsPromise) {
    weaponCostsPromise = fetch('https://valorant-api.com/v1/weapons')
      .then((response) => response.json())
      .then((json) => {
        const map = new Map();
        json.data.forEach((w) => {
          if (w.shopData) map.set(w.uuid, w.shopData.cost);
        });
        return map;
      });
  }
  return weaponCostsPromise;
}

export function useWeaponCosts() {
  const [costs, setCosts] = useState(new Map());

  useEffect(() => {
    loadWeaponCosts().then(setCosts);
  }, []);

  return costs;
}

let shopArmorsPromise = null;

function loadShopArmors() {
  if (!shopArmorsPromise) {
    shopArmorsPromise = fetch('https://valorant-api.com/v1/gear?language=fr-FR')
      .then((response) => response.json())
      .then((json) => json.data.map((g) => ({ name: g.displayName, icon: g.displayIcon, cost: g.shopData?.cost ?? 0 })));
  }
  return shopArmorsPromise;
}

export function useShopArmors() {
  const [armors, setArmors] = useState([]);

  useEffect(() => {
    loadShopArmors().then(setArmors);
  }, []);

  return armors;
}

let weaponsDataPromise = null;

function loadWeaponsData() {
  if (!weaponsDataPromise) {
    weaponsDataPromise = fetch('https://valorant-api.com/v1/weapons?language=fr-FR')
      .then((response) => response.json())
      .then((json) => json.data.filter((w) => w.shopData));
  }
  return weaponsDataPromise;
}

export function useWeaponsData() {
  const [weapons, setWeapons] = useState([]);

  useEffect(() => {
    loadWeaponsData().then(setWeapons);
  }, []);

  return weapons;
}
