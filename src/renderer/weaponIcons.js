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

let shopWeaponsPromise = null;

// Prix/catégories réels du shop (valorant-api.com), pour le calculateur de
// budget — category vient d'un enum anglais stable ("EEquippableCategory::Rifle"),
// indépendant de la langue utilisée pour displayName.
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
