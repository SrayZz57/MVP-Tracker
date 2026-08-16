import { useMemo, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import {
  excludeDeathmatch,
  matchesInCurrentWeek,
  findMe,
  groupStats,
  formStats,
  overallHsPercent,
  overallWinrate,
} from './valorantStats.js';
import { useAgentPortraits } from './agentIcons.js';
import { useRankTiers } from './rankData.js';

function WeeklyRecapCard({ settings, matches, rank }) {
  const portraits = useAgentPortraits();
  const rankTiers = useRankTiers();
  const cardRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const recap = useMemo(() => {
    const weekAll = matchesInCurrentWeek(matches);
    const week = excludeDeathmatch(weekAll);
    if (week.length === 0) return null;

    const agentRows = groupStats(week, settings.name, settings.tag, (match, me) => me.character);
    const mapRows = groupStats(week, settings.name, settings.tag, (match) => match.metadata?.map).filter(
      (row) => row.games >= 2 && row.winrate !== null,
    );
    const bestMap = mapRows.length > 0 ? mapRows.reduce((a, b) => (b.winrate > a.winrate ? b : a)) : null;

    let bestKd = null;
    week.forEach((match) => {
      const me = findMe(match, settings.name, settings.tag);
      if (!me) return;
      const kills = me.stats?.kills ?? 0;
      const deaths = me.stats?.deaths ?? 0;
      const kd = deaths > 0 ? kills / deaths : kills;
      if (bestKd === null || kd > bestKd) bestKd = kd;
    });

    return {
      games: week.length,
      winrate: overallWinrate(week, settings.name, settings.tag),
      kd: formStats(week, settings.name, settings.tag).overallKd,
      hsPercent: overallHsPercent(weekAll, settings.name, settings.tag),
      bestAgent: agentRows[0] ?? null,
      bestMap,
      bestKd,
    };
  }, [matches, settings.name, settings.tag]);

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

                <p className="weekly-drawer-hint">
                  📅 Chaque lundi, ce wrapped se remet à zéro et récapitule les 7 jours précédents — reviens ici en
                  début de semaine pour voir ton résumé et le partager si tu veux.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

export default WeeklyRecapCard;
