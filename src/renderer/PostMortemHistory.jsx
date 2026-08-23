import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

function PostMortemHistory() {
  const { t } = useTranslation();
  const [history, setHistory] = useState([]);

  useEffect(() => {
    window.electronAPI.getMatchAssessmentHistory(30).then(setHistory);
  }, []);

  if (history.length === 0) {
    return (
      <div className="card">
        <h3>{t('postmortemHistory.title')}</h3>
        <p>{t('postmortemHistory.noneYet')}</p>
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
      <h3>{t('postmortemHistory.title')}</h3>
      <p className="label">{t('postmortemHistory.hint')}</p>
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="value">{overallRate === null ? '?' : `${overallRate.toFixed(0)}%`}</div>
          <div className="label">{t('postmortemHistory.overallAccuracy', { count: history.length })}</div>
        </div>
        <div className="stat-tile">
          <div className="value">{recentRate === null ? '?' : `${recentRate.toFixed(0)}%`}</div>
          <div className="label">{t('postmortemHistory.last5')}</div>
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
                {t('postmortemHistory.correctCount', { correct: correctCount, total: results.length })}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default PostMortemHistory;
