import { useMemo, useState } from 'react';
import { buildSessionPlan } from './sessionPlan.js';

function buildChecklist(plan, latestStrategy) {
  const items = [
    {
      id: 'warmup',
      icon: '🔥',
      title: `${plan.warmup.minutes} minutes d'échauffement`,
      detail: plan.warmup.reason,
      level: 'info',
    },
  ];

  if (plan.targetMap) {
    items.push(
      latestStrategy
        ? {
            id: 'strategy',
            icon: '🗺️',
            title: `Revoir la stratégie "${latestStrategy.name}" sur ${plan.targetMap}`,
            detail: "Direction l'onglet Stratégie pour la consulter avant de lancer tes matchs.",
            level: 'info',
          }
        : {
            id: 'strategy',
            icon: '🗺️',
            title: `Aucune stratégie sauvegardée sur ${plan.targetMap}`,
            detail: "L'occasion d'en créer une dans l'onglet Stratégie avant de jouer.",
            level: 'info',
          },
    );
  }

  items.push(
    plan.tilt.isTilted
      ? {
          id: 'tilt',
          icon: '⚠️',
          title: 'Signes de tilt détectés récemment',
          detail: `Objectif réduit pour aujourd'hui — fais une pause après ${plan.matchCount} matchs si ça ne va pas mieux.`,
          level: 'warning',
        }
      : {
          id: 'tilt',
          icon: '✅',
          title: 'Pas de signe de tilt',
          detail: 'Tu peux enchaîner tes matchs normalement.',
          level: 'good',
        },
  );

  items.push({
    id: 'objective',
    icon: '🎯',
    title: "Objectif du jour",
    detail: plan.objective,
    level: 'info',
  });

  return items;
}

function SessionGuide({ settings, matches }) {
  const [plan, setPlan] = useState(null);
  const [latestStrategy, setLatestStrategy] = useState(null);
  const [checked, setChecked] = useState({});
  const [loading, setLoading] = useState(false);

  const checklist = useMemo(() => (plan ? buildChecklist(plan, latestStrategy) : []), [plan, latestStrategy]);

  async function handleLaunch() {
    setLoading(true);
    const newPlan = buildSessionPlan(matches, settings.name, settings.tag);
    setPlan(newPlan);
    setChecked({});
    if (newPlan.targetMap) {
      const strategies = await window.electronAPI.listStrategies(newPlan.targetMap);
      setLatestStrategy(strategies[0] ?? null);
    } else {
      setLatestStrategy(null);
    }
    setLoading(false);
  }

  function toggleChecked(id) {
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>🎬 Session guidée</h3>
        <p className="label">
          Génère un plan de session basé sur tes vraies stats : créneau horaire actuel, dernière stratégie
          sauvegardée sur ta map récente, et ton état de forme/tilt en ce moment.
        </p>
        <button className="refresh" onClick={handleLaunch} disabled={loading}>
          {plan ? '🔄 Nouvelle session' : '▶️ Lancer ma session'}
        </button>
      </div>

      {plan && (
        <div className="card">
          <h3>Checklist de session</h3>
          <div className="session-checklist">
            {checklist.map((item) => (
              <label key={item.id} className={`session-check-item ${item.level} ${checked[item.id] ? 'done' : ''}`}>
                <input type="checkbox" checked={!!checked[item.id]} onChange={() => toggleChecked(item.id)} />
                <span className="session-check-body">
                  <span className="session-check-title">
                    {item.icon} {item.title}
                  </span>
                  <span className="session-check-detail">{item.detail}</span>
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default SessionGuide;
