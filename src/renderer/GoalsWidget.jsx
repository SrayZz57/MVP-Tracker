import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Target, X, Check } from 'lucide-react';
import Icon from './Icon.jsx';
import { excludeDeathmatch, overallHsPercent, overallWinrate, formStats, groupStats } from './valorantStats.js';
import { loadGoals, addGoal as addGoalCloud, toggleGoalDone as toggleGoalDoneCloud, deleteGoal as deleteGoalCloud } from './personalData.js';
import Button from './ui/Button';

const MIN_GAMES_FOR_BREAKDOWN = 3;

function currentMetricValue(goal, matches, settings) {
  const clean = excludeDeathmatch(matches);
  if (goal.metric === 'hsPercent') return overallHsPercent(matches, settings.name, settings.tag);
  if (goal.metric === 'winrate') return overallWinrate(clean, settings.name, settings.tag);
  if (goal.metric === 'kd') return formStats(clean, settings.name, settings.tag).overallKd;
  if (goal.metric === 'mapWinrate') {
    const row = groupStats(clean, settings.name, settings.tag, (m) => m.metadata?.map).find(
      (r) => r.key === goal.subject,
    );
    return row?.winrate ?? null;
  }
  if (goal.metric === 'agentWinrate') {
    const row = groupStats(clean, settings.name, settings.tag, (m, me) => me.character).find(
      (r) => r.key === goal.subject,
    );
    return row?.winrate ?? null;
  }
  return null;
}

// Un objectif déjà proposé (ajouté ou non, terminé ou non) sur le même
// sujet ne doit pas être re-proposé, sinon un objectif déjà réussi une
// fois peut être ré-ajouté et re-marqué "atteint" à l'infini.
function alreadyCovered(existingGoals, metric, subject) {
  return existingGoals.some(
    (g) => g.metric === metric && (g.subject ?? null) === (subject ?? null),
  );
}

// Propose des objectifs à partir des stats déjà calculées ailleurs dans l'app
// (pas de saisie manuelle de cible : la cible est déduite du niveau actuel).
// `t` reçu en paramètre : `label` est traduit au moment de la génération,
// mais reste ensuite figé tel quel une fois l'objectif enregistré (comme
// n'importe quelle donnée sauvegardée par l'utilisateur).
function generateSuggestions(t, matches, settings, existingGoals) {
  const clean = excludeDeathmatch(matches);
  const suggestions = [];

  if (!alreadyCovered(existingGoals, 'hsPercent', undefined)) {
    const hs = overallHsPercent(matches, settings.name, settings.tag);
    const target = hs === null ? null : Math.round(Math.min(hs + 5, 45));
    if (hs !== null && target > hs) {
      suggestions.push({ metric: 'hsPercent', label: t('goals.suggestion.hsPercent'), baseline: hs, target });
    }
  }

  if (!alreadyCovered(existingGoals, 'winrate', undefined)) {
    const wr = overallWinrate(clean, settings.name, settings.tag);
    const target = wr === null ? null : Math.round(Math.min(wr + 5, 70));
    if (wr !== null && target > wr) {
      suggestions.push({ metric: 'winrate', label: t('goals.suggestion.winrate'), baseline: wr, target });
    }
  }

  if (!alreadyCovered(existingGoals, 'kd', undefined)) {
    const kd = formStats(clean, settings.name, settings.tag).overallKd;
    const target = kd === null ? null : Math.round((kd + 0.15) * 100) / 100;
    if (kd !== null && target > kd) {
      suggestions.push({ metric: 'kd', label: t('goals.suggestion.kd'), baseline: kd, target });
    }
  }

  // Un objectif par map étant lié à un `subject` précis, on cherche la pire
  // map qui n'a pas déjà un objectif (actif ou terminé) dessus, plutôt que
  // de s'arrêter à la toute pire si elle est déjà couverte.
  const mapRows = groupStats(clean, settings.name, settings.tag, (m) => m.metadata?.map)
    .filter((r) => r.games >= MIN_GAMES_FOR_BREAKDOWN && r.winrate !== null)
    .filter((r) => !alreadyCovered(existingGoals, 'mapWinrate', r.key))
    .sort((a, b) => a.winrate - b.winrate);
  const worstMap = mapRows.find((r) => Math.min(r.winrate + 15, 70) > r.winrate);
  if (worstMap) {
    suggestions.push({
      metric: 'mapWinrate',
      subject: worstMap.key,
      label: t('goals.suggestion.mapWinrate', { map: worstMap.key }),
      baseline: worstMap.winrate,
      target: Math.round(Math.min(worstMap.winrate + 15, 70)),
    });
  }

  const agentRows = groupStats(clean, settings.name, settings.tag, (m, me) => me.character)
    .filter((r) => r.games >= MIN_GAMES_FOR_BREAKDOWN && r.winrate !== null)
    .filter((r) => !alreadyCovered(existingGoals, 'agentWinrate', r.key))
    .sort((a, b) => a.winrate - b.winrate);
  const worstAgent = agentRows.find((r) => Math.min(r.winrate + 15, 70) > r.winrate);
  if (worstAgent) {
    suggestions.push({
      metric: 'agentWinrate',
      subject: worstAgent.key,
      label: t('goals.suggestion.agentWinrate', { agent: worstAgent.key }),
      baseline: worstAgent.winrate,
      target: Math.round(Math.min(worstAgent.winrate + 15, 70)),
    });
  }

  return suggestions;
}

