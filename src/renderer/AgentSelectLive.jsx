import { useTranslation } from 'react-i18next';
import { useAgentsById } from './agentIcons.js';
import { useRankTiers } from './rankData.js';
import { useAgentSelectData } from './useAgentSelectData.js';

// =============================================================================
// SÉLECTION D'AGENT EN DIRECT
//
// Affiche le rang et l'agent choisi de tes coéquipiers PENDANT la sélection.
// Entièrement alimenté par l'API locale du client Valorant : aucune requête
// HenrikDev, donc aucun quota consommé et aucune latence.
//
// Le bandeau n'apparaît QUE pendant la sélection et disparaît tout seul
// ensuite — c'est le seul moment où l'information sert.
//
// Note : l'équipe adverse n'est pas exposée par Riot à ce stade en classé
// (`EnemyTeam` est null), on ne peut donc afficher que ses alliés.
// =============================================================================

function AgentSelectLive() {
  const { t } = useTranslation();
  const agentsById = useAgentsById();
  const rankTiers = useRankTiers();
  const data = useAgentSelectData();

  if (data.state !== 'ok' || data.players.length === 0) return null;

  return (
    <section className="agent-select">
      <header className="agent-select-head">
        <span className="agent-select-live">
          <span className="agent-select-dot" aria-hidden="true" />
          {t('agentSelect.title')}
        </span>
        <span className="label">{t('agentSelect.hint')}</span>
      </header>

      <div className="agent-select-grid">
        {data.players.map((player) => {
          const agent = player.agentId ? agentsById.get(player.agentId.toLowerCase()) : null;
          const tier = rankTiers.get(player.competitiveTier);
          const locked = player.selectionState === 'locked';

          return (
            <div
              key={player.puuid}
              className={`agent-select-player ${locked ? 'locked' : ''} ${player.isMe ? 'me' : ''}`}
            >
              <div className="agent-select-avatar">
                {agent?.icon ? (
                  <img src={agent.icon} alt="" />
                ) : (
                  <span className="agent-select-pending">?</span>
                )}
              </div>

              <div className="agent-select-info">
                <span className="agent-select-agent">
                  {agent?.name ?? t('agentSelect.choosing')}
                </span>

                <span className="agent-select-rank">
                  {tier?.icon && <img src={tier.icon} alt="" />}
                  {/* Palier 0 = non classé : afficher « Unranked » plutôt
                      qu'un nom de rang vide. */}
                  <span style={tier?.color ? { color: tier.color } : undefined}>
                    {player.competitiveTier > 0 ? tier?.name ?? '—' : t('agentSelect.unranked')}
                  </span>
                </span>
              </div>

              {player.isMe && <span className="agent-select-you">{t('agentSelect.you')}</span>}
              {locked && !player.isMe && <span className="agent-select-lock">{t('agentSelect.locked')}</span>}
            </div>
          );
        })}
      </div>
    </section>
  );
}

export default AgentSelectLive;
