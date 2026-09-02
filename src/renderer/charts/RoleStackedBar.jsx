import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';

// Ordre fixe (jamais recyclé) — 4 premiers slots de la palette catégorielle
// validée CVD (voir dataviz skill) contre la surface sombre de l'appli.
export const ROLE_COLORS = {
  Duelliste: '#3987e5',
  Initiateur: '#d95926',
  Contrôleur: '#199e70',
  Sentinelle: '#c98500',
};

const CARD_WIDTH = 200;
const CARD_MARGIN = 10;

// Carte au survol de chaque segment, listant les agents les plus joués dans
// ce rôle (demandé par un testeur Discord) — cliquer un agent ouvre ses
// stats détaillées. Rendue via un portail dans <body> (pas en `absolute`
// imbriquée) : `.stacked-bar` a `overflow: hidden` pour les coins arrondis
// des segments, une carte en flux normal serait donc coupée net — même
// technique déjà utilisée pour les cartes au survol du classement Aim
// Trainer (voir AimLeaderboardRow.jsx).
function RoleSegment({ role, percent, games, topAgents, mounted, onSelectAgent }) {
  const { t } = useTranslation();
  const segmentRef = useRef(null);
  const [cardPos, setCardPos] = useState(null);

  const handleEnter = () => {
    const rect = segmentRef.current?.getBoundingClientRect();
    if (!rect) return;
    const left = Math.min(Math.max(rect.left, CARD_MARGIN), window.innerWidth - CARD_WIDTH - CARD_MARGIN);
    setCardPos({ top: rect.bottom + 8, left });
  };

  return (
    <span
      ref={segmentRef}
      className="stacked-bar-segment"
      style={{ width: mounted ? `${percent}%` : '0%', background: ROLE_COLORS[role] }}
      title={`${role} — ${percent.toFixed(0)}% (${t('charts.gamesCount', { count: games })})`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setCardPos(null)}
    >
      {cardPos &&
        topAgents.length > 0 &&
        createPortal(
          <div className="role-bar-hover-card" style={{ top: cardPos.top, left: cardPos.left }}>
            <span className="role-bar-hover-title">{role}</span>
            {topAgents.slice(0, 5).map(({ agent, games: agentGames }) => (
              <button
                key={agent}
                type="button"
                className="role-bar-hover-agent"
                onClick={() => onSelectAgent?.(agent)}
              >
                <span>{agent}</span>
                <span className="label">{t('charts.gamesCount', { count: agentGames })}</span>
              </button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

function RoleStackedBar({ rows, onSelectAgent }) {
  const { t } = useTranslation();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (!rows || rows.length === 0) {
    return <p>{t('charts.notEnoughData')}</p>;
  }

  return (
    <div>
      <div className="stacked-bar">
        {rows.map((r) => (
          <RoleSegment
            key={r.role}
            role={r.role}
            percent={r.percent}
            games={r.games}
            topAgents={r.topAgents ?? []}
            mounted={mounted}
            onSelectAgent={onSelectAgent}
          />
        ))}
      </div>
      <div className="stacked-bar-legend">
        {rows.map((r) => (
          <span key={r.role} className="stacked-bar-legend-item">
            <span className="stacked-bar-swatch" style={{ background: ROLE_COLORS[r.role] }} />
            {r.role} — {r.percent.toFixed(0)}% ({r.games})
          </span>
        ))}
      </div>
    </div>
  );
}

export default RoleStackedBar;
