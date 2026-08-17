import { useMemo, useState } from 'react';
import { analyzeRoundBuys, summarizeRoundBuys, listMatchesWithRounds, recommendBuy } from './buySimulator.js';
import { useShopWeapons, useShopArmors, useWeaponIcons } from './weaponIcons.js';
import { useAgentIcons, useAgentRoles } from './agentIcons.js';

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
            <span className="buy-round-verdict">{r.verdict === 'coherent' ? '✅' : '⚠️'}</span>
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
  const [credits, setCredits] = useState(4000);
  const [agent, setAgent] = useState('');

  const recommendation = useMemo(() => {
    if (weapons.length === 0 || armors.length === 0) return null;
    const role = agentRoles.get(agent)?.roleName ?? null;
    return recommendBuy(credits, weapons, armors, role);
  }, [credits, weapons, armors, agent, agentRoles]);

  return (
    <>
      <div className="filter-bar">
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

      <p className="label buy-calc-disclaimer">
        Basé sur les vrais prix du shop (armes + boucliers). Les capacités d'agent ne sont pas incluses : leur coût
        n'est exposé par aucune API accessible, donc pas de recommandation inventée dessus.
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
