import { useLayoutEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';
import { groupByRound } from './bracket.js';
import Button from './ui/Button';

function teamLabel(teamId, teamsById, t) {
  if (!teamId) return t('tournaments.bracket.tbd');
  return teamsById.get(teamId)?.name ?? '–';
}

function MatchResultForm({ match, onSaved }) {
  const { t } = useTranslation();
  const [score1, setScore1] = useState(match.team1_score ?? '');
  const [score2, setScore2] = useState(match.team2_score ?? '');
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    const s1 = Number(score1);
    const s2 = Number(score2);
    if (Number.isNaN(s1) || Number.isNaN(s2) || s1 === s2) return;
    const winnerId = s1 > s2 ? match.team1_id : match.team2_id;
    setSaving(true);
    await onSaved(match, s1, s2, winnerId);
    setSaving(false);
  }

  return (
    <form className="bracket-score-form" onSubmit={handleSubmit}>
      <input type="number" min={0} value={score1} onChange={(e) => setScore1(e.target.value)} required />
      <span>–</span>
      <input type="number" min={0} value={score2} onChange={(e) => setScore2(e.target.value)} required />
      <Button variant="primary" type="submit" loading={saving} loadingLabel={t('tournaments.saving')}>
        {t('tournaments.bracket.saveResult')}
      </Button>
    </form>
  );
}

function BracketView({ tournamentId, matches, teams, isAdmin, onUpdated }) {
  const { t } = useTranslation();
  const containerRef = useRef(null);
  const matchRefs = useRef(new Map());
  const [lines, setLines] = useState([]);

  const teamsById = new Map(teams.map((team) => [team.id, team]));
  const rounds = groupByRound(matches);
  const maxRound = rounds.length;

  useLayoutEffect(() => {
    function computeLines() {
      const container = containerRef.current;
      if (!container) return;
      const containerBox = container.getBoundingClientRect();
      const next = [];

      for (const match of matches) {
        if (match.round >= maxRound) continue;
        const fromEl = matchRefs.current.get(`${match.round}:${match.position}`);
        const toEl = matchRefs.current.get(`${match.round + 1}:${Math.floor(match.position / 2)}`);
        if (!fromEl || !toEl) continue;

        const fromBox = fromEl.getBoundingClientRect();
        const toBox = toEl.getBoundingClientRect();
        const x1 = fromBox.right - containerBox.left;
        const y1 = fromBox.top + fromBox.height / 2 - containerBox.top;
        const x2 = toBox.left - containerBox.left;
        const y2 = toBox.top + toBox.height / 2 - containerBox.top;
        const midX = (x1 + x2) / 2;

        next.push({ key: `${match.round}:${match.position}`, d: `M ${x1} ${y1} H ${midX} V ${y2} H ${x2}` });
      }
      setLines(next);
    }

    computeLines();
    const observer = new ResizeObserver(computeLines);
    if (containerRef.current) observer.observe(containerRef.current);
    window.addEventListener('resize', computeLines);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', computeLines);
    };
  }, [matches, maxRound]);

  async function handleResult(match, score1, score2, winnerId) {
    await supabase
      .from('tournament_matches')
      .update({ team1_score: score1, team2_score: score2, winner_id: winnerId })
      .eq('id', match.id);

    if (match.round < maxRound) {
      const nextPosition = Math.floor(match.position / 2);
      const field = match.position % 2 === 0 ? 'team1_id' : 'team2_id';
      const nextMatch = matches.find((m) => m.round === match.round + 1 && m.position === nextPosition);
      if (nextMatch) {
        await supabase
          .from('tournament_matches')
          .update({ [field]: winnerId })
          .eq('id', nextMatch.id);
      }
    } else {
      await supabase.from('tournaments').update({ status: 'completed' }).eq('id', tournamentId);
    }

    onUpdated();
  }

  return (
    <div className="bracket" ref={containerRef}>
      <svg className="bracket-lines" aria-hidden="true">
        {lines.map((line) => (
          <path key={line.key} d={line.d} />
        ))}
      </svg>

      {rounds.map(({ round, matches: roundMatches }) => (
        <div key={round} className="bracket-round">
          <p className="bracket-round-title">
            {round === maxRound ? t('tournaments.bracket.final') : t('tournaments.bracket.round', { round })}
          </p>
          <div className="bracket-round-matches">
            {roundMatches.map((match) => {
              const playable = isAdmin && !match.is_bye && !match.winner_id && match.team1_id && match.team2_id;
              const isFinal = round === maxRound && match.winner_id;
              return (
                <div
                  key={match.id}
                  ref={(el) => {
                    if (el) matchRefs.current.set(`${match.round}:${match.position}`, el);
                    else matchRefs.current.delete(`${match.round}:${match.position}`);
                  }}
                  className={`bracket-match ${match.winner_id ? 'decided' : ''} ${isFinal ? 'champion' : ''}`}
                >
                  <div className={`bracket-team ${match.winner_id === match.team1_id ? 'winner' : ''}`}>
                    <span>{teamLabel(match.team1_id, teamsById, t)}</span>
                    {match.team1_score !== null && <span className="bracket-score">{match.team1_score}</span>}
                  </div>
                  <div className={`bracket-team ${match.winner_id === match.team2_id ? 'winner' : ''}`}>
                    <span>{teamLabel(match.team2_id, teamsById, t)}</span>
                    {match.team2_score !== null && <span className="bracket-score">{match.team2_score}</span>}
                  </div>
                  {match.is_bye && <p className="label bracket-bye-note">{t('tournaments.bracket.bye')}</p>}
                  {playable && <MatchResultForm match={match} onSaved={handleResult} />}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

export default BracketView;
