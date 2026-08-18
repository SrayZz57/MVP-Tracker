import { useEffect, useState } from 'react';
import { BET_TYPES, describeBet, evaluateBet } from './bets.js';
import Skeleton from './Skeleton.jsx';
import CountUp from './CountUp.jsx';

function BetsTracker({ settings, matches }) {
  const [pending, setPending] = useState(undefined); // undefined = chargement, null = aucun
  const [history, setHistory] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [type, setType] = useState('kills');
  const [threshold, setThreshold] = useState(20);

  const refresh = () => {
    window.electronAPI.getPendingBet().then(setPending);
    window.electronAPI.getBetHistory(20).then(setHistory);
    window.electronAPI.getTotalBetPoints().then(setTotalPoints);
  };

  useEffect(() => {
    refresh();
  }, []);

  // Dès qu'un nouveau match apparaît après la pose du pari, on le résout
  // automatiquement contre ce match-là. Certains matchs en cache n'ont pas le
  // joueur suivi dans leur roster (mode annexe, aléa de l'API) — on essaie
  // alors le suivant plutôt que de rester bloqué en attente indéfiniment.
  useEffect(() => {
    if (!pending || matches.length === 0) return;

    const baselineIndex = pending.baseline_match_id
      ? matches.findIndex((m) => m.metadata?.matchid === pending.baseline_match_id)
      : matches.length;
    const newMatches = (baselineIndex === -1 ? matches : matches.slice(0, baselineIndex)).slice().reverse();

    for (const match of newMatches) {
      const result = evaluateBet(pending.type, pending.threshold, match, settings.name, settings.tag);
      if (result) {
        window.electronAPI
          .resolveBet(pending.id, match.metadata.matchid, result.actualValue, result.won, result.points)
          .then(() => refresh());
        return;
      }
    }
  }, [pending, matches, settings.name, settings.tag]);

  function handlePlaceBet() {
    const baselineMatchId = matches[0]?.metadata?.matchid ?? null;
    const def = BET_TYPES.find((t) => t.id === type);
    window.electronAPI.createBet(type, def.needsThreshold ? threshold : null, baselineMatchId).then(() => refresh());
  }

  function handleCancelBet() {
    if (!pending) return;
    window.electronAPI.cancelBet(pending.id).then(() => refresh());
  }

  const selectedDef = BET_TYPES.find((t) => t.id === type);

  return (
    <div>
      <div className="card comp-score-card">
        <h3>🎰 Paris perso</h3>
        <div className="comp-score-main">
          <div
            className="comp-score-ring"
            style={{ background: 'conic-gradient(#ffc857, #ffe1a3, #ffc857)' }}
          >
            <div className="comp-score-ring-inner">
              <div className="comp-score-value" style={{ color: '#ffc857' }}><CountUp value={totalPoints} /></div>
              <div className="comp-score-max">pts</div>
            </div>
          </div>
          <div className="label">Points accumulés</div>
        </div>
        <p className="label">
          Avant de lancer une session, parie virtuellement sur ta perf. Le pari se résout tout seul dès que ton
          prochain match apparaît dans l'historique.
        </p>
      </div>

      <div className={pending ? 'card tilt-card calm' : 'card'}>
        {pending === undefined ? (
          <Skeleton lines={2} />
        ) : pending ? (
          <div className="tilt-card-header">
            <span className="tilt-card-badge">⏳</span>
            <div>
              <h3>Pari en cours</h3>
              <p style={{ fontWeight: 600 }}>{describeBet(pending.type, pending.threshold)}</p>
              <p className="label">En attente de ton prochain match pour être résolu automatiquement.</p>
              <button onClick={handleCancelBet}>Annuler le pari</button>
            </div>
          </div>
        ) : (
          <>
            <h3>🎲 Placer un pari</h3>
            <div className="buy-calc-panel">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {BET_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
              {selectedDef?.needsThreshold && (
                <input
                  type="number"
                  min="0"
                  value={threshold}
                  onChange={(e) => setThreshold(Number(e.target.value))}
                  style={{ width: '80px' }}
                />
              )}
              <button className="refresh" onClick={handlePlaceBet}>
                Placer le pari
              </button>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3>📜 Historique des paris</h3>
        {history.length === 0 ? (
          <p>Aucun pari résolu pour l'instant.</p>
        ) : (
          <div className="puzzle-history-list">
            {history.map((h) => (
              <div key={h.id} className="puzzle-history-row">
                <span className="puzzle-history-date">{new Date(h.resolved_at).toLocaleDateString('fr-FR')}</span>
                <span className="puzzle-history-map">{describeBet(h.type, h.threshold)}</span>
                <span className={`buy-round-badge ${h.won ? 'coherent' : 'questionable'}`}>
                  {h.won ? `✅ +${h.points} pts` : '❌ 0 pt'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default BetsTracker;
