import { useEffect, useState } from 'react';

// Prix VP estimés par rareté — pas exposés par l'API (voir CLAUDE.md/plan),
// valeurs communautaires connues mais non officielles, modifiables par skin.
// Ultra est au-dessus d'Exclusive en jeu (confirmé via le champ "rank" de
// /v1/contenttiers : Exclusive=3, Ultra=4), donc plus cher.
export const TIER_PRICES = {
  Select: 875,
  Deluxe: 1275,
  Premium: 1775,
  Exclusive: 2175,
  Ultra: 2475,
};

// Les couteaux coûtent environ le double d'une arme à feu de la même rareté
// (quasi tous les couteaux sont en tier "Exclusive" dans les données du jeu,
// mais un skin d'arme Exclusive et un couteau Exclusive n'ont pas le même prix
// en jeu — vérifié par recherche, le ratio ~2x est constant sur tous les tiers).
const MELEE_CATEGORY = 'EEquippableCategory::Melee';
const MELEE_PRICE_MULTIPLIER = 2;

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
      if (!skin.contentTierUuid) continue; // skin de base de l'arme, pas une vraie peau
      const tier = tiersByUuid.get(skin.contentTierUuid);
      if (!tier) continue;
      // Chaque palier a sa propre vidéo (upgrades progressifs) : on prend le
      // dernier palier avec vidéo, donc l'arme entièrement améliorée.
      const levelsWithVideo = skin.levels.filter((level) => level.streamedVideo);
      const video = levelsWithVideo.length > 0 ? levelsWithVideo[levelsWithVideo.length - 1].streamedVideo : null;
      const basePrice = TIER_PRICES[tier.tierName] ?? 0;
      const isMelee = weapon.category === MELEE_CATEGORY;
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
        estimatedPriceVp: isMelee ? basePrice * MELEE_PRICE_MULTIPLIER : basePrice,
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
