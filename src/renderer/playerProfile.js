import { excludeDeathmatch, groupStats, clutchStats, firstBloodStats, tiltFrequency } from './valorantStats.js';

const MIN_MATCHES = 5;

function bucket(score) {
  if (score === null) return null;
  if (score >= 66) return 'high';
  if (score >= 34) return 'mid';
  return 'low';
}

// Combinaisons de buckets (agressivité/stabilité/polyvalence/clutch) → un
// simple archétype (clé i18n), le vrai titre/texte est résolu à l'affichage
// dans PlayerProfileCard.jsx via t('profile.archetypes.<key>.*'), pour rester
// traduisible. Règles simples et lisibles, pas un modèle prédictif, juste
// une façon de résumer 4 scores dérivés de vraies stats en une phrase.
function describeProfile({ aggression, stability, versatility, clutch }) {
  const a = bucket(aggression);
  const s = bucket(stability);
  const v = bucket(versatility);
  const c = bucket(clutch);

  if (a === 'high' && s === 'low') return 'duelistImpulsive';
  if (a === 'high' && c === 'high') return 'clutchFragger';
  if (a === 'high' && v === 'high') return 'aggressivePolyvalent';
  if (a === 'high') return 'entryFragger';

  // "v=high && s=high" à lui seul regroupait une trop grande part des joueurs
  // (beaucoup de comptes actifs cumulent naturellement pas mal d'agents
  // différents et peu de séries de défaites), sous-découpé via clutch et
  // agressivité pour répartir ce cluster sur plusieurs profils au lieu d'un.
  if (v === 'high' && s === 'high' && c === 'high') return 'clutchAllrounder';
  if (v === 'high' && s === 'high' && a === 'low') return 'quietFlexible';
  if (v === 'high' && s === 'high') return 'versatileTactician';

  if (s === 'low' && c === 'high') return 'unstableCloser';
  if (s === 'low') return 'inconsistentPlayer';

  if (c === 'high' && v === 'low') return 'clutchSpecialist';
  if (c === 'high') return 'closer';

  if (v === 'low' && a === 'low') return 'quietSpecialist';
  if (v === 'low') return 'specialist';

  if (a === 'low' && s === 'high') return 'steadyPillar';

  return 'balancedPlayer';
}

// Calcule 4 scores /100 à partir des données déjà collectées par les autres
// modules (aucun nouvel appel API) :
// - Agressivité : ratio premier sang / (premier sang + première mort) par round
// - Stabilité mentale : inverse de la fréquence de tilt (séries de 3 défaites+)
// - Polyvalence : nombre d'agents distincts joués, plafonné à 8
// - Clutch factor : winrate en situation de clutch (clutchStats), si ≥3 tentatives
export function computePlayerProfile(matches, name, tag) {
  const ranked = excludeDeathmatch(matches);
  if (ranked.length < MIN_MATCHES) {
    return { ready: false, matchesAnalyzed: ranked.length, minMatches: MIN_MATCHES };
  }

  const fb = firstBloodStats(matches, name, tag);
  const tilt = tiltFrequency(matches, name, tag);
  const clutch = clutchStats(matches, name, tag);
  const agentRows = groupStats(ranked, name, tag, (match, me) => me.character);

  const scores = {
    aggression: fb.ratio,
    stability: tilt.percent === null ? null : 100 - tilt.percent,
    versatility: agentRows.length > 0 ? Math.min(100, (agentRows.length / 8) * 100) : null,
    clutch: clutch.attempts >= 3 ? clutch.winrate : null,
  };

  const archetype = describeProfile(scores);

  return {
    ready: true,
    matchesAnalyzed: ranked.length,
    scores,
    distinctAgents: agentRows.length,
    firstBloods: fb.firstBloods,
    firstDeaths: fb.firstDeaths,
    clutchAttempts: clutch.attempts,
    archetype,
  };
}
