import { useEffect, useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { matchesInCurrentWeek, lastCompletedWeekStart, weekStartKey } from './valorantStats.js';
import { buildWeekRecap, generateNarrative } from './weeklyNarrative.js';
import { useAgentPortraits } from './agentIcons.js';
import { useRankTiers } from './rankData.js';

function WeeklyRecapCard({ settings, matches, rank }) {
  const portraits = useAgentPortraits();
  const rankTiers = useRankTiers();
  const cardRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [narrative, setNarrative] = useState(null);
  const [history, setHistory] = useState([]);

  const weekKey = useMemo(() => weekStartKey(lastCompletedWeekStart()), []);

  const recap = useMemo(() => {
    const weekAll = matchesInCurrentWeek(matches);
    return buildWeekRecap(weekAll, settings.name, settings.tag);
  }, [matches, settings.name, settings.tag]);

  useEffect(() => {
    if (!recap) return;
    let cancelled = false;

    window.electronAPI.getWeeklyNarrative(weekKey).then(async (existing) => {
      if (cancelled) return;
      if (existing) {
        setNarrative(JSON.parse(existing.narrative_json));
        return;
      }

      const previous = await window.electronAPI.getPreviousWeeklyNarrative(weekKey);
      const previousRank = previous?.rank_json ? JSON.parse(previous.rank_json) : null;
      const currentRank = rank ? { tierId: rank.tierId, tierName: rank.tierName, rr: rank.rr } : null;
      const paragraphs = generateNarrative(recap, currentRank, previousRank);

      await window.electronAPI.saveWeeklyNarrative(
        weekKey,
        JSON.stringify(recap),
        currentRank ? JSON.stringify(currentRank) : null,
        JSON.stringify(paragraphs),
      );
      if (cancelled) return;
      setNarrative(paragraphs);
    });

    return () => {
      cancelled = true;
    };
  }, [recap, weekKey, rank]);

  useEffect(() => {
    if (!open) return;
    window.electronAPI.getWeeklyNarrativeHistory(20).then((rows) => setHistory(rows.filter((r) => r.week_start !== weekKey)));
  }, [open, weekKey]);

  const handleExport = () => {
    if (!cardRef.current) return;
    setExporting(true);
    toPng(cardRef.current, { pixelRatio: 2 })
      .then((dataUrl) => {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `ma-semaine-valorant.png`;
        link.click();
      })
      .finally(() => setExporting(false));
  };

  const portrait = recap?.bestAgent ? portraits.get(recap.bestAgent.key) : null;
  const currentTier = rank ? rankTiers.get(rank.tierId) : null;

  return (
    <>
      <button className="weekly-notch" onClick={() => setOpen(true)} title="Ta semaine">
        <span>SEMAINE</span>
      </button>

      {open && (
        <div className="weekly-drawer-backdrop" onClick={() => setOpen(false)}>
          <div className="weekly-drawer" onClick={(e) => e.stopPropagation()}>
            <button className="weekly-drawer-close" onClick={() => setOpen(false)}>✕</button>

            {!recap ? (
              <div className="weekly-recap-card weekly-recap-empty">
                <p>Aucun match la semaine dernière — le wrapped se remplira à partir de lundi prochain.</p>
              </div>
            ) : (
              <div className="weekly-recap-wrap">
                <div
                  className="weekly-recap-card"
                  ref={cardRef}
                  style={portrait ? { backgroundImage: `url(${portrait})` } : undefined}
                >
                  <div className="weekly-recap-overlay">
                    <div className="weekly-recap-title">SEMAINE DERNIÈRE</div>

                    <div className="weekly-recap-identity">
                      <div className="weekly-recap-name">
                        {settings.name}<span className="profile-tag">#{settings.tag}</span>
                      </div>
                      {rank && (
                        <div className="weekly-recap-rank">
                          {currentTier?.icon && <img src={currentTier.icon} alt="" />}
                          <span>{rank.tierName} — {rank.rr} RR</span>
                        </div>
                      )}
                    </div>

                    <div className="weekly-recap-hero">
                      <div className="weekly-recap-hero-value">{recap.games}</div>
                      <div className="weekly-recap-hero-label">parties jouées</div>
                    </div>

                    <div className="weekly-recap-stats">
                      <div className="weekly-recap-stat">
                        <div className="value">{recap.winrate === null ? '?' : `${recap.winrate.toFixed(0)}%`}</div>
                        <div className="label">Winrate</div>
                      </div>
                      <div className="weekly-recap-stat">
                        <div className="value">{recap.kd === null ? '?' : recap.kd.toFixed(2)}</div>
                        <div className="label">K/D moyen</div>
                      </div>
                      <div className="weekly-recap-stat">
                        <div className="value">{recap.hsPercent === null ? '?' : `${recap.hsPercent.toFixed(0)}%`}</div>
                        <div className="label">Précision tête</div>
                      </div>
                    </div>

                    <div className="weekly-recap-highlights">
                      {recap.bestAgent && (
                        <p>🎮 Le plus joué : <strong>{recap.bestAgent.key}</strong> ({recap.bestAgent.games} parties)</p>
                      )}
                      {recap.bestMap && (
                        <p>🗺️ Meilleure map : <strong>{recap.bestMap.key}</strong> ({recap.bestMap.winrate.toFixed(0)}% winrate)</p>
                      )}
                      {recap.bestKd !== null && <p>🔥 Meilleur K/D : <strong>{recap.bestKd.toFixed(2)}</strong></p>}
                    </div>
                  </div>
                </div>

                <button className="show-more-btn" onClick={handleExport} disabled={exporting}>
                  {exporting ? 'Export en cours...' : '📷 Exporter en image'}
                </button>

                {narrative && (
                  <div className="weekly-narrative">
                    <h4>📖 Ton récit de la semaine</h4>
                    {narrative.map((paragraph, i) => (
                      <p key={i}>{paragraph}</p>
                    ))}
                  </div>
                )}

                <p className="weekly-drawer-hint">
                  📅 Chaque lundi, ce wrapped se remet à zéro et récapitule les 7 jours précédents — reviens ici en
                  début de semaine pour voir ton résumé et le partager si tu veux.
                </p>

                {history.length > 0 && (
                  <div className="weekly-narrative-history">
                    <h4>Semaines précédentes</h4>
                    {history.map((row) => (
                      <div key={row.id} className="weekly-narrative-history-item">
                        <div className="weekly-narrative-history-date">Semaine du {row.week_start}</div>
                        {JSON.parse(row.narrative_json).map((paragraph, i) => (
                          <p key={i}>{paragraph}</p>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default WeeklyRecapCard;
