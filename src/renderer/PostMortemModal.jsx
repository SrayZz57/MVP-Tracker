import { useEffect, useState } from 'react';
import { POST_MORTEM_QUESTIONS, ANSWER_LEVELS, computeActualAnswers, gradeAnswers, buildComparisonText } from './postMortem.js';

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function PostMortemModal({ settings, matches }) {
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
    await window.electronAPI.saveMatchAssessment(
      matchId,
      todayKey(),
      latestMatch.metadata?.map ?? null,
      JSON.stringify(results),
    );
    setGraded(results);
    setStatus('answered');
  }

  return (
    <div className="postmortem-backdrop">
      <div className="postmortem-modal card">
        {status === 'prompting' ? (
          <>
            <h3>🪞 Double check post-match</h3>
            <p className="label">
              {latestMatch.metadata?.map ?? '?'} — avant de voir tes vraies stats, réponds vite fait à ces 3
              questions.
            </p>
            {POST_MORTEM_QUESTIONS.map((q) => (
              <div key={q.id} className="postmortem-question">
                <p>{q.text}</p>
                <div className="postmortem-answers">
                  {ANSWER_LEVELS.map((level) => (
                    <button
                      key={level.id}
                      className={answers[q.id] === level.id ? 'strategy-tool active' : 'strategy-tool'}
                      onClick={() => selectAnswer(q.id, level.id)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
            <div className="postmortem-actions">
              <button onClick={handleDismiss}>Plus tard</button>
              <button className="refresh" onClick={handleSubmit} disabled={!allAnswered}>
                Voir le résultat
              </button>
            </div>
          </>
        ) : (
          <>
            <h3>🪞 Perception vs réalité</h3>
            {graded.map((r) => (
              <div
                key={r.id}
                className={`postmortem-result ${r.correct === null ? '' : r.correct ? 'correct' : 'incorrect'}`}
              >
                <div className="postmortem-result-title">
                  {r.correct === null ? 'ℹ️' : r.correct ? '✅' : '❌'} {r.question} — tu as répondu "
                  {ANSWER_LEVELS.find((l) => l.id === r.userAnswer)?.label}"
                </div>
                <p className="label">{buildComparisonText(r)}</p>
              </div>
            ))}
            <div className="postmortem-actions">
              <button className="refresh" onClick={handleDismiss}>
                Fermer
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default PostMortemModal;
