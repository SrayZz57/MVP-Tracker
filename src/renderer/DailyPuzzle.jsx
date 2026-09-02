import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ECONOMY_TIERS } from './valorantStats.js';
import { generatePuzzleSituation, gradeChoice, buildRevealText, PUZZLE_OPTIONS } from './dailyPuzzle.js';
import { PuzzleSkeleton } from './skeletons.jsx';
import LoadingGate from './LoadingGate.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';
import Icon from './Icon.jsx';
import Button from './ui/Button';

function todayKey() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

function economyTierId(tierId) {
  return ECONOMY_TIERS.find((t) => t.id === tierId)?.id ?? null;
}

function DailyPuzzle({ settings, matches }) {
  const { t } = useTranslation();
  const [puzzle, setPuzzle] = useState(undefined);
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

  const chosenOption = puzzle && puzzle.choice ? PUZZLE_OPTIONS.find((o) => o.id === puzzle.choice) : null;

  return (
    <div>
      <CollapsibleCard collapsible={false} id="puzzle.today" title={t('puzzle.title')}>
        <p className="label">{t('puzzle.description')}</p>

        <LoadingGate active={puzzle === undefined} fallback={<PuzzleSkeleton />}>

          {puzzle === null && <p>{t('puzzle.notEnoughMatches')}</p>}

          {puzzle && (
            <>
              <div className="stat-tiles">
                <div className="stat-tile">
                  <div className="value">{puzzle.situation.map}</div>
                  <div className="label">{t('puzzle.roundLabel', { n: puzzle.situation.roundNumber })}</div>
                </div>
                <div className="stat-tile">
                  <div className="value">
                    {puzzle.situation.scoreBefore.mine} - {puzzle.situation.scoreBefore.theirs}
                  </div>
                  <div className="label">{t('puzzle.scoreBefore')}</div>
                </div>
                <div className="stat-tile">
                  <div className="value">
                    <span className="value-icon">
                      {puzzle.situation.side === 'attack'
                        ? t('puzzle.sideAttack')
                        : puzzle.situation.side === 'defense'
                          ? t('puzzle.sideDefense')
                          : t('puzzle.sideUnknown')}
                    </span>
                  </div>
                  <div className="label">{t('puzzle.sideLabel')}</div>
                </div>
                <div className="stat-tile">
                  <div className="value">{t(`common.economyTiers.${economyTierId(puzzle.situation.myEconomyTier)}`)}</div>
                  <div className="label">{t('puzzle.myEconomy')}</div>
                </div>
                <div className="stat-tile">
                  <div className="value">{t(`common.economyTiers.${economyTierId(puzzle.situation.enemyEconomyTier)}`)}</div>
                  <div className="label">{t('puzzle.enemyEconomy')}</div>
                </div>
              </div>

              {!puzzle.answered ? (
                <>
                  <p style={{ marginTop: '1rem', fontWeight: 600 }}>{t('puzzle.question')}</p>
                  <div className="puzzle-options">
                    {PUZZLE_OPTIONS.map((option) => (
                      <Button variant="ghost" key={option.id} className="puzzle-option" onClick={() => handleChoice(option.id)}>
                        <span className="puzzle-option-icon"><Icon icon={option.icon} /></span>
                        {t(option.labelKey)}
                      </Button>
                    ))}
                  </div>
                </>
              ) : (
                <div className={`puzzle-reveal ${puzzle.correct ? 'correct' : 'incorrect'}`}>
                  <div className="puzzle-reveal-title">
                    {puzzle.correct ? t('puzzle.matchesReveal') : t('puzzle.notMatchReveal')}
                  </div>
                  <p>{buildRevealText(t, puzzle.situation)}</p>
                  <p className="label">
                    {t('puzzle.choiceWas', {
                      choice: chosenOption ? t(chosenOption.labelKey) : '',
                      bucket: chosenOption?.bucket === 'aggressive' ? t('puzzle.bucketAggressive') : t('puzzle.bucketPatient'),
                      actual: puzzle.situation.actualBucket === 'aggressive' ? t('puzzle.bucketAggressiveFem') : t('puzzle.bucketPatientFem'),
                    })}
                  </p>
                </div>
              )}
            </>
          )}
        </LoadingGate>
      </CollapsibleCard>

      <CollapsibleCard id="puzzle.history" title={t('puzzle.historyTitle')}>
        {successRate !== null && (
          <div className="stat-tiles">
            <div className="stat-tile">
              <div className="value">{successRate.toFixed(0)}%</div>
              <div className="label">{t('puzzle.successRate')}</div>
            </div>
            <div className="stat-tile">
              <div className="value">{answeredHistory.length}</div>
              <div className="label">{t('puzzle.puzzlesSolved')}</div>
            </div>
          </div>
        )}
        {history.length === 0 ? (
          <p className="label" style={{ marginTop: '0.75rem' }}>{t('puzzle.noHistory')}</p>
        ) : (
          <div className="puzzle-history-list">
            {history.map((h) => {
              const situation = JSON.parse(h.situation_json);
              return (
                <div key={h.id} className="puzzle-history-row">
                  <span className="puzzle-history-date">{h.date}</span>
                  <span className="puzzle-history-map">{situation.map}</span>
                  <span className={`buy-round-badge ${h.answered_at === null ? '' : h.correct === 1 ? 'coherent' : 'questionable'}`}>
                    {h.answered_at === null ? t('puzzle.notAnsweredYet') : h.correct === 1 ? t('puzzle.goodIntuition') : t('puzzle.missed')}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
}

export default DailyPuzzle;
