import { excludeDeathmatch, groupStats, clutchStats, firstBloodStats, tiltFrequency } from './valorantStats.js';

const MIN_MATCHES = 5;

function bucket(score) {
  if (score === null) return null;
  if (score >= 66) return 'high';
  if (score >= 34) return 'mid';
  return 'low';
}

// Combinaisons de buckets (agressivité/stabilité/polyvalence/clutch) → titre +
// description. Règles simples et lisibles, pas un modèle prédictif — juste une
// façon de résumer 4 scores dérivés de vraies stats en une phrase.
function describeProfile({ aggression, stability, versatility, clutch }) {
  const a = bucket(aggression);
  const s = bucket(stability);
  const v = bucket(versatility);
  const c = bucket(clutch);

  if (a === 'high' && s === 'low') {
    return {
      title: 'Duelist impulsif',
      text: "Tu prends l'initiative en premier sur la plupart des rounds, mais les mauvaises passes te font vite décrocher. Un vrai moteur d'agression, à condition de savoir freiner après une série de défaites.",
    };
  }
  if (a === 'high' && c === 'high') {
    return {
      title: 'Fragger clutch',
      text: "Tu ouvres les rounds et tu fermes les situations serrées : une combinaison rare d'agressivité et de sang-froid en fin de round.",
    };
  }
  if (a === 'high') {
    return {
      title: 'Entry fragger',
      text: "Tu es souvent le premier au contact, que ce soit pour ouvrir l'espace de ton équipe ou tomber en premier. Un rôle exigeant qui pèse beaucoup sur le début de round.",
    };
  }
  if (v === 'high' && s === 'high') {
    return {
      title: 'Tacticien polyvalent',
      text: "Tu passes d'un agent à l'autre sans perdre en régularité, et tu encaisses les mauvaises séries sans t'effondrer. Le profil flexible d'un joueur qui s'adapte à l'équipe.",
    };
  }
  if (s === 'low') {
    return {
      title: 'Joueur en dents de scie',
      text: "Tes séries de défaites ont tendance à s'enchaîner et à peser sur ta perf. Le module Tilt peut t'aider à repérer le bon moment pour souffler.",
    };
  }
  if (c === 'high') {
    return {
      title: 'Closeur',
      text: 'Tu ne domines peut-être pas le début de round, mais tu es clutch : tu convertis un nombre de situations à 1 contre plusieurs au-dessus de la moyenne.',
    };
  }
  if (v === 'low') {
    return {
      title: 'Spécialiste',
      text: "Tu restes fidèle à un petit noyau d'agents plutôt que de tourner. Une expertise ciblée, au prix d'un peu de flexibilité en cas de besoin de switch.",
    };
  }
  return {
    title: 'Joueur équilibré',
    text: "Rien ne ressort fortement dans un sens ou l'autre pour l'instant — un profil stable, sans excès ni faiblesse marquée sur les axes suivis.",
  };
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

  const { title, text } = describeProfile(scores);

  return {
    ready: true,
    matchesAnalyzed: ranked.length,
    scores,
    distinctAgents: agentRows.length,
    firstBloods: fb.firstBloods,
    firstDeaths: fb.firstDeaths,
    clutchAttempts: clutch.attempts,
    title,
    text,
  };
}
