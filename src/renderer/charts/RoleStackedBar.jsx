import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import Button from '../ui/Button';

export const ROLE_COLORS = {
  Duelliste: '#3987e5',
  Initiateur: '#d95926',
  Contrôleur: '#199e70',
  Sentinelle: '#c98500',
};

const CARD_WIDTH = 200;
const CARD_MARGIN = 10;

function RoleSegment({ role, percent, games, topAgents, onSelectAgent }) {
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
      style={{ width: `${percent}%`, background: ROLE_COLORS[role] }}
      title={`${role} · ${percent.toFixed(0)}% (${t('charts.gamesCount', { count: games })})`}
      onMouseEnter={handleEnter}
      onMouseLeave={() => setCardPos(null)}
    >
      {cardPos &&
        topAgents.length > 0 &&
        createPortal(
          <div className="role-bar-hover-card" style={{ top: cardPos.top, left: cardPos.left }}>
            <span className="role-bar-hover-title">{role}</span>
            {topAgents.slice(0, 5).map(({ agent, games: agentGames }) => (
              <Button
                variant="ghost"
                key={agent}
                type="button"
                className="role-bar-hover-agent"
                onClick={() => onSelectAgent?.(agent)}
              >
                <span>{agent}</span>
                <span className="label">{t('charts.gamesCount', { count: agentGames })}</span>
              </Button>
            ))}
          </div>,
          document.body,
        )}
    </span>
  );
}

function RoleStackedBar({ rows, onSelectAgent }) {
  const { t } = useTranslation();

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
            onSelectAgent={onSelectAgent}
          />
        ))}
      </div>
      <div className="stacked-bar-legend">
        {rows.map((r) => (
          <span key={r.role} className="stacked-bar-legend-item">
            <span className="stacked-bar-swatch" style={{ background: ROLE_COLORS[r.role] }} />
            {r.role} · {r.percent.toFixed(0)}% ({r.games})
          </span>
        ))}
      </div>
    </div>
  );
}

export default RoleStackedBar;
