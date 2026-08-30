import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAgentsById } from './agentIcons.js';
import { useRankTiers } from './rankData.js';
import { useAgentSelectData } from './useAgentSelectData.js';

// Fenêtre séparée, transparente, toujours au premier plan — voir le
// commentaire dans main.js (createAgentSelectOverlay) pour le détail de
// pourquoi c'est sûr vis-à-vis de Vanguard : aucune injection dans le
// processus du jeu, juste une fenêtre de plus gérée par Windows.
//
// Ne fonctionne qu'en Sans bordure / Fenêtré. En plein écran exclusif,
// aucune fenêtre ne peut passer devant — limite de Windows, pas de l'app.
function AgentSelectOverlay() {
  const { t } = useTranslation();
  const agentsById = useAgentsById();
  const rankTiers = useRankTiers();
  const data = useAgentSelectData();

  useEffect(() => {
    document.body.classList.add('overlay-window');
  }, []);

  const visible = data.state === 'ok' && data.players.length > 0;

  useEffect(() => {
    window.electronAPI.setAgentSelectOverlayVisible(visible);
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="overlay-agent-select">
      <div className="overlay-agent-select-head">
        <span className="agent-select-dot" aria-hidden="true" />
        {t('agentSelect.title')}
      </div>

      {data.players.map((player) => {
        const agent = player.agentId ? agentsById.get(player.agentId.toLowerCase()) : null;
        const tier = rankTiers.get(player.competitiveTier);
        const locked = player.selectionState === 'locked';

        return (
          <div
            key={player.puuid}
            className={`overlay-agent-select-player ${locked ? 'locked' : ''} ${player.isMe ? 'me' : ''}`}
          >
            <div className="overlay-agent-select-avatar">
              {agent?.icon ? <img src={agent.icon} alt="" /> : <span>?</span>}
            </div>

            <div className="overlay-agent-select-info">
              <span className="overlay-agent-select-agent">
                {agent?.name ?? t('agentSelect.choosing')}
              </span>
              <span className="overlay-agent-select-rank" style={tier?.color ? { color: tier.color } : undefined}>
                {player.competitiveTier > 0 ? tier?.name ?? '—' : t('agentSelect.unranked')}
              </span>
            </div>

            {player.isMe && <span className="overlay-agent-select-you">{t('agentSelect.you')}</span>}
          </div>
        );
      })}
    </div>
  );
}

export default AgentSelectOverlay;
