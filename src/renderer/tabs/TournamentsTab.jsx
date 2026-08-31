import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient.js';
import { useMapImages } from '../mapImages.js';
import { useAgentPortraits } from '../agentIcons.js';
import { pickSplash, pickAgentPortrait } from '../tournamentVisuals.js';
import TournamentDetail from '../TournamentDetail.jsx';

const STATUS_LABELS = {
  registration: 'tournaments.status.registration',
  ongoing: 'tournaments.status.ongoing',
  completed: 'tournaments.status.completed',
};

// Liste des tournois — sert de page d'entrée pour tous les comptes connectés
// (pas encore une vraie page publique accessible sans compte, ça viendra
// séparément si besoin). Cliquer un tournoi ouvre TournamentDetail, qui gère
// l'affichage + l'inscription d'équipe.
function TournamentsTab({ myId, isAdmin }) {
  const { t } = useTranslation();
  const mapImages = useMapImages();
  const agentPortraits = useAgentPortraits();
  const [tournaments, setTournaments] = useState([]);
  const [winnerNames, setWinnerNames] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('id, name, description, status, max_teams')
      .order('created_at', { ascending: false })
      .then(async ({ data, error }) => {
        if (error) {
          setLoading(false);
          return;
        }
        setTournaments(data ?? []);
        setLoading(false);

        // Vainqueur affiché sur les tournois terminés : le vainqueur du
        // match du tour le plus élevé (la finale) qui en a un.
        const completedIds = (data ?? []).filter((tm) => tm.status === 'completed').map((tm) => tm.id);
        if (completedIds.length === 0) return;

        const { data: matches } = await supabase
          .from('tournament_matches')
          .select('tournament_id, round, winner_id')
          .in('tournament_id', completedIds)
          .not('winner_id', 'is', null);

        const finalByTournament = new Map();
        for (const match of matches ?? []) {
          const current = finalByTournament.get(match.tournament_id);
          if (!current || match.round > current.round) finalByTournament.set(match.tournament_id, match);
        }
        const winnerTeamIds = [...finalByTournament.values()].map((m) => m.winner_id);
        if (winnerTeamIds.length === 0) return;

        const { data: teamRows } = await supabase.from('tournament_teams').select('id, name').in('id', winnerTeamIds);
        const nameById = new Map((teamRows ?? []).map((tm) => [tm.id, tm.name]));
        const winners = new Map();
        for (const [tournamentId, match] of finalByTournament) {
          const name = nameById.get(match.winner_id);
          if (name) winners.set(tournamentId, name);
        }
        setWinnerNames(winners);
      });
  }, []);

  if (selectedId) {
    return <TournamentDetail tournamentId={selectedId} myId={myId} isAdmin={isAdmin} onBack={() => setSelectedId(null)} />;
  }

  if (loading) return <p className="label">{t('tournaments.loading')}</p>;

  if (tournaments.length === 0) {
    return (
      <div className="tournaments-empty-state">
        <span className="tournaments-empty-icon">🏆</span>
        <p className="label">{t('tournaments.empty')}</p>
      </div>
    );
  }

  return (
    <div className="tournaments-list">
      {tournaments.map((tournament, index) => {
        const splash = pickSplash(tournament.id, mapImages);
        const portrait = pickAgentPortrait(tournament.id, agentPortraits);
        const winner = winnerNames.get(tournament.id);
        return (
          <button
            key={tournament.id}
            className="tournament-card"
            style={{ '--i': index, ...(splash ? { backgroundImage: `url(${splash})` } : null) }}
            onClick={() => setSelectedId(tournament.id)}
          >
            {portrait && <img className="tournament-card-portrait" src={portrait} alt="" />}
            <span className={`tournament-status-badge ${tournament.status}`}>
              {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
            </span>
            <div className="tournament-card-content">
              <span className="tournament-card-name">{tournament.name}</span>
              {tournament.description && <p className="tournament-card-description">{tournament.description}</p>}
              {tournament.status === 'completed' && winner && (
                <p className="tournament-card-winner">
                  <span aria-hidden="true">🏆</span> {t('tournaments.winner', { name: winner })}
                </p>
              )}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default TournamentsTab;
