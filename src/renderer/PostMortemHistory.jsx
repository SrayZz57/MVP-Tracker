import { useEffect, useState } from 'react';

function PostMortemHistory() {
  const [history, setHistory] = useState([]);

  useEffect(() => {
    window.electronAPI.getMatchAssessmentHistory(30).then(setHistory);
  }, []);

  if (history.length === 0) {
    return (
      <div className="card">
        <h3>🪞 Auto-évaluation post-match</h3>
        <p>
          Pas encore de double check répondu — la popup apparaît après un nouveau match tant que tu ne l'as pas
          fermée.
        </p>
      </div>
    );
  }

  const allResults = history.flatMap((h) => JSON.parse(h.answers_json)).filter((r) => r.correct !== null);
  const overallRate =
    allResults.length > 0 ? (allResults.filter((r) => r.correct).length / allResults.length) * 100 : null;

  const recentResults = history
    .slice(0, 5)
    .flatMap((h) => JSON.parse(h.answers_json))
    .filter((r) => r.correct !== null);
  const recentRate =
    recentResults.length > 0 ? (recentResults.filter((r) => r.correct).length / recentResults.length) * 100 : null;

  return (
    <div className="card">
      <h3>🪞 Auto-évaluation post-match</h3>
      <p className="label">Compare ce que tu ressentais après un match à ce que tes stats montraient vraiment.</p>
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="value">{overallRate === null ? '?' : `${overallRate.toFixed(0)}%`}</div>
          <div className="label">Justesse globale ({history.length} matchs évalués)</div>
        </div>
        <div className="stat-tile">
          <div className="value">{recentRate === null ? '?' : `${recentRate.toFixed(0)}%`}</div>
          <div className="label">Sur les 5 derniers</div>
        </div>
      </div>

      <div className="puzzle-history-list" style={{ marginTop: '0.75rem' }}>
        {history.slice(0, 10).map((h) => {
          const results = JSON.parse(h.answers_json).filter((r) => r.correct !== null);
          const correctCount = results.filter((r) => r.correct).length;
          return (
            <div key={h.id} className="puzzle-history-row">
              <span className="puzzle-history-date">{h.date}</span>
              <span className="puzzle-history-map">{h.map ?? '?'}</span>
              <span className="puzzle-history-status">
                {correctCount}/{results.length} justes
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PostMortemHistory;
