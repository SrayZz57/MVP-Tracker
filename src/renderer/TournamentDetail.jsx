import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';
import { generateBracketRows } from './bracket.js';
import BracketView from './BracketView.jsx';

const PLAYER_COUNT = 5;
const EMPTY_PLAYERS = Array.from({ length: PLAYER_COUNT }, () => ({ riotName: '', riotTag: '' }));

const STATUS_LABELS = {
  registration: 'tournaments.status.registration',
  ongoing: 'tournaments.status.ongoing',
  completed: 'tournaments.status.completed',
};

function TeamRosterForm({ initialName, initialPlayers, saving, error, onSubmit, submitLabel }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [players, setPlayers] = useState(initialPlayers);

  function updatePlayer(index, field, value) {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, [field]: value } : p)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || players.some((p) => !p.riotName.trim() || !p.riotTag.trim())) return;
    onSubmit(name.trim(), players);
  }

  return (
    <form className="team-roster-form" onSubmit={handleSubmit}>
      <label>
        {t('tournaments.teamName')}
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={40} />
      </label>

      <p className="label">{t('tournaments.playersHint', { count: PLAYER_COUNT })}</p>

      {players.map((player, index) => (
        <div key={index} className="team-roster-player-row">
          <input
            placeholder={t('tournaments.riotName')}
            value={player.riotName}
            onChange={(e) => updatePlayer(index, 'riotName', e.target.value)}
            required
            maxLength={30}
          />
          <span>#</span>
          <input
            placeholder={t('tournaments.riotTag')}
            value={player.riotTag}
            onChange={(e) => updatePlayer(index, 'riotTag', e.target.value)}
            required
            maxLength={10}
          />
        </div>
      ))}

      {error && <p className="error-banner">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? t('tournaments.saving') : submitLabel}
      </button>
    </form>
  );
}

