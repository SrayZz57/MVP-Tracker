import { findMe, hitStats, excludeDeathmatch, formStats, overallHsPercent } from './valorantStats.js';

// 3 questions simples, chacune avec 3 niveaux de réponse. Chaque réponse est
// comparée à un signal réel du match (K/D vs moyenne perso, kills/deaths du
// match, précision tête vs moyenne perso) — pas de jugement de "bon jeu" dans
// l'absolu, juste un écart perception / stats mesurables.
export const POST_MORTEM_QUESTIONS = [
  { id: 'overall', text: 'Tu penses avoir bien joué ce match ?' },
  { id: 'duels', text: 'Tu penses avoir gagné tes duels ?' },
  { id: 'aim', text: 'Tu penses avoir eu une bonne précision (tête) ?' },
];

export const ANSWER_LEVELS = [
  { id: 'oui', label: 'Oui' },
  { id: 'moyen', label: 'Moyen' },
  { id: 'non', label: 'Non' },
];

// Calcule ce que les stats réelles du match disent pour chaque question,
// comparé aux moyennes du joueur suivi sur l'ensemble de ses matchs.
export function computeActualAnswers(match, allMatches, name, tag) {
  const me = findMe(match, name, tag);
  if (!me) return null;

  const kills = me.stats?.kills ?? 0;
  const deaths = me.stats?.deaths ?? 0;
  const matchKd = deaths > 0 ? kills / deaths : kills;

  const ranked = excludeDeathmatch(allMatches);
  const overallKd = formStats(ranked, name, tag).overallKd;
  const overallHs = overallHsPercent(ranked, name, tag);
  const { hsPercent } = hitStats(me);

  const bucketFromRatio = (value, reference, margin = 0.15) => {
    if (value === null || reference === null || reference === 0) return null;
    const ratio = value / reference;
    if (ratio >= 1 + margin) return 'oui';
    if (ratio <= 1 - margin) return 'non';
    return 'moyen';
  };

  const overall = bucketFromRatio(matchKd, overallKd);
  const duels = kills > deaths ? 'oui' : kills === deaths ? 'moyen' : 'non';
  const aim = bucketFromRatio(hsPercent, overallHs);

  return {
    overall: { actual: overall, matchKd, overallKd },
    duels: { actual: duels, kills, deaths },
    aim: { actual: aim, hsPercent, overallHs },
  };
}

export function gradeAnswers(userAnswers, actualAnswers) {
  return POST_MORTEM_QUESTIONS.map((q) => {
    const actual = actualAnswers[q.id]?.actual ?? null;
    const userAnswer = userAnswers[q.id] ?? null;
    return {
      id: q.id,
      question: q.text,
      userAnswer,
      actual,
      correct: actual !== null && userAnswer !== null ? actual === userAnswer : null,
      detail: actualAnswers[q.id],
    };
  });
}

export function buildComparisonText(result) {
  if (result.actual === null) return "Pas assez de données pour comparer sur cette question.";

  if (result.id === 'overall') {
    const { matchKd, overallKd } = result.detail;
    return `K/D de ce match : ${matchKd.toFixed(2)} — ta moyenne générale est de ${overallKd.toFixed(2)}.`;
  }
  if (result.id === 'duels') {
    const { kills, deaths } = result.detail;
    return `${kills} kills pour ${deaths} morts ce match.`;
  }
  if (result.id === 'aim') {
    const { hsPercent, overallHs } = result.detail;
    return `Précision tête ce match : ${hsPercent === null ? '?' : hsPercent.toFixed(0) + '%'} — ta moyenne est de ${overallHs === null ? '?' : overallHs.toFixed(0) + '%'}.`;
  }
  return '';
}
