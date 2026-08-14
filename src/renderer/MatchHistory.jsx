import { useEffect, useMemo, useState } from 'react';

function findMe(match, name, tag) {
  const players = match?.players?.all_players || [];
  return players.find(
    (p) => p.name?.toLowerCase() === name.toLowerCase() && p.tag?.toLowerCase() === tag.toLowerCase(),
  );
}

function resultLabel(match, me) {
  if (match?.metadata?.mode_id === 'deathmatch') return 'Sans équipe';
  if (!me?.team) return '?';
  const teamKey = me.team.toLowerCase();
  const won = match?.teams?.[teamKey]?.has_won;
  if (won === undefined) return '?';
  return won ? 'Victoire' : 'Défaite';
}

function hitStats(me) {
  const headshots = me?.stats?.headshots ?? 0;
  const bodyshots = me?.stats?.bodyshots ?? 0;
  const legshots = me?.stats?.legshots ?? 0;
  const total = headshots + bodyshots + legshots;
  return {
    headshots,
    bodyshots,
    legshots,
    hsPercent: total > 0 ? (headshots / total) * 100 : null,
    bsPercent: total > 0 ? (bodyshots / total) * 100 : null,
    lsPercent: total > 0 ? (legshots / total) * 100 : null,
  };
}

function weaponKillsFor(match, puuid) {
  const kills = match?.kills || [];
  return kills
    .filter((k) => k.killer_puuid === puuid && k.damage_weapon_name)
    .map((k) => k.damage_weapon_name);
}

function groupStats(matches, name, tag, keyFn) {
  const groups = new Map();

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    const key = keyFn(match, me);
    if (!key) return;

    if (!groups.has(key)) {
      groups.set(key, { games: 0, wins: 0, decidedGames: 0, kills: 0, deaths: 0, assists: 0 });
    }
    const g = groups.get(key);
    g.games += 1;
    g.kills += me.stats?.kills ?? 0;
    g.deaths += me.stats?.deaths ?? 0;
    g.assists += me.stats?.assists ?? 0;

    const label = resultLabel(match, me);
    if (label === 'Victoire' || label === 'Défaite') {
      g.decidedGames += 1;
      if (label === 'Victoire') g.wins += 1;
    }
  });

  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      games: g.games,
      winrate: g.decidedGames > 0 ? (g.wins / g.decidedGames) * 100 : null,
      avgKills: g.kills / g.games,
      avgDeaths: g.deaths / g.games,
      avgAssists: g.assists / g.games,
    }))
    .sort((a, b) => b.games - a.games);
}

const DAY_LABELS = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];

const SLOT_HOURS = 3;

function timeSlot(match) {
  const gameStart = match?.metadata?.game_start;
  if (!gameStart) return null;
  const hour = new Date(gameStart * 1000).getHours();
  const start = Math.floor(hour / SLOT_HOURS) * SLOT_HOURS;
  return `${start}h-${start + SLOT_HOURS}h`;
}

function dayOfWeek(match) {
  const gameStart = match?.metadata?.game_start;
  if (!gameStart) return null;
  return DAY_LABELS[new Date(gameStart * 1000).getDay()];
}

// Suppose `matches` triés du plus récent au plus ancien (c'est l'ordre renvoyé par le cache SQLite).
function formStats(matches, name, tag) {
  let streakType = null;
  let streakCount = 0;
  let streakBroken = false;

  let recentKills = 0;
  let recentDeaths = 0;
  let recentCount = 0;
  let totalKills = 0;
  let totalDeaths = 0;

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;

    totalKills += me.stats?.kills ?? 0;
    totalDeaths += me.stats?.deaths ?? 0;

    if (recentCount < 5) {
      recentKills += me.stats?.kills ?? 0;
      recentDeaths += me.stats?.deaths ?? 0;
      recentCount += 1;
    }

    const label = resultLabel(match, me);
    if (streakBroken || (label !== 'Victoire' && label !== 'Défaite')) return;
    if (streakType === null) {
      streakType = label;
      streakCount = 1;
    } else if (label === streakType) {
      streakCount += 1;
    } else {
      streakBroken = true;
    }
  });

  return {
    streakType,
    streakCount,
    overallKd: totalDeaths > 0 ? totalKills / totalDeaths : null,
    recentKd: recentDeaths > 0 ? recentKills / recentDeaths : null,
    recentCount,
  };
}

function tiltStatus(matches, name, tag, form) {
  let last3Kills = 0;
  let last3Deaths = 0;
  let last3Count = 0;

  matches.forEach((match) => {
    if (last3Count >= 3) return;
    const me = findMe(match, name, tag);
    if (!me) return;
    last3Kills += me.stats?.kills ?? 0;
    last3Deaths += me.stats?.deaths ?? 0;
    last3Count += 1;
  });

  const last3Kd = last3Deaths > 0 ? last3Kills / last3Deaths : null;
  const lossStreakTilt = form.streakType === 'Défaite' && form.streakCount >= 3;
  const perfDegradation = last3Kd !== null && form.overallKd !== null && last3Kd < form.overallKd * 0.7;

  return { lossStreakTilt, perfDegradation, last3Kd, isTilted: lossStreakTilt || perfDegradation };
}

