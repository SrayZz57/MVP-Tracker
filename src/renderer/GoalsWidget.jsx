import { useEffect, useMemo, useState } from 'react';
import { excludeDeathmatch, overallHsPercent, overallWinrate, formStats, groupStats } from './valorantStats.js';

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

// Propose des objectifs à partir des stats déjà calculées ailleurs dans l'app
// (pas de saisie manuelle de cible : la cible est déduite du niveau actuel).
function generateSuggestions(matches, settings) {
  const clean = excludeDeathmatch(matches);
  const suggestions = [];

  const hs = overallHsPercent(matches, settings.name, settings.tag);
  if (hs !== null) {
    suggestions.push({
      metric: 'hsPercent',
      label: 'Précision tête (global)',
      baseline: hs,
      target: Math.round(Math.min(hs + 5, 45)),
    });
  }

  const wr = overallWinrate(clean, settings.name, settings.tag);
  if (wr !== null) {
    suggestions.push({
      metric: 'winrate',
      label: 'Winrate global',
      baseline: wr,
      target: Math.round(Math.min(wr + 5, 70)),
    });
  }

  const kd = formStats(clean, settings.name, settings.tag).overallKd;
  if (kd !== null) {
    suggestions.push({
      metric: 'kd',
      label: 'K/D global',
      baseline: kd,
      target: Math.round((kd + 0.15) * 100) / 100,
    });
  }

  const mapRows = groupStats(clean, settings.name, settings.tag, (m) => m.metadata?.map).filter(
    (r) => r.games >= MIN_GAMES_FOR_BREAKDOWN && r.winrate !== null,
  );
  if (mapRows.length > 0) {
    const worstMap = mapRows.reduce((a, b) => (b.winrate < a.winrate ? b : a));
    suggestions.push({
      metric: 'mapWinrate',
      subject: worstMap.key,
      label: `Winrate sur ${worstMap.key}`,
      baseline: worstMap.winrate,
      target: Math.round(Math.min(worstMap.winrate + 15, 70)),
    });
  }

  const agentRows = groupStats(clean, settings.name, settings.tag, (m, me) => me.character).filter(
    (r) => r.games >= MIN_GAMES_FOR_BREAKDOWN && r.winrate !== null,
  );
  if (agentRows.length > 0) {
    const worstAgent = agentRows.reduce((a, b) => (b.winrate < a.winrate ? b : a));
    suggestions.push({
      metric: 'agentWinrate',
      subject: worstAgent.key,
      label: `Winrate avec ${worstAgent.key}`,
      baseline: worstAgent.winrate,
      target: Math.round(Math.min(worstAgent.winrate + 15, 70)),
    });
  }

  return suggestions;
}

function GoalsWidget({ matches, settings }) {
  const [open, setOpen] = useState(false);
  const [goals, setGoals] = useState([]);
  const [showCustomForm, setShowCustomForm] = useState(false);
  const [customLabel, setCustomLabel] = useState('');

  useEffect(() => {
    window.electronAPI.getGoals().then(setGoals);
  }, []);

  const activeGoals = useMemo(() => goals.filter((g) => !g.done), [goals]);
  const doneGoals = useMemo(() => goals.filter((g) => g.done), [goals]);

  const suggestions = useMemo(() => {
    if (matches.length === 0) return [];
    const all = generateSuggestions(matches, settings);
    // Pas de doublon avec un objectif déjà actif sur le même sujet.
    return all.filter(
      (s) => !activeGoals.some((g) => g.metric === s.metric && g.subject === s.subject),
    );
  }, [matches, settings, activeGoals]);

  const handleAddSuggestion = (suggestion) => {
    window.electronAPI.addGoal({ type: 'metric', ...suggestion }).then(setGoals);
  };

  const handleAddCustom = (event) => {
    event.preventDefault();
    if (!customLabel.trim()) return;
    window.electronAPI.addGoal({ type: 'custom', label: customLabel.trim() }).then(setGoals);
    setCustomLabel('');
    setShowCustomForm(false);
  };

  const handleToggleDone = (id) => window.electronAPI.toggleGoalDone(id).then(setGoals);
  const handleDelete = (id) => window.electronAPI.deleteGoal(id).then(setGoals);

  return (
    <>
      <button className="goals-widget-button" onClick={() => setOpen(!open)} title="Objectifs personnels">
        🎯
      </button>

      {open && (
        <div className="goals-widget-panel">
          <div className="goals-widget-header">
            <h3>🎯 Objectifs</h3>
            <button className="goals-widget-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          {activeGoals.length === 0 ? (
            <p className="label">Aucun objectif actif — ajoute une suggestion ci-dessous.</p>
          ) : (
            activeGoals.map((goal) => {
              if (goal.type === 'custom') {
                return (
                  <div key={goal.id} className="goal-row">
                    <span className="goal-label">{goal.label}</span>
                    <div className="goal-actions">
                      <button onClick={() => handleToggleDone(goal.id)}>✓</button>
                      <button onClick={() => handleDelete(goal.id)}>✕</button>
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
                    {reached && <button onClick={() => handleToggleDone(goal.id)}>✓ Marquer atteint</button>}
                    <button onClick={() => handleDelete(goal.id)}>✕ Supprimer</button>
                  </div>
                </div>
              );
            })
          )}

          {doneGoals.length > 0 && (
            <details className="goals-done-list">
              <summary>{doneGoals.length} objectif(s) terminé(s)</summary>
              {doneGoals.map((goal) => (
                <div key={goal.id} className="goal-row goal-row-done">
                  <span className="goal-label">✓ {goal.label}</span>
                  <button onClick={() => handleDelete(goal.id)}>✕</button>
                </div>
              ))}
            </details>
          )}

          {suggestions.length > 0 && (
            <div className="goals-suggestions">
              <h4>✨ Suggestions basées sur tes stats</h4>
              {suggestions.map((s) => (
                <div key={`${s.metric}-${s.subject ?? ''}`} className="goal-suggestion-row">
                  <div>
                    <span className="goal-label">{s.label}</span>
                    <span className="goal-value"> — actuellement {s.baseline.toFixed(1)}, viser {s.target}</span>
                  </div>
                  <button onClick={() => handleAddSuggestion(s)}>+ Ajouter</button>
                </div>
              ))}
            </div>
          )}

          {showCustomForm ? (
            <form className="goals-form" onSubmit={handleAddCustom}>
              <input
                placeholder="Ex: Améliorer mon positionnement en défense"
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                required
              />
              <div className="goals-form-actions">
                <button type="button" onClick={() => setShowCustomForm(false)}>Annuler</button>
                <button type="submit">Ajouter</button>
              </div>
            </form>
          ) : (
            <button className="goals-add-btn" onClick={() => setShowCustomForm(true)}>
              + Objectif libre (texte)
            </button>
          )}
        </div>
      )}
    </>
  );
}

export default GoalsWidget;
