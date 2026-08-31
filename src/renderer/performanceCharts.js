import { Sunrise, Sun, Sunset, Moon } from 'lucide-react';
import { excludeDeathmatch, findMe, resultLabel, groupStats, dayOfWeek, WEEK_ORDER } from './valorantStats.js';

const PERIODS = [
  { id: 'morning', label: 'Matin', icon: Sunrise, startHour: 6, endHour: 12 },
  { id: 'afternoon', label: 'Après-midi', icon: Sun, startHour: 12, endHour: 18 },
  { id: 'evening', label: 'Soir', icon: Sunset, startHour: 18, endHour: 24 },
  { id: 'night', label: 'Nuit', icon: Moon, startHour: 0, endHour: 6 },
];

function periodOf(match) {
  const gameStart = match?.metadata?.game_start;
  if (!gameStart) return null;
  const hour = new Date(gameStart * 1000).getHours();
  return PERIODS.find((p) => hour >= p.startHour && hour < p.endHour) ?? null;
}

export { PERIODS };

// Grille jour de la semaine × moment de la journée (4 créneaux plutôt que les
// 8 tranches de 3h utilisées ailleurs — sinon la grille est trop clairsemée
// avec un historique de quelques dizaines de matchs).
export function computeDayPeriodGrid(matches, name, tag) {
  const cells = new Map(); // "Lundi|morning" -> { games, wins }

  excludeDeathmatch(matches).forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const label = resultLabel(match, me);
    if (label !== 'Victoire' && label !== 'Défaite') return;
    const day = dayOfWeek(match);
    const period = periodOf(match);
    if (!day || !period) return;

    const key = `${day}|${period.id}`;
    if (!cells.has(key)) cells.set(key, { games: 0, wins: 0 });
    const c = cells.get(key);
    c.games += 1;
    if (label === 'Victoire') c.wins += 1;
  });

  return WEEK_ORDER.map((day) => ({
    day,
    periods: PERIODS.map((period) => {
      const c = cells.get(`${day}|${period.id}`);
      return {
        id: period.id,
        label: period.label,
        icon: period.icon,
        games: c?.games ?? 0,
        winrate: c && c.games > 0 ? (c.wins / c.games) * 100 : null,
      };
    }),
  }));
}

// Winrate par map, matchs suffisants uniquement (>= 2), triés du meilleur au
// pire, plafonné pour rester lisible en barres.
export function computeMapWinrates(matches, name, tag, limit = 8) {
  return groupStats(excludeDeathmatch(matches), name, tag, (match) => match.metadata?.map)
    .filter((row) => row.games >= 2 && row.winrate !== null)
    .sort((a, b) => b.winrate - a.winrate)
    .slice(0, limit);
}

// Répartition des parties par rôle (part-to-whole), dans un ordre fixe pour
// que les couleurs catégorielles restent stables d'un rendu à l'autre.
const ROLE_ORDER = ['Duelliste', 'Initiateur', 'Contrôleur', 'Sentinelle'];

export function computeRoleDistribution(matches, name, tag, agentRoles) {
  const rows = groupStats(excludeDeathmatch(matches), name, tag, (match, me) => agentRoles.get(me.character)?.roleName);
  const total = rows.reduce((sum, r) => sum + r.games, 0);
  if (total === 0) return [];

  return ROLE_ORDER.map((role) => {
    const row = rows.find((r) => r.key === role);
    return { role, games: row?.games ?? 0, percent: row ? (row.games / total) * 100 : 0 };
  }).filter((r) => r.games > 0);
}

// Tendance K/D et winrate glissant sur les derniers matchs, du plus ancien au
// plus récent (même fenêtre que la progression K/D déjà affichée sur Stats).
// `t` reçu en paramètre pour traduire les labels d'axe X à la génération.
export function computeTrend(t, matches, name, tag, limit = 20) {
  const recent = excludeDeathmatch(matches).slice(0, limit).reverse();
  const rollingWindow = 5;

  const kd = [];
  const results = [];

  recent.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const kills = me.stats?.kills ?? 0;
    const deaths = me.stats?.deaths ?? 0;
    kd.push({ label: match.metadata?.map ?? '?', value: deaths > 0 ? kills / deaths : kills });

    const label = resultLabel(match, me);
    if (label === 'Victoire' || label === 'Défaite') results.push(label === 'Victoire' ? 1 : 0);
  });

  const winrateRolling = results.map((_, i) => {
    const start = Math.max(0, i - rollingWindow + 1);
    const windowSlice = results.slice(start, i + 1);
    const wins = windowSlice.reduce((sum, v) => sum + v, 0);
    return { label: t('charts.matchLabel', { n: i + 1 }), value: (wins / windowSlice.length) * 100 };
  });

  return { kd, winrateRolling };
}
