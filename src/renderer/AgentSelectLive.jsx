import { useTranslation } from 'react-i18next';
import { useAgentsById } from './agentIcons.js';
import { useRankTiers } from './rankData.js';
import { useAgentSelectData } from './useAgentSelectData.js';

// =============================================================================
// SÉLECTION D'AGENT EN DIRECT, PUIS DÉBUT DE PARTIE
//
// Affiche le rang et l'agent choisi des autres joueurs. Entièrement alimenté
// par l'API locale du client Valorant : aucune requête HenrikDev, donc aucun
// quota consommé et aucune latence.
//
// Le bandeau n'apparaît QUE pendant la sélection ou le tout début de partie
// et disparaît tout seul ensuite — c'est le seul moment où l'info sert.
//
// Deux phases, deux vues :
//   - 'select' : sélection d'agent. Riot n'expose que MON équipe à ce
//     stade (`EnemyTeam` est null) — impossible d'y voir les adversaires.
//   - 'game' : dès le chargement de la partie qui suit, les DEUX équipes
//     sont exposées — on les affiche groupées, alliés puis adversaires.
// =============================================================================

function PlayerCard({ player, agentsById, rankTiers, t }) {
  const agent = player.agentId ? agentsById.get(player.agentId.toLowerCase()) : null;
  const tier = rankTiers.get(player.competitiveTier);
  const locked = player.selectionState === 'locked';

  return (
    <div className={`agent-select-player ${locked ? 'locked' : ''} ${player.isMe ? 'me' : ''}`}>
      <div className="agent-select-avatar">
        {agent?.icon ? <img src={agent.icon} alt="" /> : <span className="agent-select-pending">?</span>}
      </div>

      <div className="agent-select-info">
        <span className="agent-select-agent">{agent?.name ?? t('agentSelect.choosing')}</span>

        <span className="agent-select-rank">
          {tier?.icon && <img src={tier.icon} alt="" />}
          {/* Palier 0 = non classé : afficher « Unranked » plutôt qu'un nom de rang vide. */}
          <span style={tier?.color ? { color: tier.color } : undefined}>
            {player.competitiveTier > 0 ? tier?.name ?? '—' : t('agentSelect.unranked')}
          </span>
        </span>
      </div>

      {player.isMe && <span className="agent-select-you">{t('agentSelect.you')}</span>}
      {locked && !player.isMe && <span className="agent-select-lock">{t('agentSelect.locked')}</span>}
    </div>
  );
}

function AgentSelectLive() {
  const { t } = useTranslation();
  const agentsById = useAgentsById();
  const rankTiers = useRankTiers();
  const data = useAgentSelectData();

  if (data.state !== 'ok' || data.players.length === 0) return null;

  const inGame = data.phase === 'game';
  const allies = inGame ? data.players.filter((p) => p.team !== 'enemy') : data.players;
  const enemies = inGame ? data.players.filter((p) => p.team === 'enemy') : [];

  return (
    <section className="agent-select">
      <header className="agent-select-head">
        <span className="agent-select-live">
          <span className="agent-select-dot" aria-hidden="true" />
          {t(inGame ? 'agentSelect.titleGame' : 'agentSelect.title')}
        </span>
        <span className="label">{t(inGame ? 'agentSelect.hintGame' : 'agentSelect.hint')}</span>
      </header>

      {inGame && enemies.length > 0 ? (
        <>
          <p className="agent-select-team-label">{t('agentSelect.allies')}</p>
          <div className="agent-select-grid">
            {allies.map((player) => (
              <PlayerCard key={player.puuid} player={player} agentsById={agentsById} rankTiers={rankTiers} t={t} />
            ))}
          </div>
          <p className="agent-select-team-label">{t('agentSelect.enemies')}</p>
          <div className="agent-select-grid">
            {enemies.map((player) => (
              <PlayerCard key={player.puuid} player={player} agentsById={agentsById} rankTiers={rankTiers} t={t} />
            ))}
          </div>
        </>
      ) : (
        <div className="agent-select-grid">
          {allies.map((player) => (
            <PlayerCard key={player.puuid} player={player} agentsById={agentsById} rankTiers={rankTiers} t={t} />
          ))}
        </div>
      )}
    </section>
  );
}

export default AgentSelectLive;