const PING_MATCH_MAX_GAP_MS = 10000;
const PING_SPIKE_RATIO = 1.3;

function pingCorrelation(matches, pingSamples, name, tag) {
  let deathsAnalyzed = 0;
  let deathsNearSpike = 0;

  matches.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;

    const gameStartMs = (match.metadata?.game_start ?? 0) * 1000;
    const gameLengthMs = match.metadata?.game_length ?? 0;
    const windowSamples = pingSamples.filter(
      (s) => s.timestamp >= gameStartMs && s.timestamp <= gameStartMs + gameLengthMs,
    );
    if (windowSamples.length === 0) return;

    const baseline = windowSamples.reduce((sum, s) => sum + s.latency_ms, 0) / windowSamples.length;

    (match.kills || [])
      .filter((k) => k.victim_puuid === me.puuid)
      .forEach((death) => {
        const deathTime = gameStartMs + death.kill_time_in_match;
        let closest = null;
        let closestGap = Infinity;
        windowSamples.forEach((s) => {
          const gap = Math.abs(s.timestamp - deathTime);
          if (gap < closestGap) {
            closestGap = gap;
            closest = s;
          }
        });
        if (!closest || closestGap > PING_MATCH_MAX_GAP_MS) return;

        deathsAnalyzed += 1;
        if (closest.latency_ms > baseline * PING_SPIKE_RATIO) {
          deathsNearSpike += 1;
        }
      });
  });

  return { deathsAnalyzed, deathsNearSpike };
}

