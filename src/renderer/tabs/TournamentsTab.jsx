import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Trophy } from 'lucide-react';
import Icon from '../ui/Icon.jsx';
import { supabase } from '../account/supabaseClient.js';
import { useMapImages } from '../data/mapImages.js';
import { useAgentPortraits } from '../data/agentIcons.js';
import { pickSplash } from '../tournaments/tournamentVisuals.js';
import TournamentDetail from '../tournaments/TournamentDetail.jsx';
import Button from '../ui/Button';
import { TournamentListSkeleton } from '../ui/skeletons.jsx';
import useLoadingGate from '../hooks/useLoadingGate.js';

const STATUS_LABELS = {
  registration: 'tournaments.status.registration',
  ongoing: 'tournaments.status.ongoing',
  completed: 'tournaments.status.completed',
};

const VISIBLE_COUNT = 4;

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

function TournamentsHowItWorks() {
  const { t } = useTranslation();

  return (
    <aside className="tournaments-how">
      <h2 className="tournaments-how-title">{t('tournaments.howItWorks.title')}</h2>
      <ol className="tournaments-how-steps">
        {HOW_IT_WORKS_STEPS.map((step, index) => (
          <li key={step.titleKey} className="tournaments-how-step">
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
              <Button variant="ghost" onClick={() => onSelect(row.tournaments.id)}>
                <span className="tournaments-mine-name">{row.tournaments.name}</span>
                <span className={`tournament-status-badge ${row.tournaments.status}`}>
                  {t(STATUS_LABELS[row.tournaments.status] ?? row.tournaments.status)}
                </span>
              </Button>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}

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

  const loadingGate = useLoadingGate(loading);

  if (selectedId) {
    return <TournamentDetail tournamentId={selectedId} myId={myId} isAdmin={isAdmin} onBack={() => setSelectedId(null)} />;
  }

  if (loadingGate.busy) return loadingGate.show ? <TournamentListSkeleton /> : null;

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
            {visibleTournaments.map((tournament) => {
              const splash = pickSplash(tournament.id, mapImages);
              const winner = winnerNames.get(tournament.id);
              const confirming = confirmDeleteId === tournament.id;
              return (
                <div
                  key={tournament.id}
                  className="tournament-card"
                  role="button"
                  tabIndex={0}
                  style={splash ? { backgroundImage: `url(${splash})` } : undefined}
                  onClick={() => setSelectedId(tournament.id)}
                  onKeyDown={(e) => e.key === 'Enter' && setSelectedId(tournament.id)}
                >
                  {isAdmin && (
                    <div className="tournament-card-admin-actions" onClick={(e) => e.stopPropagation()}>
                      {confirming ? (
                        <>
                          <Button
                            variant="danger"
                            className="tournament-card-delete-confirm"
                            loading={deleting}
                            loadingLabel={t('tournaments.saving')}
                            onClick={() => handleDelete(tournament.id)}
                          >
                            {t('tournaments.confirmDelete')}
                          </Button>
                          <Button variant="ghost" className="tournament-card-delete-cancel" onClick={() => setConfirmDeleteId(null)}>
                            {t('tournaments.cancel')}
                          </Button>
                        </>
                      ) : (
                        <Button
                          variant="icon"
                          className="tournament-card-delete"
                          title={t('tournaments.deleteTournament')}
                          onClick={() => setConfirmDeleteId(tournament.id)}
                        >
                          <Icon icon={X} size={14} />
                        </Button>
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
              <Button variant="ghost" className="tournaments-show-more" onClick={() => setShowAll(true)}>
                {t('tournaments.showMore', { count: tournaments.length - VISIBLE_COUNT })}
              </Button>
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
