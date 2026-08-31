import { excludeDeathmatch, findMe, ECONOMY_TIERS } from './valorantStats.js';

const TIER_ORDER = { eco: 0, semi: 1, full: 2 };

function tierFor(value) {
  return ECONOMY_TIERS.find((t) => value < t.max)?.id ?? 'full';
}

// Coût "disponible" avant achat = ce qui a été dépensé ce round + ce qu'il
// restait après achat (économie.spent / .remaining sont les seules données
// exposées par le match, mais leur somme reconstruit fidèlement le budget
// de départ du round).
function availableBefore(economy) {
  return (economy?.spent ?? 0) + (economy?.remaining ?? 0);
}

// Pour chaque round joué, compare l'achat réel du joueur suivi (son
// loadout_value, classé en éco/semi/full) à ce que l'économie moyenne de son
// équipe ce round-là pouvait raisonnablement se permettre. Un décalage entre
// les deux (dans un sens ou l'autre) est marqué "discutable" avec explication.
export function analyzeRoundBuys(t, match, name, tag) {
  const me = findMe(match, name, tag);
  if (!me?.puuid || !me?.team) return [];

  return (match.rounds || [])
    .map((round, roundIndex) => {
      const playerStats = round.player_stats || [];
      const myPs = playerStats.find((ps) => ps.player_puuid === me.puuid);
      const teammates = playerStats.filter((ps) => ps.player_team === me.team);
      if (!myPs || teammates.length === 0) return null;

      const teamAvgAvailable =
        teammates.reduce((sum, ps) => sum + availableBefore(ps.economy), 0) / teammates.length;
      const recommendedTier = tierFor(teamAvgAvailable);
      const actualTier = tierFor(myPs.economy?.loadout_value ?? 0);
      const diff = TIER_ORDER[actualTier] - TIER_ORDER[recommendedTier];

      const actualLabel = t(`common.economyTiers.${actualTier}`).toLowerCase();
      const recommendedLabel = t(`common.economyTiers.${recommendedTier}`).toLowerCase();

      let verdict;
      let explanation;
      if (diff === 0) {
        verdict = 'coherent';
        explanation = t('buySim.explanation.coherent', { tier: actualLabel });
      } else if (diff > 0) {
        verdict = 'questionable';
        explanation = t('buySim.explanation.tooHigh', { actual: actualLabel, recommended: recommendedLabel });
      } else {
        verdict = 'questionable';
        explanation = t('buySim.explanation.tooLow', { actual: actualLabel, recommended: recommendedLabel });
      }

      return {
        roundNumber: roundIndex + 1,
        weapon: myPs.economy?.weapon?.name ?? null,
        armor: myPs.economy?.armor?.name ?? null,
        loadoutValue: myPs.economy?.loadout_value ?? 0,
        actualTier,
        recommendedTier,
        verdict,
        explanation,
        roundWon: round.winning_team === me.team,
      };
    })
    .filter(Boolean);
}

export function summarizeRoundBuys(rounds) {
  if (rounds.length === 0) return { total: 0, coherent: 0, percent: null };
  const coherent = rounds.filter((r) => r.verdict === 'coherent').length;
  return { total: rounds.length, coherent, percent: (coherent / rounds.length) * 100 };
}

// Certains matchs en cache n'ont pas le joueur suivi dans leur roster (AFK,
// changement de pseudo...), les exclure ici plutôt que de laisser
// analyzeRoundBuys() renvoyer silencieusement une liste vide pour un match
// sélectionné par défaut.
export function listMatchesWithRounds(matches, name, tag) {
  return excludeDeathmatch(matches).filter(
    (m) => Array.isArray(m.rounds) && m.rounds.length > 0 && !!findMe(m, name, tag),
  );
}

// Valeurs réelles de shopData.category sur valorant-api.com (vérifiées, pas
// l'enum interne "EEquippableCategory::x" qui existe séparément).
const WEAPON_CATEGORY_PRIORITY = ['Rifles', 'SMGs', 'Shotguns', 'Sniper Rifles', 'Heavy Weapons', 'Pistols'];

function bestAffordableWeapon(weapons, budget) {
  for (const category of WEAPON_CATEGORY_PRIORITY) {
    const inCategory = weapons.filter((w) => w.category === category && w.cost <= budget);
    if (inCategory.length > 0) {
      return inCategory.reduce((best, w) => (w.cost > best.cost ? w : best));
    }
  }
  return null;
}

// Règles générales d'économie (pas une science exacte, ni des prix de
// capacités d'agent, non exposés par l'API) : priorise le bouclier complet
// s'il reste la place pour une arme correcte, sinon bouclier léger, sinon
// arme seule. Le "en fonction de ton agent" se limite à un conseil de
// priorité selon le rôle (donnée réelle), pas à des capacités précises.
export function recommendBuy(t, credits, weapons, armors, agentRole) {
  if (weapons.length === 0 || armors.length === 0) return null;

  const heavyShield = armors.find((a) => a.cost === 1000) ?? null;
  const lightShield = armors.find((a) => a.cost === 400) ?? null;

  let shield = null;
  let weaponBudget = credits;

  if (heavyShield && credits - heavyShield.cost >= 800) {
    shield = heavyShield;
    weaponBudget = credits - heavyShield.cost;
  } else if (lightShield && credits - lightShield.cost >= 500) {
    shield = lightShield;
    weaponBudget = credits - lightShield.cost;
  }

  let weapon = bestAffordableWeapon(weapons, weaponBudget);

  // Si aucune arme correcte n'est finançable avec bouclier, on retente sans
  // bouclier plutôt que de proposer un blouson vide.
  if (!weapon && shield) {
    shield = null;
    weaponBudget = credits;
    weapon = bestAffordableWeapon(weapons, weaponBudget);
  }

  const roleNote =
    agentRole === 'Duelliste'
      ? t('buySim.roleNoteDuelist')
      : agentRole === 'Sentinelle' || agentRole === 'Contrôleur'
        ? t('buySim.roleNoteDefensive', { role: agentRole.toLowerCase() })
        : null;

  return {
    weapon,
    shield,
    spent: (weapon?.cost ?? 0) + (shield?.cost ?? 0),
    remaining: credits - ((weapon?.cost ?? 0) + (shield?.cost ?? 0)),
    roleNote,
  };
}
