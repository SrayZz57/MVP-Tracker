import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { POST_MORTEM_QUESTIONS, ANSWER_LEVELS, computeActualAnswers, gradeAnswers, buildComparisonText } from './postMortem.js';

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function PostMortemModal({ settings, matches }) {
  const { t } = useTranslation();
  const latestMatch = matches[0] ?? null;
  const matchId = latestMatch?.metadata?.matchid ?? null;

  const [status, setStatus] = useState('hidden'); // hidden | prompting | answered
  const [answers, setAnswers] = useState({});
  const [graded, setGraded] = useState(null);
  const [dismissed, setDismissed] = useState(() => new Set());

  useEffect(() => {
    if (!matchId || dismissed.has(matchId)) {
      setStatus('hidden');
      return undefined;
    }

    let cancelled = false;
    window.electronAPI.getMatchAssessment(matchId).then((existing) => {
      if (cancelled) return;
      setStatus(existing ? 'hidden' : 'prompting');
      setAnswers({});
      setGraded(null);
    });
    return () => {
      cancelled = true;
    };
  }, [matchId, dismissed]);

  if (status === 'hidden' || !latestMatch) return null;

  function handleDismiss() {
    setDismissed((prev) => new Set(prev).add(matchId));
  }

  function selectAnswer(questionId, levelId) {
    setAnswers((prev) => ({ ...prev, [questionId]: levelId }));
  }

  const allAnswered = POST_MORTEM_QUESTIONS.every((q) => answers[q.id]);

  async function handleSubmit() {
    const actual = computeActualAnswers(latestMatch, matches, settings.name, settings.tag);
    const results = gradeAnswers(answers, actual ?? {});
    try {
      await window.electronAPI.saveMatchAssessment(
        matchId,
        todayKey(),
        latestMatch.metadata?.map ?? null,
        JSON.stringify(results),
      );
    } catch (err) {
      console.error('[postmortem] échec de l\'enregistrement :', err.message);
      return;
    }
    setGraded(results);
    setStatus('answered');
  }

  return (
    <div className="postmortem-backdrop">
      <div className="postmortem-modal card">
        {status === 'prompting' ? (
          <>
            <h3>{t('postmortem.promptTitle')}</h3>
            <p className="label">
              {t('postmortem.promptSubtitle', { map: latestMatch.metadata?.map ?? '?' })}
            </p>
            {POST_MORTEM_QUESTIONS.map((q) => (
              <div key={q.id} className="postmortem-question">
                <p>{t(q.textKey)}</p>
                <div className="postmortem-answers">
                  {ANSWER_LEVELS.map((level) => (
                    <button
                      key={level.id}
                      className={answers[q.id] === level.id ? 'strategy-tool active' : 'strategy-tool'}
                      onClick={() => selectAnswer(q.id, level.id)}
                    >
                      {t(level.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="postmortem-actions">
              <button onClick={handleDismiss}>{t('postmortem.later')}</button>
              <button className="refresh" onClick={handleSubmit} disabled={!allAnswered}>
                {t('postmortem.seeResult')}
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>{t('postmortem.resultTitle')}</h3>
            {graded.map((r) => {
              const state = r.correct === null ? 'unknown' : r.correct ? 'correct' : r.close ? 'close' : 'incorrect';
              const icon = { unknown: 'ℹ️', correct: '✅', close: '〜', incorrect: '❌' }[state];
              return (
                <div key={r.id} className={`postmortem-result ${state === 'unknown' ? '' : state}`}>
                  <div className="postmortem-result-title">
                    {t('postmortem.resultHeading', {
                      icon,
                      question: t(r.textKey),
                      answer: t(ANSWER_LEVELS.find((l) => l.id === r.userAnswer)?.labelKey),
                    })}
                  </div>
                  <p className="label">{buildComparisonText(t, r)}</p>
                </div>
              );
            })}
            <div className="postmortem-actions">
              <button className="refresh" onClick={handleDismiss}>
                {t('postmortem.close')}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PostMortemModal;
