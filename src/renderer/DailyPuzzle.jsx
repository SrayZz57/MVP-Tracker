import { useEffect, useMemo, useState } from 'react';
import { ECONOMY_TIERS } from './valorantStats.js';
import { generatePuzzleSituation, gradeChoice, buildRevealText, PUZZLE_OPTIONS } from './dailyPuzzle.js';
import Skeleton from './Skeleton.jsx';

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function economyLabel(tierId) {
  return ECONOMY_TIERS.find((t) => t.id === tierId)?.label ?? '?';
}

function DailyPuzzle({ settings, matches }) {
  const [puzzle, setPuzzle] = useState(undefined); // undefined = chargement, null = indisponible
  const [history, setHistory] = useState([]);
  const date = useMemo(() => todayKey(), []);

  useEffect(() => {
    let cancelled = false;

    window.electronAPI.getPuzzle(date).then((existing) => {
      if (cancelled) return;
      if (existing) {
        setPuzzle({
          situation: JSON.parse(existing.situation_json),
          choice: existing.choice,
          correct: existing.correct === 1,
          answered: existing.answered_at !== null,
        });
        return;
      }

      const situation = generatePuzzleSituation(matches, settings.name, settings.tag, date);
      if (!situation) {
        setPuzzle(null);
        return;
      }
      window.electronAPI.savePuzzle(date, JSON.stringify(situation)).then(() => {
        if (cancelled) return;
        setPuzzle({ situation, choice: null, correct: null, answered: false });
      });
    });

    return () => {
      cancelled = true;
    };
  }, [date, matches, settings.name, settings.tag]);

  const refreshHistory = () => window.electronAPI.getPuzzleHistory(30).then(setHistory);

  useEffect(() => {
    refreshHistory();
  }, [puzzle?.answered]);

  async function handleChoice(optionId) {
    if (!puzzle || puzzle.answered) return;
    const correct = gradeChoice(puzzle.situation, optionId);
    await window.electronAPI.answerPuzzle(date, optionId, correct);
    setPuzzle({ ...puzzle, choice: optionId, correct, answered: true });
  }

  const answeredHistory = history.filter((h) => h.answered_at !== null);
  const successRate =
    answeredHistory.length > 0
      ? (answeredHistory.filter((h) => h.correct === 1).length / answeredHistory.length) * 100
      : null;

  return (
    <div>
      <div className="card">
        <h3>🧩 Puzzle tactique du jour</h3>
        <p className="label">
          Une vraie situation tirée d'un de tes matchs, sans le résultat. Choisis ce que tu aurais fait, puis
          découvre ce qu'il s'est réellement passé — et si ça correspond à ta façon de jouer.
        </p>

        {puzzle === undefined && <Skeleton lines={4} />}

        {puzzle === null && (
          <p>Pas encore assez de matchs classés en cache pour générer un puzzle — reviens après quelques parties.</p>
        )}

        {puzzle && (
          <>
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value">{puzzle.situation.map}</div>
                <div className="label">Round {puzzle.situation.roundNumber}</div>
              </div>
              <div className="stat-tile">
                <div className="value">
                  {puzzle.situation.scoreBefore.mine} - {puzzle.situation.scoreBefore.theirs}
                </div>
                <div className="label">Score avant ce round</div>
              </div>
              <div className="stat-tile">
                <div className="value">{economyLabel(puzzle.situation.myEconomyTier)}</div>
                <div className="label">Ton économie</div>
              </div>
              <div className="stat-tile">
                <div className="value">{economyLabel(puzzle.situation.enemyEconomyTier)}</div>
                <div className="label">Économie adverse (moyenne)</div>
              </div>
            </div>

            {!puzzle.answered ? (
              <>
                <p style={{ marginTop: '1rem', fontWeight: 600 }}>Vu ce contexte, qu'aurais-tu fait ce round ?</p>
                <div className="puzzle-options">
                  {PUZZLE_OPTIONS.map((option) => (
                    <button key={option.id} className="puzzle-option" onClick={() => handleChoice(option.id)}>
                      <span className="puzzle-option-icon">{option.icon}</span>
                      {option.label}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <div className={`puzzle-reveal ${puzzle.correct ? 'correct' : 'incorrect'}`}>
                <div className="puzzle-reveal-title">
                  {puzzle.correct ? '✅ Ça correspond à ce que tu as fait' : '❌ Ce round-là, tu as joué différemment'}
                </div>
                <p>{buildRevealText(puzzle.situation)}</p>
                <p className="label">
                  Ton choix ({PUZZLE_OPTIONS.find((o) => o.id === puzzle.choice)?.label}) était classé "
                  {PUZZLE_OPTIONS.find((o) => o.id === puzzle.choice)?.bucket === 'aggressive' ? 'agressif' : 'patient'}
                  " — ta façon de jouer ce round-là a été "{puzzle.situation.actualBucket === 'aggressive' ? 'agressive' : 'patiente'}".
                </p>
              </div>
            )}
          </>
        )}
      </div>

      <div className="card">
        <h3>📜 Historique</h3>
        {successRate !== null && (
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{successRate.toFixed(0)}%</div>
              <div className="label">Taux de bonnes décisions</div>
            </div>
            <div className="stat-tile">
              <div className="value">{answeredHistory.length}</div>
              <div className="label">Puzzles résolus</div>
            </div>
          </div>
        )}
        {history.length === 0 ? (
          <p className="label" style={{ marginTop: '0.75rem' }}>
            Aucun puzzle résolu pour l'instant.
          </p>
        ) : (
          <div className="puzzle-history-list">
            {history.map((h) => {
              const situation = JSON.parse(h.situation_json);
              return (
                <div key={h.id} className="puzzle-history-row">
                  <span className="puzzle-history-date">{h.date}</span>
                  <span className="puzzle-history-map">{situation.map}</span>
                  <span className={`buy-round-badge ${h.answered_at === null ? '' : h.correct === 1 ? 'coherent' : 'questionable'}`}>
                    {h.answered_at === null ? '⏳ Pas encore répondu' : h.correct === 1 ? '✅ Bonne intuition' : '❌ Loupé'}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

export default DailyPuzzle;
