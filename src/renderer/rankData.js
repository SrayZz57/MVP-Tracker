import { useEffect, useState } from 'react';

let tiersCache = null;

async function loadCompetitiveTiers() {
  if (tiersCache) return tiersCache;
  const response = await fetch('https://valorant-api.com/v1/competitivetiers');
  const json = await response.json();
  const latestEpisode = json.data[json.data.length - 1];
  tiersCache = new Map(
    latestEpisode.tiers.map((tier) => [
      tier.tier,
      { icon: tier.largeIcon, color: `#${tier.color.slice(0, 6)}` },
    ]),
  );
  return tiersCache;
}

export function useRankTiers() {
  const [tiers, setTiers] = useState(new Map());

  useEffect(() => {
    loadCompetitiveTiers().then(setTiers);
  }, []);

  return tiers;
}

let seasonsCache = null;

async function loadSeasonNames() {
  if (seasonsCache) return seasonsCache;
  const response = await fetch('https://valorant-api.com/v1/seasons?language=fr-FR');
  const json = await response.json();
  const byUuid = new Map(json.data.map((season) => [season.uuid, season]));
  seasonsCache = new Map(
    json.data
      .filter((season) => season.type === 'EAresSeasonType::Act')
      .map((act) => {
        const episode = byUuid.get(act.parentUuid);
        const episodeName = episode ? capitalize(episode.displayName) : '';
        // "ACTE III" reste tel quel (chiffre romain), seule "ÉPISODE 6" est mise en forme.
        return [act.uuid, episodeName ? `${episodeName} — ${act.displayName}` : act.displayName];
      }),
  );
  return seasonsCache;
}

function capitalize(text) {
  return text.charAt(0) + text.slice(1).toLowerCase();
}

export function useSeasonNames() {
  const [seasons, setSeasons] = useState(new Map());

  useEffect(() => {
    loadSeasonNames().then(setSeasons);
  }, []);

  return seasons;
}

const cardArtCache = new Map();
const EMPTY_CARD_ART = { icon: null, banner: null };

export function usePlayerCardArt(cardUuid) {
  const [art, setArt] = useState(cardUuid ? cardArtCache.get(cardUuid) ?? EMPTY_CARD_ART : EMPTY_CARD_ART);

  useEffect(() => {
    if (!cardUuid) {
      setArt(EMPTY_CARD_ART);
      return;
    }
    if (cardArtCache.has(cardUuid)) {
      setArt(cardArtCache.get(cardUuid));
      return;
    }
    fetch(`https://valorant-api.com/v1/playercards/${cardUuid}`)
      .then((response) => response.json())
      .then((json) => {
        const result = { icon: json.data?.smallArt ?? null, banner: json.data?.wideArt ?? null };
        cardArtCache.set(cardUuid, result);
        setArt(result);
      });
  }, [cardUuid]);

  return art;
}
