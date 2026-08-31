import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trophy } from 'lucide-react';
import Icon from '../Icon.jsx';
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

const HOW_IT_WORKS_STEPS = [
  { titleKey: 'tournaments.howItWorks.step1Title', textKey: 'tournaments.howItWorks.step1Text' },
  { titleKey: 'tournaments.howItWorks.step2Title', textKey: 'tournaments.howItWorks.step2Text' },
  { titleKey: 'tournaments.howItWorks.step3Title', textKey: 'tournaments.howItWorks.step3Text' },
  { titleKey: 'tournaments.howItWorks.step4Title', textKey: 'tournaments.howItWorks.step4Text' },
];

// Petit panneau explicatif entre la liste et le panneau promo — purement
// informatif, ne dépend d'aucune donnée.
function TournamentsHowItWorks() {
  const { t } = useTranslation();

  return (
    <aside className="tournaments-how">
      <h2 className="tournaments-how-title">{t('tournaments.howItWorks.title')}</h2>
      <ol className="tournaments-how-steps">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li key={step.titleKey} className="tournaments-how-step" style={{ '--i': index }}>
            <span className="tournaments-how-step-number">{index + 1}</span>
            <div>
              <p className="tournaments-how-step-title">{t(step.titleKey)}</p>
              <p className="tournaments-how-step-text">{t(step.textKey)}</p>
            </div>
          </li>
        ))}
      </ol>
    </aside>
  );
}

