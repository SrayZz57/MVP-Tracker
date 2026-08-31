import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../supabaseClient.js';
import { useMapImages } from '../mapImages.js';
import TournamentDetail from '../TournamentDetail.jsx';

const STATUS_LABELS = {
  registration: 'tournaments.status.registration',
  ongoing: 'tournaments.status.ongoing',
  completed: 'tournaments.status.completed',
};

// Hash simple et stable : le même tournoi affiche toujours la même map en
// fond (pas un tirage aléatoire à chaque rendu), sans avoir besoin d'une
// colonne "map" dédiée en base — juste une affectation déterministe à partir
// de son id.
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pickSplash(tournamentId, mapImages) {
  const names = [...mapImages.keys()];
  if (names.length === 0) return null;
  return mapImages.get(names[hashString(tournamentId) % names.length]);
}

// Liste des tournois — sert de page d'entrée pour tous les comptes connectés
// (pas encore une vraie page publique accessible sans compte, ça viendra
// séparément si besoin). Cliquer un tournoi ouvre TournamentDetail, qui gère
// l'affichage + l'inscription d'équipe.
function TournamentsTab({ myId, isAdmin }) {
  const { t } = useTranslation();
  const mapImages = useMapImages();
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
    return <TournamentDetail tournamentId={selectedId} myId={myId} isAdmin={isAdmin} onBack={() => setSelectedId(null)} />;
  }

  if (loading) return <p className="label">{t('tournaments.loading')}</p>;

  if (tournaments.length === 0) {
    return <p className="label">{t('tournaments.empty')}</p>;
  }

  return (
    <div className="tournaments-list">
      {tournaments.map((tournament) => {
        const splash = pickSplash(tournament.id, mapImages);
        return (
          <button
            key={tournament.id}
            className="tournament-card"
            style={splash ? { backgroundImage: `url(${splash})` } : undefined}
            onClick={() => setSelectedId(tournament.id)}
          >
            <span className={`tournament-status-badge ${tournament.status}`}>
              {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
            </span>
            <div className="tournament-card-content">
              <span className="tournament-card-name">{tournament.name}</span>
              {tournament.description && <p className="tournament-card-description">{tournament.description}</p>}
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default TournamentsTab;