function MatchHistory({ settings }) {
  const [matches, setMatches] = useState([]);
  const [pingSamples, setPingSamples] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    window.electronAPI.getCachedMatches().then(setMatches);
    window.electronAPI.getPingSamples().then(setPingSamples);
  }, []);

  const handleRefresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await window.electronAPI.getMatches(settings);
      setMatches(data || []);
      setPingSamples(await window.electronAPI.getPingSamples());
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const pingStats = useMemo(
    () => pingCorrelation(matches, pingSamples, settings.name, settings.tag),
    [matches, pingSamples, settings.name, settings.tag],
  );

  const form = useMemo(
    () => formStats(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  const tilt = useMemo(
    () => tiltStatus(matches, settings.name, settings.tag, form),
    [matches, settings.name, settings.tag, form],
  );

  const globalStats = useMemo(() => {
    let totalHeadshots = 0;
    let totalBodyshots = 0;
    let totalLegshots = 0;
    const weaponCounts = new Map();

    matches.forEach((match) => {
      const me = findMe(match, settings.name, settings.tag);
      if (!me) return;

      const { headshots, bodyshots, legshots } = hitStats(me);
      totalHeadshots += headshots;
      totalBodyshots += bodyshots;
      totalLegshots += legshots;

      weaponKillsFor(match, me.puuid).forEach((weapon) => {
        weaponCounts.set(weapon, (weaponCounts.get(weapon) || 0) + 1);
      });
    });

    const totalShots = totalHeadshots + totalBodyshots + totalLegshots;

    return {
      hsPercent: totalShots > 0 ? (totalHeadshots / totalShots) * 100 : null,
      bsPercent: totalShots > 0 ? (totalBodyshots / totalShots) * 100 : null,
      lsPercent: totalShots > 0 ? (totalLegshots / totalShots) * 100 : null,
      weaponRanking: [...weaponCounts.entries()].sort((a, b) => b[1] - a[1]),
    };
  }, [matches, settings.name, settings.tag]);

  const agentStats = useMemo(
    () => groupStats(matches, settings.name, settings.tag, (match, me) => me.character),
    [matches, settings.name, settings.tag],
  );

  const mapStats = useMemo(
    () => groupStats(matches, settings.name, settings.tag, (match) => match.metadata?.map),
    [matches, settings.name, settings.tag],
  );

  const modeStats = useMemo(
    () => groupStats(matches, settings.name, settings.tag, (match) => match.metadata?.mode),
    [matches, settings.name, settings.tag],
  );

  const TIME_SLOT_ORDER = Array.from({ length: 24 / SLOT_HOURS }, (_, i) => `${i * SLOT_HOURS}h-${(i + 1) * SLOT_HOURS}h`);
  const timeSlotStats = useMemo(
    () =>
      groupStats(matches, settings.name, settings.tag, (match) => timeSlot(match)).sort(
        (a, b) => TIME_SLOT_ORDER.indexOf(a.key) - TIME_SLOT_ORDER.indexOf(b.key),
      ),
    [matches, settings.name, settings.tag],
  );

  const WEEK_ORDER = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];
  const dayOfWeekStats = useMemo(
    () =>
      groupStats(matches, settings.name, settings.tag, (match) => dayOfWeek(match)).sort(
        (a, b) => WEEK_ORDER.indexOf(a.key) - WEEK_ORDER.indexOf(b.key),
      ),
    [matches, settings.name, settings.tag],
  );

  const renderGroupTable = (title, rows) => (
    <div>
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Parties</th>
            <th>Winrate</th>
            <th>K/D/A moyen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{row.games}</td>
              <td>{row.winrate === null ? '?' : `${row.winrate.toFixed(0)}%`}</td>
              <td>
                {row.avgKills.toFixed(1)}/{row.avgDeaths.toFixed(1)}/{row.avgAssists.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div>
      <h2>Historique de matchs — {settings.name}#{settings.tag}</h2>
      <button onClick={handleRefresh} disabled={loading}>
        {loading ? 'Chargement...' : 'Rafraîchir'}
      </button>
      {error && <p style={{ color: 'red' }}>Erreur : {error}</p>}

      {matches.length > 0 && (
        <div>
          <h3>Corrélation ping / morts</h3>
          {pingStats.deathsAnalyzed === 0 ? (
            <p>
              Pas encore assez de données réseau pendant tes matchs pour calculer une corrélation
              (il faut avoir l'appli ouverte pendant que tu joues).
            </p>
          ) : (
            <p>
              {pingStats.deathsNearSpike} sur {pingStats.deathsAnalyzed} morts analysées ont eu lieu
              pendant un pic de ping (30% au-dessus de la moyenne de la partie).
            </p>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h3>Forme récente</h3>
          <p>
            Série actuelle :{' '}
            {form.streakType === null
              ? 'Pas assez de matchs avec résultat'
              : `${form.streakCount} ${form.streakType.toLowerCase()}(s) d'affilée`}
          </p>
          <p>
            K/D sur les {form.recentCount} derniers matchs :{' '}
            {form.recentKd === null ? '?' : form.recentKd.toFixed(2)}
            {' '}(moyenne générale : {form.overallKd === null ? '?' : form.overallKd.toFixed(2)})
          </p>
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h3>Détection de tilt</h3>
          {tilt.isTilted ? (
            <p style={{ color: 'orange' }}>
              ⚠️ Signes de tilt détectés
              {tilt.lossStreakTilt && ` — ${form.streakCount} défaites d'affilée`}
              {tilt.perfDegradation &&
                ` — perf en baisse sur les 3 derniers matchs (K/D ${tilt.last3Kd.toFixed(2)} vs moyenne ${form.overallKd.toFixed(2)})`}
              . Une pause pourrait aider.
            </p>
          ) : (
            <p>Pas de signe de tilt détecté pour l'instant.</p>
          )}
        </div>
      )}

      {matches.length > 0 && (
        <div>
          <h3>Stats globales ({matches.length} matchs)</h3>
          <p>
            Zones touchées — Tête : {globalStats.hsPercent === null ? '?' : `${globalStats.hsPercent.toFixed(1)}%`}
            {' '}— Corps : {globalStats.bsPercent === null ? '?' : `${globalStats.bsPercent.toFixed(1)}%`}
            {' '}— Jambes : {globalStats.lsPercent === null ? '?' : `${globalStats.lsPercent.toFixed(1)}%`}
          </p>
          <p>Armes les plus utilisées :</p>
          <ol>
            {globalStats.weaponRanking.map(([weapon, count]) => (
              <li key={weapon}>{weapon} — {count} kills</li>
            ))}
          </ol>
        </div>
      )}

      {matches.length > 0 && renderGroupTable('Stats par agent', agentStats)}
      {matches.length > 0 && renderGroupTable('Stats par map', mapStats)}
      {matches.length > 0 && renderGroupTable('Stats par mode', modeStats)}
      {matches.length > 0 && renderGroupTable('Stats par tranche horaire', timeSlotStats)}
      {matches.length > 0 && renderGroupTable('Stats par jour de la semaine', dayOfWeekStats)}

      <ul>
        {matches.map((match) => {
          const me = findMe(match, settings.name, settings.tag);
          const { hsPercent, bsPercent, lsPercent } = hitStats(me);
          return (
            <li key={match.metadata?.matchid}>
              {match.metadata?.mode ?? '?'} — {match.metadata?.map ?? '?'} — {me?.character ?? '?'} — {' '}
              {me?.stats?.kills ?? '?'}/{me?.stats?.deaths ?? '?'}/{me?.stats?.assists ?? '?'} — {' '}
              {resultLabel(match, me)}
              {hsPercent !== null &&
                ` — Tête ${hsPercent.toFixed(0)}% / Corps ${bsPercent.toFixed(0)}% / Jambes ${lsPercent.toFixed(0)}%`}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default MatchHistory;
