import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Lock } from 'lucide-react';
import { useAgentsById, useAgentIcons, useAgentRoles } from './agentIcons.js';
import { useRankTiers } from './rankData.js';
import { useAgentSelectData } from './useAgentSelectData.js';
import { useMapUrlToName } from './mapImages.js';
import { suggestAgents } from './agentSuggestion.js';

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
          <span
            className="agent-select-rank-name"
            style={tier?.color ? { color: tier.color } : undefined}
          >
            {player.competitiveTier > 0 ? tier?.name ?? '–' : t('agentSelect.unranked')}
          </span>
        </span>
      </div>

      {player.isMe && <span className="agent-select-you">{t('agentSelect.you')}</span>}
      {locked && !player.isMe && (
        <Lock className="agent-select-lock" role="img" aria-label={t('agentSelect.locked')} />
      )}
    </div>
  );
}

function SuggestionRow({ suggestion, agentIcons, t }) {
  return (
    <div className="agent-suggestion-row">
      <div className="agent-suggestion-avatar">
        {agentIcons.get(suggestion.agent) && <img src={agentIcons.get(suggestion.agent)} alt="" />}
      </div>
      <span className="agent-suggestion-name">{suggestion.agent}</span>
      <span className="agent-suggestion-reason">
        {suggestion.source === 'personal'
          ? t('agentSelect.suggestPersonal', { winrate: suggestion.winrate, games: suggestion.games })
          : t('agentSelect.suggestCommunity')}
      </span>
      {suggestion.fillsGap && <span className="agent-suggestion-gap">{t('agentSelect.suggestFillsGap')}</span>}
    </div>
  );
}

function AgentSelectLive({ matches = [], settings = null }) {
  const { t } = useTranslation();
  const agentsById = useAgentsById();
  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const rankTiers = useRankTiers();
  const mapUrlToName = useMapUrlToName();
  const data = useAgentSelectData();

  const inGame = data.state === 'ok' && data.phase === 'game';
  const inSelect = data.state === 'ok' && data.phase === 'select';
  const me = data.state === 'ok' ? data.players.find((p) => p.isMe) : null;
  const mapName = data.state === 'ok' ? mapUrlToName.get(data.mapId) ?? null : null;

  const suggestions = useMemo(() => {
    if (!inSelect || !settings?.name || me?.selectionState === 'locked') return [];
    const teammateAgentNames = data.players
      .filter((p) => !p.isMe && p.agentId)
      .map((p) => agentsById.get(p.agentId.toLowerCase())?.name)
      .filter(Boolean);
    return suggestAgents({
      matches,
      name: settings.name,
      tag: settings.tag,
      mapName,
      teammateAgentNames,
      agentRoles,
    });
  }, [inSelect, settings, me?.selectionState, data.players, agentsById, matches, mapName, agentRoles]);

  useEffect(() => {
    window.electronAPI.setAgentSelectSuggestions(suggestions);
  }, [suggestions]);

  const overlayVisible = data.state === 'ok' && data.players.length > 0;
  useEffect(() => {
    window.electronAPI.setAgentSelectOverlayVisible(overlayVisible);
  }, [overlayVisible]);

  if (data.state !== 'ok' || data.players.length === 0) return null;

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

      {suggestions.length > 0 && (
        <div className="agent-suggestion-block">
          <p className="agent-select-team-label">{t('agentSelect.suggestTitle')}</p>
          {suggestions.map((suggestion) => (
            <SuggestionRow key={suggestion.agent} suggestion={suggestion} agentIcons={agentIcons} t={t} />
          ))}
        </div>
      )}

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