// Détail d'un tournoi : inscription d'équipe, validation admin des
// inscriptions, génération et affichage du bracket. Toute la sécurité réelle
// est côté RLS (voir les policies sur tournament_teams/tournament_matches) :
// ce composant se contente de ne PAS proposer les actions interdites — même
// en cas de requête forcée, Supabase refuse.
function TournamentDetail({ tournamentId, myId, isAdmin, onBack }) {
  const { t } = useTranslation();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [myTeamPlayers, setMyTeamPlayers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function loadAll() {
    setLoading(true);
    const [{ data: t1 }, { data: t2 }, { data: t3 }] = await Promise.all([
      supabase.from('tournaments').select('*').eq('id', tournamentId).maybeSingle(),
      supabase
        .from('tournament_teams')
        .select('id, name, captain_id, status')
        .eq('tournament_id', tournamentId)
        .neq('status', 'rejected'),
      supabase.from('tournament_matches').select('*').eq('tournament_id', tournamentId),
    ]);
    setTournament(t1 ?? null);
    setTeams(t2 ?? []);
    setMatches(t3 ?? []);

    const myTeam = (t2 ?? []).find((team) => team.captain_id === myId);
    if (myTeam) {
      const { data: players } = await supabase
        .from('tournament_team_players')
        .select('id, riot_name, riot_tag')
        .eq('team_id', myTeam.id);
      setMyTeamPlayers(players ?? []);
    } else {
      setMyTeamPlayers([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  if (loading) return <p className="label">{t('tournaments.loading')}</p>;
  if (!tournament) return <p className="label">{t('tournaments.notFound')}</p>;

  const myTeam = teams.find((team) => team.captain_id === myId);
  const isFull = teams.length >= tournament.max_teams;
  const deadlinePassed =
    tournament.registration_deadline && new Date(tournament.registration_deadline) < new Date();
  const registrationClosed =
    tournament.status !== 'registration' || (isFull && !myTeam) || deadlinePassed || matches.length > 0;
  const pendingTeams = teams.filter((team) => team.status === 'pending');
  const approvedTeams = teams.filter((team) => team.status === 'approved');

  async function insertTeam(name, players, extraFields = {}) {
    const { data: team, error: teamError } = await supabase
      .from('tournament_teams')
      .insert({ tournament_id: tournamentId, name, captain_id: myId, ...extraFields })
      .select('id')
      .single();
    if (teamError) return { error: teamError };
    const { error: playersError } = await supabase
      .from('tournament_team_players')
      .insert(players.map((p) => ({ team_id: team.id, riot_name: p.riotName, riot_tag: p.riotTag })));
    return { error: playersError };
  }

  // Réservé à l'admin : contrairement à l'inscription normale (une seule
  // équipe par compte, la tienne), ceci permet d'ajouter autant d'équipes
  // que nécessaire depuis un seul compte — utile pour peupler un tournoi de
  // test sans avoir besoin de plusieurs comptes réels. Statut 'approved'
  // directement : c'est l'admin qui les ajoute, pas de validation à refaire.
  async function handleAdminAddTeam(name, players) {
    setSaving(true);
    setError(null);
    const { error } = await insertTeam(name, players, { status: 'approved' });
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  async function handleRegister(name, players) {
    setSaving(true);
    setError(null);
    const { error } = await insertTeam(name, players);
    setSaving(false);
    if (error) {
      setError(error.message);
      return;
    }
    await loadAll();
  }

  async function handleUpdate(name, players) {
    setSaving(true);
    setError(null);
    const { error: updateError } = await supabase.from('tournament_teams').update({ name }).eq('id', myTeam.id);
    if (updateError) {
      setSaving(false);
      setError(updateError.message);
      return;
    }
    // Roster remplacé en entier plutôt que fusionné : plus simple et sûr —
    // pas de risque de mélanger d'anciens et de nouveaux joueurs sur les
    // mêmes lignes si l'ordre a changé.
    await supabase.from('tournament_team_players').delete().eq('team_id', myTeam.id);
    const { error: playersError } = await supabase
      .from('tournament_team_players')
      .insert(players.map((p) => ({ team_id: myTeam.id, riot_name: p.riotName, riot_tag: p.riotTag })));
    setSaving(false);
    if (playersError) {
      setError(playersError.message);
      return;
    }
    setEditing(false);
    await loadAll();
  }

  async function handleWithdraw() {
    setSaving(true);
    await supabase.from('tournament_teams').delete().eq('id', myTeam.id);
    setSaving(false);
    await loadAll();
  }

  async function handleTeamStatus(teamId, status) {
    await supabase.from('tournament_teams').update({ status }).eq('id', teamId);
    await loadAll();
  }

  async function handleGenerateBracket() {
    setSaving(true);
    const rows = generateBracketRows(
      tournamentId,
      approvedTeams.map((team) => team.id),
    );
    const { error: insertError } = await supabase.from('tournament_matches').insert(rows);
    if (!insertError) {
      await supabase.from('tournaments').update({ status: 'ongoing' }).eq('id', tournamentId);
    }
    setSaving(false);
    await loadAll();
  }

  return (
    <div className="tournament-detail">
      <button className="link-back" onClick={onBack}>
        ← {t('tournaments.back')}
      </button>

      <h1>{tournament.name}</h1>
      <span className={`tournament-status-badge ${tournament.status}`}>
        {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
      </span>
      {tournament.description && <p>{tournament.description}</p>}
      <p className="label">{t('tournaments.teamsCount', { count: teams.length, max: tournament.max_teams })}</p>

      {isAdmin && pendingTeams.length > 0 && (
        <section className="tournament-admin-approvals">
          <h2>{t('tournaments.pendingTeams')}</h2>
          <ul className="tournament-approval-list">
            {pendingTeams.map((team) => (
              <li key={team.id}>
                <span>{team.name}</span>
                <div className="tournament-team-actions">
                  <button onClick={() => handleTeamStatus(team.id, 'approved')}>{t('tournaments.approve')}</button>
                  <button className="button-danger" onClick={() => handleTeamStatus(team.id, 'rejected')}>
                    {t('tournaments.reject')}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && matches.length === 0 && (
        <section className="tournament-admin-add-team">
          <h2>{t('tournaments.adminAddTeam')}</h2>
          <TeamRosterForm
            initialName=""
            initialPlayers={EMPTY_PLAYERS}
            saving={saving}
            error={error}
            onSubmit={handleAdminAddTeam}
            submitLabel={t('tournaments.adminAddSubmit')}
          />
        </section>
      )}

      {isAdmin && matches.length === 0 && (
        <section className="tournament-admin-generate">
          <button onClick={handleGenerateBracket} disabled={saving || approvedTeams.length < 2}>
            {saving ? t('tournaments.saving') : t('tournaments.bracket.generate')}
          </button>
          {approvedTeams.length < 2 && <p className="label">{t('tournaments.bracket.needApproved')}</p>}
        </section>
      )}

      <section className="tournament-teams-list">
        <h2>{t('tournaments.registeredTeams')}</h2>
        {teams.length === 0 ? (
          <p className="label">{t('tournaments.noTeamsYet')}</p>
        ) : (
          <ul>
            {teams.map((team) => (
              <li key={team.id}>
                {team.name}
                {team.status === 'pending' && ` (${t('tournaments.pending')})`}
                {team.captain_id === myId && ` — ${t('tournaments.yourTeam')}`}
              </li>
            ))}
          </ul>
        )}
      </section>

      {matches.length > 0 ? (
        <section className="tournament-bracket-section">
          <h2>{t('tournaments.bracket.title')}</h2>
          <BracketView tournamentId={tournamentId} matches={matches} teams={teams} isAdmin={isAdmin} onUpdated={loadAll} />
        </section>
      ) : (
        <section className="tournament-registration">
          {myTeam && !editing ? (
            <>
              <h2>{t('tournaments.yourTeam')}</h2>
              <p className="tournament-card-name">{myTeam.name}</p>
              <ul>
                {myTeamPlayers.map((p) => (
                  <li key={p.id}>
                    {p.riot_name}#{p.riot_tag}
                  </li>
                ))}
              </ul>
              {!registrationClosed && (
                <div className="tournament-team-actions">
                  <button onClick={() => setEditing(true)}>{t('tournaments.editTeam')}</button>
                  <button onClick={handleWithdraw} disabled={saving} className="button-danger">
                    {t('tournaments.withdraw')}
                  </button>
                </div>
              )}
            </>
          ) : myTeam && editing ? (
            <>
              <h2>{t('tournaments.editTeam')}</h2>
              <TeamRosterForm
                initialName={myTeam.name}
                initialPlayers={
                  myTeamPlayers.length === PLAYER_COUNT
                    ? myTeamPlayers.map((p) => ({ riotName: p.riot_name, riotTag: p.riot_tag }))
                    : EMPTY_PLAYERS
                }
                saving={saving}
                error={error}
                onSubmit={handleUpdate}
                submitLabel={t('tournaments.saveChanges')}
              />
              <button onClick={() => setEditing(false)}>{t('tournaments.cancel')}</button>
            </>
          ) : registrationClosed ? (
            <p className="warning">{t('tournaments.registrationClosed')}</p>
          ) : (
            <>
              <h2>{t('tournaments.registerTeam')}</h2>
              <TeamRosterForm
                initialName=""
                initialPlayers={EMPTY_PLAYERS}
                saving={saving}
                error={error}
                onSubmit={handleRegister}
                submitLabel={t('tournaments.register')}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}

export default TournamentDetail;
