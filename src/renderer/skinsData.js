import { useEffect, useState } from 'react';

export const TIER_PRICES = {
  Select: 875,
  Deluxe: 1275,
  Premium: 1775,
  Exclusive: 2175,
  Ultra: 2475,
};

const MELEE_CATEGORY = 'EEquippableCategory::Melee';
const MELEE_PRICE_MULTIPLIER = 2;

const MELEE_PRICE_OVERRIDES = {
  'Power Fist': 5950,
};

let cache = null;

async function loadCatalog() {
  if (cache) return cache;

  const [weaponsRes, tiersRes] = await Promise.all([
    fetch('https://valorant-api.com/v1/weapons?language=fr-FR'),
    fetch('https://valorant-api.com/v1/contenttiers?language=fr-FR'),
  ]);
  const weaponsJson = await weaponsRes.json();
  const tiersJson = await tiersRes.json();

  const tiersByUuid = new Map(
    tiersJson.data.map((tier) => [
      tier.uuid,
      {
        tierName: tier.devName,
        tierRank: tier.rank,
        tierColor: `#${tier.highlightColor.slice(0, 6)}`,
        tierIcon: tier.displayIcon,
      },
    ]),
  );

  const skins = [];
  for (const weapon of weaponsJson.data) {
    for (const skin of weapon.skins) {
      if (!skin.contentTierUuid) continue;
      const tier = tiersByUuid.get(skin.contentTierUuid);
      if (!tier) continue;
      const levelsWithVideo = skin.levels.filter((level) => level.streamedVideo);
      const video = levelsWithVideo.length > 0 ? levelsWithVideo[levelsWithVideo.length - 1].streamedVideo : null;
      const basePrice = TIER_PRICES[tier.tierName] ?? 0;
      const isMelee = weapon.category === MELEE_CATEGORY;
      const meleeOverride = isMelee ? MELEE_PRICE_OVERRIDES[skin.displayName] : undefined;
      skins.push({
        uuid: skin.uuid,
        name: skin.displayName,
        weaponName: weapon.displayName,
        weaponIcon: weapon.displayIcon,
        weaponCategory: weapon.category,
        displayIcon: skin.displayIcon,
        video,
        chromas: skin.chromas,
        ...tier,
        estimatedPriceVp: meleeOverride ?? (isMelee ? basePrice * MELEE_PRICE_MULTIPLIER : basePrice),
      });
    }
  }

  cache = skins;
  return cache;
}

export function useSkinsCatalog() {
  const [skins, setSkins] = useState(null);

  useEffect(() => {
    loadCatalog().then(setSkins);
  }, []);

  return skins;
}
