import { findMe, hitStats, excludeDeathmatch, formStats, overallHsPercent } from './valorantStats.js';

// 3 questions simples, chacune avec 3 niveaux de réponse. Chaque réponse est
// comparée à un signal réel du match (K/D vs moyenne perso, kills/deaths du
// match, précision tête vs moyenne perso) — pas de jugement de "bon jeu" dans
// l'absolu, juste un écart perception / stats mesurables.
// `textKey`/id de niveau restent des codes internes traduits à l'affichage
// (via t()), jamais comparés en tant que texte affiché.
export const POST_MORTEM_QUESTIONS = [
  { id: 'overall', textKey: 'postmortem.questions.overall' },
  { id: 'duels', textKey: 'postmortem.questions.duels' },
  { id: 'aim', textKey: 'postmortem.questions.aim' },
];

export const ANSWER_LEVELS = [
  { id: 'oui', labelKey: 'postmortem.answers.yes' },
  { id: 'moyen', labelKey: 'postmortem.answers.average' },
  { id: 'non', labelKey: 'postmortem.answers.no' },
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
      textKey: q.textKey,
      userAnswer,
      actual,
      correct: actual !== null && userAnswer !== null ? actual === userAnswer : null,
      detail: actualAnswers[q.id],
    };
  });
}

export function buildComparisonText(t, result) {
  if (result.actual === null) return t('postmortem.comparison.notEnoughData');

  if (result.id === 'overall') {
    const { matchKd, overallKd } = result.detail;
    return t('postmortem.comparison.overall', { matchKd: matchKd.toFixed(2), overallKd: overallKd.toFixed(2) });
  }
  if (result.id === 'duels') {
    const { kills, deaths } = result.detail;
    return t('postmortem.comparison.duels', { kills, deaths });
  }
  if (result.id === 'aim') {
    const { hsPercent, overallHs } = result.detail;
    return t('postmortem.comparison.aim', {
      hsPercent: hsPercent === null ? '?' : `${hsPercent.toFixed(0)}%`,
      overallHs: overallHs === null ? '?' : `${overallHs.toFixed(0)}%`,
    });
  }
  return '';
}
