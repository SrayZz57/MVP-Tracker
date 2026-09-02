import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Play, Square, ChevronDown, ChevronRight } from 'lucide-react';
import Icon from './Icon.jsx';
import { useAgentIcons } from './agentIcons.js';
import {
  excludeDeathmatch,
  findMe,
  formStats,
  overallWinrate,
  overallHsPercent,
  groupStats,
  weaponKillsFor,
} from './valorantStats.js';
import CollapsibleCard from './CollapsibleCard.jsx';

// Outil "Sessions" (Outils) — à ne pas confondre avec "Session guidée"
// (checklist d'échauffement) : ici, on délimite juste une plage horaire à la
// main (Démarrer/Terminer) et on résume ensuite les vraies stats des matchs
// joués dedans, tirées du cache déjà en mémoire (aucun appel réseau
// supplémentaire, aucune donnée dupliquée — seule la plage started_at/
// ended_at est stockée, le résumé se recalcule à chaque affichage).
function formatDuration(ms) {
  const totalMinutes = Math.floor(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return hours > 0 ? `${hours}h ${minutes}min` : `${minutes}min`;
}

function computeSessionSummary(matches, name, tag, from, to) {
  const inWindow = matches.filter((m) => {
    const start = m.metadata?.game_start;
    if (!start) return false;
    const ms = start * 1000;
    return ms >= from && ms <= to;
  });
  const ranked = excludeDeathmatch(inWindow);
  if (ranked.length === 0) return null;

  const form = formStats(ranked, name, tag);
  const winrate = overallWinrate(ranked, name, tag);
  const hsPercent = overallHsPercent(ranked, name, tag);
  const agents = groupStats(ranked, name, tag, (match, me) => me.character);

  let kills = 0;
  let deaths = 0;
  let assists = 0;
  const weaponCounts = new Map();
  ranked.forEach((match) => {
    const me = findMe(match, name, tag);
    if (!me) return;
    kills += me.stats?.kills ?? 0;
    deaths += me.stats?.deaths ?? 0;
    assists += me.stats?.assists ?? 0;
    weaponKillsFor(match, me.puuid).forEach((weapon) => weaponCounts.set(weapon, (weaponCounts.get(weapon) ?? 0) + 1));
  });
  const weapons = [...weaponCounts.entries()]
    .map(([weapon, count]) => ({ weapon, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return {
    games: ranked.length,
    winrate,
    kd: form.overallKd,
    hsPercent,
    kills,
    deaths,
    assists,
    agents,
    weapons,
  };
}

function SessionSummary({ summary, agentIcons, t }) {
  if (!summary) return <p className="label">{t('playSessions.noMatchesInWindow')}</p>;

  return (
    <>
      <div className="stat-tiles">
        <div className="stat-tile">
          <div className="value">{summary.games}</div>
          <div className="label">{t('playSessions.gamesPlayed')}</div>
        </div>
        <div className="stat-tile">
          <div className="value">{summary.winrate === null ? '—' : `${summary.winrate.toFixed(0)}%`}</div>
          <div className="label">{t('playSessions.winrate')}</div>
        </div>
        <div className="stat-tile">
          <div className="value">{summary.kd === null ? '—' : summary.kd.toFixed(2)}</div>
          <div className="label">{t('playSessions.kd')}</div>
        </div>
        <div className="stat-tile">
          <div className="value">{summary.hsPercent === null ? '—' : `${summary.hsPercent.toFixed(0)}%`}</div>
          <div className="label">{t('playSessions.precision')}</div>
        </div>
        <div className="stat-tile">
          <div className="value">{summary.kills}/{summary.deaths}/{summary.assists}</div>
          <div className="label">{t('playSessions.kda')}</div>
        </div>
      </div>

      {summary.agents.length > 0 && (
        <div className="session-summary-block">
          <h4 className="account-subsection-title">{t('playSessions.agentsPlayed')}</h4>
          <div className="comp-quickpick-list">
            {summary.agents.map((row) => (
              <span key={row.key} className="comp-quickpick-chip">
                {agentIcons.get(row.key) && <img src={agentIcons.get(row.key)} alt="" />}
                {row.key}
                <span className="comp-quickpick-games">{row.games}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {summary.weapons.length > 0 && (
        <div className="session-summary-block">
          <h4 className="account-subsection-title">{t('playSessions.topWeapons')}</h4>
          <div className="comp-quickpick-list">
            {summary.weapons.map((row) => (
              <span key={row.weapon} className="comp-quickpick-chip">
                {row.weapon}
                <span className="comp-quickpick-games">{row.count}</span>
              </span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

function PlaySessions({ settings, matches }) {
  const { t } = useTranslation();
  const agentIcons = useAgentIcons();
  const [activeSession, setActiveSession] = useState(undefined); // undefined = pas encore chargé
  const [history, setHistory] = useState([]);
  const [lastEnded, setLastEnded] = useState(null); // résumé affiché juste après avoir terminé
  const [now, setNow] = useState(Date.now());
  const [expandedId, setExpandedId] = useState(null);
  const [starting, setStarting] = useState(false);
  const [ending, setEnding] = useState(false);

  function loadAll() {
    window.electronAPI.getActivePlaySession().then(setActiveSession);
    window.electronAPI.getPlaySessionHistory(30).then(setHistory);
  }

  useEffect(() => {
    loadAll();
  }, []);

  // Chrono affiché pendant une session en cours — juste pour l'affichage,
  // la vraie durée est recalculée à la fin depuis started_at/ended_at.
  useEffect(() => {
    if (!activeSession) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [activeSession]);

  const handleStart = async () => {
    setStarting(true);
    setLastEnded(null);
    const session = await window.electronAPI.startPlaySession();
    setActiveSession(session);
    setStarting(false);
  };

  const handleEnd = async () => {
    if (!activeSession) return;
    setEnding(true);
    await window.electronAPI.endPlaySession(activeSession.id);
    const endedAt = Date.now();
    setLastEnded({ ...activeSession, ended_at: endedAt });
    setActiveSession(null);
    setEnding(false);
    window.electronAPI.getPlaySessionHistory(30).then(setHistory);
  };

  const activeSummary = useMemo(() => {
    if (!activeSession) return null;
    return computeSessionSummary(matches, settings.name, settings.tag, activeSession.started_at, now);
  }, [matches, settings.name, settings.tag, activeSession, now]);

  const lastEndedSummary = useMemo(() => {
    if (!lastEnded) return null;
    return computeSessionSummary(matches, settings.name, settings.tag, lastEnded.started_at, lastEnded.ended_at);
  }, [matches, settings.name, settings.tag, lastEnded]);

  return (
    <div>
      <CollapsibleCard id="playSessions.current" title={t('playSessions.title')}>
        <p className="label">{t('playSessions.description')}</p>

        {activeSession === undefined ? (
          <p className="label">{t('auth.loading')}</p>
        ) : activeSession ? (
          <>
            <div className="session-live-banner">
              <span className="session-live-dot" aria-hidden="true" />
              <span>{t('playSessions.liveSince', { duration: formatDuration(now - activeSession.started_at) })}</span>
              <button className="button-danger session-end-btn" onClick={handleEnd} disabled={ending}>
                <Icon icon={Square} size={16} /> {ending ? t('playSessions.ending') : t('playSessions.endSession')}
              </button>
            </div>
            <SessionSummary summary={activeSummary} agentIcons={agentIcons} t={t} />
          </>
        ) : (
          <>
            <button className="refresh" onClick={handleStart} disabled={starting}>
              <Icon icon={Play} size={16} /> {starting ? t('playSessions.starting') : t('playSessions.startSession')}
            </button>

            {lastEnded && (
              <div className="session-summary-block" style={{ marginTop: '1.25rem' }}>
                <h4 className="account-subsection-title">{t('playSessions.justEnded')}</h4>
                <SessionSummary summary={lastEndedSummary} agentIcons={agentIcons} t={t} />
              </div>
            )}
          </>
        )}
      </CollapsibleCard>

      <CollapsibleCard id="playSessions.history" title={t('playSessions.historyTitle')}>
        {history.length === 0 ? (
          <p className="label">{t('playSessions.noHistoryYet')}</p>
        ) : (
          <ul className="session-history-list">
            {history.map((session) => {
              const isOpen = expandedId === session.id;
              const summary = isOpen
                ? computeSessionSummary(matches, settings.name, settings.tag, session.started_at, session.ended_at)
                : null;
              return (
                <li key={session.id} className="session-history-item">
                  <button
                    type="button"
                    className="session-history-header"
                    onClick={() => setExpandedId(isOpen ? null : session.id)}
                  >
                    <Icon icon={isOpen ? ChevronDown : ChevronRight} size={16} />
                    <span>{new Date(session.started_at).toLocaleString()}</span>
                    <span className="label">{formatDuration(session.ended_at - session.started_at)}</span>
                  </button>
                  {isOpen && (
                    <div className="session-history-body">
                      <SessionSummary summary={summary} agentIcons={agentIcons} t={t} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </CollapsibleCard>
    </div>
  );
}

export default PlaySessions;
