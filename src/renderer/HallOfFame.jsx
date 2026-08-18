import { useEffect, useMemo, useState } from 'react';
import { computeHallOfFame } from './hallOfFame.js';
import { deriveAchievements } from './achievements.js';
import { useAgentPortraits } from './agentIcons.js';
import ConfettiBurst from './ConfettiBurst.jsx';

function formatDate(ms) {
  if (!ms) return '?';
  return new Date(ms).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' });
}

function TrophyCard({ icon, title, value, valueLabel, context, portrait, empty }) {
  return (
    <div
      className={`trophy-card ${empty ? 'empty' : ''}`}
      style={!empty && portrait ? { backgroundImage: `url(${portrait})` } : undefined}
    >
      <div className="trophy-card-overlay">
        <div className="trophy-header">
          <span className="trophy-icon">{icon}</span>
          <span className="trophy-title">{title}</span>
        </div>
        {empty ? (
          <p className="label">Pas encore débloqué — continue à jouer.</p>
        ) : (
          <>
            <div className="trophy-value">
              {value}
              {valueLabel && <span className="trophy-value-label">{valueLabel}</span>}
            </div>
            <div className="trophy-context">{context}</div>
          </>
        )}
      </div>
    </div>
  );
}

function AchievementBadge({ icon, title, description, unlocked, contextText, progressPercent }) {
  return (
    <div className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`} title={description}>
      <div className="achievement-badge-icon">{unlocked ? icon : '🔒'}</div>
      <div className="achievement-badge-title">{title}</div>
      {unlocked ? (
        <div className="achievement-badge-context">{contextText}</div>
      ) : (
        <>
          <div className="achievement-badge-context">{description}</div>
          <div className="achievement-badge-progress">
            <div className="achievement-badge-progress-fill" style={{ width: `${progressPercent}%` }} />
          </div>
        </>
      )}
    </div>
  );
}

function HallOfFame({ settings, matches }) {
  const agentPortraits = useAgentPortraits();
  const hof = useMemo(() => computeHallOfFame(matches, settings.name, settings.tag), [matches, settings.name, settings.tag]);
  const achievementGroups = useMemo(() => deriveAchievements(hof), [hof]);
  const totalCount = achievementGroups.reduce((sum, g) => sum + g.items.length, 0);
  const unlockedCount = achievementGroups.reduce((sum, g) => sum + g.items.filter((i) => i.unlocked).length, 0);
  const [celebrate, setCelebrate] = useState(false);

  // Compare aux succès déjà vus (stockés localement par compte) pour ne
  // fêter que ceux qui viennent réellement de tomber, pas ceux déjà connus
  // à chaque fois que l'onglet se rouvre.
  useEffect(() => {
    const storageKey = `mvp-achievements-seen:${settings.name}#${settings.tag}`.toLowerCase();
    const seen = new Set(JSON.parse(localStorage.getItem(storageKey) || '[]'));
    const unlockedIds = achievementGroups.flatMap((g) => g.items.filter((i) => i.unlocked).map((i) => i.id));
    const hasNewUnlock = unlockedIds.some((id) => !seen.has(id));

    localStorage.setItem(storageKey, JSON.stringify(unlockedIds));

    if (hasNewUnlock && seen.size > 0) {
      setCelebrate(true);
      const timeout = setTimeout(() => setCelebrate(false), 2600);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [achievementGroups, settings.name, settings.tag]);

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      {celebrate && <ConfettiBurst />}
      <div className="card">
        <h3>🏆 Hall of Fame</h3>
        <p className="label">
          Tes meilleurs records personnels, détectés automatiquement dans ton historique de matchs — mis à jour dès
          qu'un nouveau record tombe.
        </p>
      </div>

      <div className="trophy-grid">
        <TrophyCard
          icon="💥"
          title="Meilleur ace"
          empty={!hof.bestAce}
          value={hof.bestAce?.kills}
          valueLabel="kills en un round"
          portrait={hof.bestAce && agentPortraits.get(hof.bestAce.agent)}
          context={hof.bestAce && `${hof.bestAce.agent} — ${hof.bestAce.map}, round ${hof.bestAce.roundNumber} — ${formatDate(hof.bestAce.date)}`}
        />
        <TrophyCard
          icon="🔥"
          title="Plus longue série de victoires"
          empty={!hof.longestWinStreak}
          value={hof.longestWinStreak?.streak}
          valueLabel="victoires d'affilée"
          context={
            hof.longestWinStreak &&
            `Du ${formatDate(hof.longestWinStreak.startDate)} au ${formatDate(hof.longestWinStreak.endDate)}`
          }
        />
        <TrophyCard
          icon="🎯"
          title="Meilleur clutch"
          empty={!hof.bestClutch}
          value={hof.bestClutch && `1v${hof.bestClutch.enemies}`}
          valueLabel="gagné"
          portrait={hof.bestClutch && agentPortraits.get(hof.bestClutch.agent)}
          context={hof.bestClutch && `${hof.bestClutch.agent} — ${hof.bestClutch.map}, round ${hof.bestClutch.roundNumber} — ${formatDate(hof.bestClutch.date)}`}
        />
        <TrophyCard
          icon="⭐"
          title="Meilleur KDA sur un match"
          empty={!hof.bestKda}
          value={hof.bestKda?.kda.toFixed(2)}
          valueLabel={hof.bestKda && `${hof.bestKda.kills}/${hof.bestKda.deaths}/${hof.bestKda.assists}`}
          portrait={hof.bestKda && agentPortraits.get(hof.bestKda.agent)}
          context={hof.bestKda && `${hof.bestKda.agent} — ${hof.bestKda.map} — ${formatDate(hof.bestKda.date)}`}
        />
      </div>

      <div className="card">
        <h3>🏅 Succès ({unlockedCount}/{totalCount})</h3>
        <p className="label">
          Débloqués automatiquement dès que tu atteins le seuil, à partir des mêmes données que les records
          ci-dessus.
        </p>
      </div>

      {achievementGroups.map((group) => (
        <div key={group.label} className="card">
          <div className="achievement-group-header">
            <h3>{group.label}</h3>
            <span className="achievement-group-count">{group.unlockedCount}/{group.total}</span>
          </div>
          <div className="achievement-group-track">
            <div
              className="achievement-group-fill"
              style={{ width: `${(group.unlockedCount / group.total) * 100}%` }}
            />
          </div>
          <div className="achievement-grid">
            {group.items.map((item) => (
              <AchievementBadge key={item.id} {...item} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default HallOfFame;
