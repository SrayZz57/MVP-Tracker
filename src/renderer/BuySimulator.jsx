import { useMemo, useState } from 'react';
import { analyzeRoundBuys, summarizeRoundBuys, listMatchesWithRounds, recommendBuy } from './buySimulator.js';
import { agentAbilityBudget, AGENT_ABILITY_COSTS, ABILITY_COSTS_SOURCE_DATE } from './abilityCosts.js';
import { useShopWeapons, useShopArmors, useWeaponIcons } from './weaponIcons.js';
import { useAgentIcons, useAgentRoles, useAgentAbilities } from './agentIcons.js';

function BuyAnalysisSection({ settings, matches }) {
  const weaponIcons = useWeaponIcons();
  const eligibleMatches = useMemo(
    () => listMatchesWithRounds(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );
  const [selectedMatchId, setSelectedMatchId] = useState('');

  const selectedMatch = eligibleMatches.find((m) => m.metadata.matchid === selectedMatchId) ?? eligibleMatches[0] ?? null;

  const rounds = useMemo(
    () => (selectedMatch ? analyzeRoundBuys(selectedMatch, settings.name, settings.tag) : []),
    [selectedMatch, settings.name, settings.tag],
  );
  const summary = useMemo(() => summarizeRoundBuys(rounds), [rounds]);

  if (eligibleMatches.length === 0) {
    return <p>Aucun match avec données de round en cache pour l'instant.</p>;
  }

  return (
    <>
      <div className="filter-bar">
        <select value={selectedMatch?.metadata.matchid ?? ''} onChange={(e) => setSelectedMatchId(e.target.value)}>
          {eligibleMatches.map((m) => (
            <option key={m.metadata.matchid} value={m.metadata.matchid}>
              {m.metadata.map} — {new Date(m.metadata.game_start * 1000).toLocaleDateString('fr-FR')}
            </option>
          ))}
        </select>
        {summary.percent !== null && (
          <span className="heatmap-point-count">
            {summary.coherent}/{summary.total} rounds cohérents ({summary.percent.toFixed(0)}%)
          </span>
        )}
      </div>

      <div className="buy-round-list">
        {rounds.map((r) => (
          <div key={r.roundNumber} className={`buy-round-row ${r.verdict}`}>
            <span className="buy-round-number">R{r.roundNumber}</span>
            <span className="buy-round-weapon">
              {weaponIcons.get(r.weapon) && <img src={weaponIcons.get(r.weapon)} alt="" className="weapon-icon" />}
              {r.weapon ?? '?'}
            </span>
            <span className={`buy-round-badge ${r.verdict}`}>
              {r.verdict === 'coherent' ? '✅ Cohérent' : '⚠️ À vérifier'}
            </span>
            <span className="buy-round-explanation label">{r.explanation}</span>
          </div>
        ))}
      </div>
    </>
  );
}

function BuyCalculatorSection() {
  const weapons = useShopWeapons();
  const armors = useShopArmors();
  const agentIcons = useAgentIcons();
  const agentRoles = useAgentRoles();
  const agentAbilities = useAgentAbilities();
  const [credits, setCredits] = useState(4000);
  const [agent, setAgent] = useState('');

  const recommendation = useMemo(() => {
    if (weapons.length === 0 || armors.length === 0) return null;
    const role = agentRoles.get(agent)?.roleName ?? null;
    return recommendBuy(credits, weapons, armors, role);
  }, [credits, weapons, armors, agent, agentRoles]);

  const abilityBudget = useMemo(() => {
    if (!agent) return null;
    return agentAbilityBudget(agent, agentAbilities.get(agent));
  }, [agent, agentAbilities]);

  return (
    <>
      <div className="buy-calc-panel">
        <label className="buy-calc-field">
          Crédits disponibles
          <input
            type="number"
            min="0"
            step="50"
            value={credits}
            onChange={(e) => setCredits(Math.max(0, Number(e.target.value)))}
          />
        </label>
        <select value={agent} onChange={(e) => setAgent(e.target.value)}>
          <option value="">— agent (optionnel) —</option>
          {[...agentIcons.keys()].sort().map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </div>

      {recommendation && (
        <div className="buy-recommendation">
          {recommendation.weapon || recommendation.shield ? (
            <div className="stat-tiles">
              <div className="stat-tile">
                <div className="value">{recommendation.weapon?.name ?? 'Aucune arme'}</div>
                <div className="label">{recommendation.weapon ? `${recommendation.weapon.cost} crédits` : ''}</div>
              </div>
              <div className="stat-tile">
                <div className="value">{recommendation.shield?.name ?? 'Pas de bouclier'}</div>
                <div className="label">{recommendation.shield ? `${recommendation.shield.cost} crédits` : ''}</div>
              </div>
              <div className="stat-tile">
                <div className="value">{recommendation.remaining}</div>
                <div className="label">Crédits restants</div>
              </div>
            </div>
          ) : (
            <p>Budget trop faible pour une arme ou un bouclier — garde tes crédits pour le prochain round.</p>
          )}
          {recommendation.roleNote && <p className="label" style={{ marginTop: '0.75rem' }}>{recommendation.roleNote}</p>}
        </div>
      )}

      {agent && (
        <div className="buy-ability-section">
          <h4>Capacités de {agent}</h4>
          {abilityBudget && abilityBudget.length > 0 ? (
            <>
              {abilityBudget.map((a) => {
                const affordable = recommendation ? a.cost <= recommendation.remaining : false;
                return (
                  <div key={a.name} className={`buy-ability-row ${recommendation ? (affordable ? 'affordable' : 'unaffordable') : ''}`}>
                    <img src={a.icon} alt="" className="wiki-ability-icon" />
                    <span className="buy-ability-name">{a.name}</span>
                    <span className="buy-ability-cost">{a.cost === 0 ? 'Gratuite' : `${a.cost} crédits`}</span>
                    {recommendation && <span className="buy-ability-status">{affordable ? '✅' : '❌'}</span>}
                  </div>
                );
              })}
              <p className="label" style={{ marginTop: '0.6rem' }}>
                Coûts recherchés le {ABILITY_COSTS_SOURCE_DATE} (wiki officiel Riot){recommendation ? ` — comparés aux ${recommendation.remaining} crédits restants après arme + bouclier.` : '.'}
              </p>
            </>
          ) : (
            <p className="label">
              Pas encore de coûts de capacités fiables pour {agent} — non couvert par la source utilisée (agent
              récent ou kit atypique).
            </p>
          )}
        </div>
      )}

      <p className="label buy-calc-disclaimer">
        Arme et bouclier basés sur les vrais prix du shop (API officielle). Les coûts de capacités ne sont exposés
        par aucune API — recherchés manuellement sur le wiki Riot, disponibles pour une partie du roster seulement
        (voir ci-dessus si ton agent n'est pas couvert).
      </p>
    </>
  );
}

function BuySimulator({ settings, matches }) {
  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>💰 Analyse d'achat round par round</h3>
        <p className="label">
          Compare ton achat réel à ce que l'économie moyenne de ton équipe permettait ce round-là.
        </p>
        <BuyAnalysisSection settings={settings} matches={matches} />
      </div>

      <div className="card">
        <h3>🧮 Calculateur de budget</h3>
        <p className="label">Entre tes crédits disponibles pour voir le meilleur achat possible.</p>
        <BuyCalculatorSection />
      </div>
    </div>
  );
}

export default BuySimulator;
