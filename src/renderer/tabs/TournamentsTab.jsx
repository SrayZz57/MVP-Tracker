import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient.js';
import { useMapImages } from '../mapImages.js';
import { useAgentPortraits } from '../agentIcons.js';
import { pickSplash } from '../tournamentVisuals.js';
import TournamentDetail from '../TournamentDetail.jsx';

const STATUS_LABELS = {
  registration: 'tournaments.status.registration',
  ongoing: 'tournaments.status.ongoing',
  completed: 'tournaments.status.completed',
};

// Nombre de cartes affichées avant "Voir plus" — le panneau promo à droite a
// une hauteur fixe (calée sur la fenêtre) : sans cette limite, une longue
// liste l'étirerait avec elle plutôt que de simplement défiler/se replier.
const VISIBLE_COUNT = 4;

// Panneau décoratif dans l'espace vide à droite de la liste — Neon en
// vedette (thème électrique/néon, cohérent avec l'identité du module),
// purement visuel, ne réagit à aucune donnée.
function TournamentsPromo() {
  const { t } = useTranslation();
  const agentPortraits = useAgentPortraits();
  const portrait = agentPortraits.get('Neon');

  return (
    <aside className="tournaments-promo">
      <span className="tournaments-promo-watermark" aria-hidden="true">
        {t('tournaments.promoWatermark')}
      </span>
      <div className="tournaments-promo-logo" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="28" height="28">
          <path
            fill="currentColor"
            d="M4 3h16v2h-2v2a6 6 0 0 1-5 5.92V15h3v2H8v-2h3v-2.08A6 6 0 0 1 6 7V5H4V3Zm4 2v2a4 4 0 0 0 8 0V5H8Z"
          />
        </svg>
        <span>{t('tournaments.promoTag')}</span>
      </div>
      {portrait && <img className="tournaments-promo-portrait" src={portrait} alt="" />}
    </aside>
  );
}

// Liste des tournois — sert de page d'entrée pour tous les comptes connectés
// (pas encore une vraie page publique accessible sans compte, ça viendra
// séparément si besoin). Cliquer un tournoi ouvre TournamentDetail, qui gère
// l'affichage + l'inscription d'équipe.
function TournamentsTab({ myId, isAdmin }) {
  const { t } = useTranslation();
  const mapImages = useMapImages();
  const [tournaments, setTournaments] = useState([]);
  const [winnerNames, setWinnerNames] = useState(new Map());
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showAll, setShowAll] = useState(false);

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

  const visibleTournaments = showAll ? tournaments : tournaments.slice(0, VISIBLE_COUNT);

  return (
    <div className="tournaments-page">
      <div className="tournaments-list">
        {visibleTournaments.map((tournament, index) => {
          const splash = pickSplash(tournament.id, mapImages);
          const winner = winnerNames.get(tournament.id);
          return (
            <button
              key={tournament.id}
              className="tournament-card"
              style={{ '--i': index, ...(splash ? { backgroundImage: `url(${splash})` } : null) }}
              onClick={() => setSelectedId(tournament.id)}
            >
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
        {!showAll && tournaments.length > VISIBLE_COUNT && (
          <button className="tournaments-show-more" onClick={() => setShowAll(true)}>
            {t('tournaments.showMore', { count: tournaments.length - VISIBLE_COUNT })}
          </button>
        )}
      </div>
      <TournamentsPromo />
    </div>
  );
}

export default TournamentsTab;