// Sous "Comment ça marche" : accès rapide aux tournois où ce compte a une
// équipe inscrite (n'importe quel statut sauf refusée) — évite d'avoir à
// rechercher son propre tournoi dans la liste générale.
function TournamentsMine({ myId, onSelect }) {
  const { t } = useTranslation();
  const [mine, setMine] = useState(null);

  useEffect(() => {
    supabase
      .from('tournament_teams')
      .select('status, tournaments(id, name, status)')
      .eq('captain_id', myId)
      .neq('status', 'rejected')
      .then(({ data, error }) => {
        if (error) {
          setMine([]);
          return;
        }
        // Un même compte peut avoir plusieurs équipes dans UN MÊME tournoi
        // (le formulaire admin en ajoute autant que voulu) — un seul lien
        // par tournoi suffit ici, pas un doublon par équipe.
        const seen = new Set();
        const unique = [];
        for (const row of data ?? []) {
          if (!row.tournaments || seen.has(row.tournaments.id)) continue;
          seen.add(row.tournaments.id);
          unique.push(row);
        }
        setMine(unique);
      });
  }, [myId]);

  // Toujours affichée — même vide, avec un message plutôt que de disparaître
  // et casser la colonne (voir .tournaments-mine, dimensionnée pour occuper
  // le reste de la colonne jusqu'au bas du panneau Neon).
  const list = mine ?? [];

  return (
    <aside className="tournaments-mine">
      <h2 className="tournaments-how-title">{t('tournaments.mine.title')}</h2>
      {list.length === 0 ? (
        <p className="tournaments-mine-empty">{t('tournaments.mine.empty')}</p>
      ) : (
        <ul className="tournaments-mine-list">
          {list.map((row) => (
            <li key={row.tournaments.id}>
              <button onClick={() => onSelect(row.tournaments.id)}>
                <span className="tournaments-mine-name">{row.tournaments.name}</span>
                <span className={`tournament-status-badge ${row.tournaments.status}`}>
                  {t(STATUS_LABELS[row.tournaments.status] ?? row.tournaments.status)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
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
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  function loadTournaments() {
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
  }

  useEffect(() => {
    loadTournaments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (selectedId) {
    return <TournamentDetail tournamentId={selectedId} myId={myId} isAdmin={isAdmin} onBack={() => setSelectedId(null)} />;
  }

  if (loading) return <p className="label">{t('tournaments.loading')}</p>;

  // Suppression réservée à l'admin : côté serveur (RLS), la même barrière
  // que pour créer/modifier un tournoi (public.is_admin()) — celle-ci
  // existe déjà, aucune nouvelle policy à poser. La suppression cascade sur
  // les équipes/matchs de ce tournoi (contrainte déjà posée sur ces tables).
  async function handleDelete(tournamentId) {
    setDeleting(true);
    await supabase.from('tournaments').delete().eq('id', tournamentId);
    setDeleting(false);
    setConfirmDeleteId(null);
    loadTournaments();
  }

  const visibleTournaments = showAll ? tournaments : tournaments.slice(0, VISIBLE_COUNT);

  return (
    <div className="tournaments-page">
      <div className={`tournaments-list-block ${tournaments.length === 0 ? 'empty' : ''}`}>
        {tournaments.length === 0 ? (
          <div className="tournaments-empty-state">
            <span className="tournaments-empty-icon" aria-hidden="true">
              {/* Même dessin que le logo du panneau promo, mais recadré : le
                  trophée n'occupe que le haut d'un cadre 24x24 (y de 3 à
                  17) — laissé tel quel là où l'icône est à côté d'un texte,
                  mais visiblement pas centré une fois seule dans son cadre. */}
              <svg viewBox="4 2 16 16" width="48" height="48">
                <path
                  fill="currentColor"
                  d="M4 3h16v2h-2v2a6 6 0 0 1-5 5.92V15h3v2H8v-2h3v-2.08A6 6 0 0 1 6 7V5H4V3Zm4 2v2a4 4 0 0 0 8 0V5H8Z"
                />
              </svg>
            </span>
            <h2 className="tournaments-empty-title">{t('tournaments.empty')}</h2>
            <p className="tournaments-empty-subtitle">{t('tournaments.emptySubtitle')}</p>
          </div>
        ) : (
          <div className="tournaments-list">
            {visibleTournaments.map((tournament, index) => {
              const splash = pickSplash(tournament.id, mapImages);
              const winner = winnerNames.get(tournament.id);
              const confirming = confirmDeleteId === tournament.id;
              return (
                <div
                  key={tournament.id}
                  className="tournament-card"
                  role="button"
                  tabIndex={0}
                  style={{ '--i': index, ...(splash ? { backgroundImage: `url(${splash})` } : null) }}
                  onClick={() => setSelectedId(tournament.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(tournament.id)}
                >
                  {isAdmin && (
                    <div className="tournament-card-admin-actions" onClick={(e) => e.stopPropagation()}>
                      {confirming ? (
                        <>
                          <button
                            className="tournament-card-delete-confirm"
                            disabled={deleting}
                            onClick={() => handleDelete(tournament.id)}
                          >
                            {deleting ? t('tournaments.saving') : t('tournaments.confirmDelete')}
                          </button>
                          <button className="tournament-card-delete-cancel" onClick={() => setConfirmDeleteId(null)}>
                            {t('tournaments.cancel')}
                          </button>
                        </>
                      ) : (
                        <button
                          className="tournament-card-delete"
                          title={t('tournaments.deleteTournament')}
                          onClick={() => setConfirmDeleteId(tournament.id)}
                        >
                          <Icon icon={X} size={14} />
                        </button>
                      )}
                    </div>
                  )}
                  <span className={`tournament-status-badge ${tournament.status}`}>
                    {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
                  </span>
                  <div className="tournament-card-content">
                    <span className="tournament-card-name">{tournament.name}</span>
                    {tournament.description && <p className="tournament-card-description">{tournament.description}</p>}
                    {tournament.status === 'completed' && winner && (
                      <p className="tournament-card-winner">
                        <Icon icon={Trophy} size={16} aria-hidden="true" /> {t('tournaments.winner', { name: winner })}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            {!showAll && tournaments.length > VISIBLE_COUNT && (
              <button className="tournaments-show-more" onClick={() => setShowAll(true)}>
                {t('tournaments.showMore', { count: tournaments.length - VISIBLE_COUNT })}
              </button>
            )}
          </div>
        )}
      </div>
      <div className="tournaments-middle-column">
        <TournamentsHowItWorks />
        <TournamentsMine myId={myId} onSelect={setSelectedId} />
      </div>
      <TournamentsPromo />
    </div>
  );
}

export default TournamentsTab;
