import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient.js';
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
function TournamentsTab({ myId }) {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  useEffect(() => {
    supabase
      .from('tournaments')
      .select('id, name, description, status, max_teams')
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!error) setTournaments(data ?? []);
        setLoading(false);
      });
  }, []);

  if (selectedId) {
    return <TournamentDetail tournamentId={selectedId} myId={myId} onBack={() => setSelectedId(null)} />;
  }

  if (loading) return <p className="label">{t('tournaments.loading')}</p>;

  if (tournaments.length === 0) {
    return <p className="label">{t('tournaments.empty')}</p>;
  }

  return (
    <div className="tournaments-list">
      {tournaments.map((tournament) => (
        <button key={tournament.id} className="tournament-card" onClick={() => setSelectedId(tournament.id)}>
          <span className="tournament-card-name">{tournament.name}</span>
          <span className={`tournament-status-badge ${tournament.status}`}>
            {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
          </span>
          {tournament.description && <p className="tournament-card-description">{tournament.description}</p>}
        </button>
      ))}
    </div>
  );
}

export default TournamentsTab;
