import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Hourglass } from 'lucide-react';
import Icon from './Icon.jsx';
import { BET_TYPES, describeBet, evaluateBet } from './bets.js';
import Skeleton from './Skeleton.jsx';
import CountUp from './CountUp.jsx';
import CollapsibleCard from './CollapsibleCard.jsx';
import Button from './ui/Button';

function BetsTracker({ settings, matches }) {
  const { t, i18n } = useTranslation();
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
    const def = BET_TYPES.find((bt) => bt.id === type);
    window.electronAPI.createBet(type, def.needsThreshold ? threshold : null, baselineMatchId).then(() => refresh());
  }

  function handleCancelBet() {
    if (!pending) return;
    window.electronAPI.cancelBet(pending.id).then(() => refresh());
  }

  const selectedDef = BET_TYPES.find((bt) => bt.id === type);

  return (
    <div>
      <CollapsibleCard id="bets.summary" title={t('bets.title')} className="comp-score-card">
        <div className="comp-score-main">
          <div
            className="comp-score-ring"
            style={{ background: 'conic-gradient(#ffc857, #ffe1a3, #ffc857)' }}
          >
            <div className="comp-score-ring-inner">
              <div className="comp-score-value" style={{ color: '#ffc857' }}><CountUp value={totalPoints} /></div>
              <div className="comp-score-max">{t('bets.pointsUnit')}</div>
            </div>
          </div>
          <div className="label">{t('bets.accumulatedPoints')}</div>
        </div>
        <p className="label">{t('bets.description')}</p>
      </CollapsibleCard>

      <div className={pending ? 'card tilt-card calm' : 'card'}>
        {pending === undefined ? (
          <Skeleton lines={2} />
        ) : pending ? (
          <div className="tilt-card-header">
            <span className="tilt-card-badge"><Icon icon={Hourglass} size={16} /></span>
            <div>
              <h3>{t('bets.currentBetTitle')}</h3>
              <p style={{ fontWeight: 600 }}>{describeBet(t, pending.type, pending.threshold)}</p>
              <p className="label">{t('bets.waitingNextMatch')}</p>
              <Button variant="ghost" onClick={handleCancelBet}>{t('bets.cancelBet')}</Button>
            </div>
          </div>
        ) : (
          <>
            <h3>{t('bets.placeBetTitle')}</h3>
            <div className="buy-calc-panel">
              <select value={type} onChange={(e) => setType(e.target.value)}>
                {BET_TYPES.map((bt) => (
                  <option key={bt.id} value={bt.id}>
                    {t(bt.labelKey)}
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
              <Button variant="primary" className="refresh" onClick={handlePlaceBet}>
                {t('bets.placeBetBtn')}
              </Button>
            </div>
          </>
        )}
      </div>

      <CollapsibleCard id="bets.history" title={t('bets.historyTitle')}>
        {history.length === 0 ? (
          <p>{t('bets.noHistory')}</p>
        ) : (
          <div className="puzzle-history-list">
            {history.map((h) => (
              <div key={h.id} className="puzzle-history-row">
                <span className="puzzle-history-date">{new Date(h.resolved_at).toLocaleDateString(i18n.language === 'en' ? 'en-US' : 'fr-FR')}</span>
                <span className="puzzle-history-map">{describeBet(t, h.type, h.threshold)}</span>
                <span className={`buy-round-badge ${h.won ? 'coherent' : 'questionable'}`}>
                  {h.won ? t('bets.wonPoints', { points: h.points }) : t('bets.lostPoints')}
                </span>
              </div>
            ))}
          </div>
        )}
      </CollapsibleCard>
    </div>
  );
}

export default BetsTracker;