function GoalsWidget({ matches, settings, myId }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    if (!myId) return;
    loadGoals(myId).then(setGoals);
  }, [myId]);

  const activeGoals = useMemo(() => goals.filter((g) => !g.done), [goals]);
  const doneGoals = useMemo(() => goals.filter((g) => g.done), [goals]);

  const suggestions = useMemo(() => {
    if (matches.length === 0) return [];
    // On exclut tout sujet déjà couvert par un objectif actif OU terminé,
    // pour ne jamais reproposer un objectif déjà réussi.
    return generateSuggestions(t, matches, settings, goals);
  }, [t, matches, settings, goals]);

  const handleAddSuggestion = (suggestion) => {
    addGoalCloud(myId, { type: 'metric', ...suggestion }).then(setGoals);
  };

  const handleAddCustom = (event) => {
    event.preventDefault();
    if (!customLabel.trim()) return;
    addGoalCloud(myId, { type: 'custom', label: customLabel.trim() }).then(setGoals);
    setCustomLabel('');
    setShowCustomForm(false);
  };

  const handleToggleDone = (id) => toggleGoalDoneCloud(myId, id).then(setGoals);
  const handleDelete = (id) => deleteGoalCloud(myId, id).then(setGoals);

  return (
    <>
      <Button variant="icon" className="goals-widget-button" onClick={() => setOpen(!open)} title={t('goals.widgetTitle')}>
        <span key={open} className="goals-widget-icon"><Icon icon={Target} /></span>
      </Button>

      {open && (
        <div className="goals-widget-panel">
          <div className="goals-widget-header">
            <h3>{t('goals.panelTitle')}</h3>
            <Button variant="icon" className="goals-widget-close" onClick={() => setOpen(false)}><Icon icon={X} size={16} /></Button>
          </div>

          {activeGoals.length === 0 ? (
            <p className="label">{t('goals.noActiveGoals')}</p>
          ) : (
            activeGoals.map((goal) => {
              if (goal.type === 'custom') {
                return (
                  <div key={goal.id} className="goal-row">
                    <span className="goal-label">{goal.label}</span>
                    <div className="goal-actions">
                      <Button variant="icon" onClick={() => handleToggleDone(goal.id)}><Icon icon={Check} size={16} /></Button>
                      <Button variant="icon" onClick={() => handleDelete(goal.id)}><Icon icon={X} size={16} /></Button>
                    </div>
                  </div>
                );
              }
              const current = currentMetricValue(goal, matches, settings);
              const pct = current === null ? 0 : Math.min((current / goal.target) * 100, 100);
              const reached = current !== null && current >= goal.target;
              return (
                <div key={goal.id} className="goal-row goal-row-metric">
                  <div className="goal-row-top">
                    <span className="goal-label">{goal.label}</span>
                    <span className="goal-value">
                      {current === null ? '?' : current.toFixed(2)} / {goal.target}
                    </span>
                  </div>
                  <div className="goal-progress-track">
                    <div
                      className={`goal-progress-fill ${reached ? 'reached' : ''}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="goal-actions">
                    {reached && <Button variant="primary" onClick={() => handleToggleDone(goal.id)}>{t('goals.markReached')}</Button>}
                    <Button variant="danger" onClick={() => handleDelete(goal.id)}>{t('goals.delete')}</Button>
                  </div>
                </div>
              );
            })
          )}

          {doneGoals.length > 0 && (
            <details className="goals-done-list">
              <summary>{t('goals.doneCount', { count: doneGoals.length })}</summary>
              {doneGoals.map((goal) => (
                <div key={goal.id} className="goal-row goal-row-done">
                  <span className="goal-label"><Icon icon={Check} size={14} /> {goal.label}</span>
                  <Button variant="icon" onClick={() => handleDelete(goal.id)}><Icon icon={X} size={16} /></Button>
                </div>
              ))}
            </details>
          )}

          {suggestions.length > 0 && (
            <div className="goals-suggestions">
              <h4>{t('goals.suggestionsTitle')}</h4>
              {suggestions.map((s) => (
                <div key={`${s.metric}-${s.subject ?? ''}`} className="goal-suggestion-row">
                  <div>
                    <span className="goal-label">{s.label}</span>
                    <span className="goal-value">
                      {t('goals.suggestionDetail', { baseline: s.baseline.toFixed(1), target: s.target })}
                    </span>
                  </div>
                  <Button variant="primary" onClick={() => handleAddSuggestion(s)}>{t('goals.addSuggestion')}</Button>
                </div>
              ))}
            </div>
          )}

          {showCustomForm ? (
            <form className="goals-form" onSubmit={handleAddCustom}>
              <input
                placeholder={t('goals.customPlaceholder')}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                required
              />
              <div className="goals-form-actions">
                <Button variant="ghost" type="button" onClick={() => setShowCustomForm(false)}>{t('goals.cancel')}</Button>
                <Button variant="primary" type="submit">{t('goals.add')}</Button>
              </div>
            </form>
          ) : (
            <Button variant="primary" className="goals-add-btn" onClick={() => setShowCustomForm(true)}>
              {t('goals.addCustomGoal')}
            </Button>
          )}
        </div>
      )}
    </>
  );
}

export default GoalsWidget;
