import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, ChevronDown, ChevronRight } from 'lucide-react';
import Icon from './Icon.jsx';
import { supabase } from './supabaseClient.js';
import { generateBracketRows } from './bracket.js';
import BracketView from './BracketView.jsx';
import { useAgentIcons, useAgentsData } from './agentIcons.js';
import { useMapImages } from './mapImages.js';
import { pickSplash } from './tournamentVisuals.js';
import IconPickerModal from './IconPickerModal.jsx';
import AccountPickerModal from './AccountPickerModal.jsx';
import Button from './ui/Button';
import { TournamentDetailSkeleton } from './skeletons.jsx';
import useLoadingGate from './useLoadingGate.js';

const PLAYER_COUNT = 5;
const EMPTY_PLAYERS = Array.from({ length: PLAYER_COUNT }, () => ({
  riotName: '',
  riotTag: '',
  agent: null,
  linkedProfileId: null,
}));

const STATUS_LABELS = {
  registration: 'tournaments.status.registration',
  ongoing: 'tournaments.status.ongoing',
  completed: 'tournaments.status.completed',
};

// Chaque emplacement joueur DOIT correspondre à un vrai compte MVP Tracker
// (recherché et sélectionné via AccountPickerModal), plus de Riot ID tapé
// à la main. `linked_profile_id` passe de facultatif à obligatoire (voir la
// contrainte NOT NULL posée en base) : impossible d'inscrire quelqu'un qui
// n'a pas de compte. L'agent reste, lui, purement cosmétique et optionnel.
function TeamRosterForm({ initialName, initialPlayers, saving, error, onSubmit, submitLabel }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [players, setPlayers] = useState(initialPlayers);
  const [agentPickerIndex, setAgentPickerIndex] = useState(null);
  const [accountPickerIndex, setAccountPickerIndex] = useState(null);
  const agentIcons = useAgentIcons();
  const agentsData = useAgentsData();

  function updatePlayer(index, patch) {
    setPlayers((prev) => prev.map((p, i) => (i === index ? { ...p, ...patch } : p)));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || players.some((p) => !p.linkedProfileId)) return;
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
        <div key={index} className={`team-roster-player-row ${player.linkedProfileId ? 'filled' : ''}`}>
          <Button
            variant="ghost"
            type="button"
            className="team-roster-agent-avatar"
            title={player.agent ?? t('tournaments.pickAgent')}
            onClick={() => setAgentPickerIndex(index)}
          >
            {player.agent && agentIcons.get(player.agent) ? (
              <img src={agentIcons.get(player.agent)} alt="" />
            ) : (
              <span>?</span>
            )}
          </Button>

          {player.linkedProfileId ? (
            <span className="team-roster-linked-account">
              {player.riotName}#{player.riotTag}
            </span>
          ) : (
            <span className="team-roster-linked-account placeholder">{t('tournaments.noAccountChosen')}</span>
          )}
          <Button variant="ghost" type="button" onClick={() => setAccountPickerIndex(index)}>
            {player.linkedProfileId ? t('tournaments.change') : t('tournaments.pickAccount')}
          </Button>
        </div>
      ))}

      {agentPickerIndex !== null && (
        <IconPickerModal
          title={t('tournaments.pickAgent')}
          items={agentsData.map((agent) => ({ id: agent.displayName, label: agent.displayName, icon: agent.displayIcon }))}
          onSelect={(agentName) => {
            updatePlayer(agentPickerIndex, { agent: agentName });
            setAgentPickerIndex(null);
          }}
          onClose={() => setAgentPickerIndex(null)}
        />
      )}

      {accountPickerIndex !== null && (
        <AccountPickerModal
          onSelect={(profile) => {
            updatePlayer(accountPickerIndex, {
              riotName: profile.riot_name,
              riotTag: profile.riot_tag,
              linkedProfileId: profile.id,
            });
            setAccountPickerIndex(null);
          }}
          onClose={() => setAccountPickerIndex(null)}
        />
      )}

      {error && <p className="error-banner">{error}</p>}

      <Button
        variant="primary"
        type="submit"
        loading={saving}
        loadingLabel={t('tournaments.saving')}
        disabled={saving || players.some((p) => !p.linkedProfileId)}
      >
        {submitLabel}
      </Button>
    </form>
  );
}

// Détail d'un tournoi : inscription d'équipe, validation admin des
// inscriptions, génération et affichage du bracket. Toute la sécurité réelle
// est côté RLS (voir les policies sur tournament_teams/tournament_matches) :
// ce composant se contente de ne PAS proposer les actions interdites, même
// en cas de requête forcée, Supabase refuse.
function TournamentDetail({ tournamentId, myId, isAdmin, onBack }) {
  const { t } = useTranslation();
  const agentIcons = useAgentIcons();
  const mapImages = useMapImages();
  const [tournament, setTournament] = useState(null);
  const [teams, setTeams] = useState([]);
  const [matches, setMatches] = useState([]);
  const [myTeamPlayers, setMyTeamPlayers] = useState([]);
  const [playersByTeam, setPlayersByTeam] = useState(new Map());
  const [expandedTeamId, setExpandedTeamId] = useState(null);
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
        .select('id, riot_name, riot_tag, agent, linked_profile_id')
        .eq('team_id', myTeam.id);
      setMyTeamPlayers(players ?? []);
    } else {
      setMyTeamPlayers([]);
    }

    // Chargés en une seule requête pour toutes les équipes plutôt qu'à la
    // demande par clic, évite un aller-retour à chaque ouverture/fermeture,
    // et le nombre d'équipes reste toujours modeste (borné par max_teams).
    const teamIds = (t2 ?? []).map((team) => team.id);
    if (teamIds.length > 0) {
      const { data: allPlayers } = await supabase
        .from('tournament_team_players')
        .select('id, team_id, riot_name, riot_tag, agent, linked_profile_id')
        .in('team_id', teamIds);
      const grouped = new Map();
      for (const player of allPlayers ?? []) {
        if (!grouped.has(player.team_id)) grouped.set(player.team_id, []);
        grouped.get(player.team_id).push(player);
      }
      setPlayersByTeam(grouped);
    } else {
      setPlayersByTeam(new Map());
    }

    setLoading(false);
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tournamentId]);

  const loadingGate = useLoadingGate(loading);

  if (loadingGate.busy) return loadingGate.show ? <TournamentDetailSkeleton /> : null;
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
      .insert(
        players.map((p) => ({
          team_id: team.id,
          riot_name: p.riotName,
          riot_tag: p.riotTag,
          agent: p.agent,
          linked_profile_id: p.linkedProfileId,
        })),
      );
    return { error: playersError };
  }

  // Réservé à l'admin : contrairement à l'inscription normale (une seule
  // équipe par compte, la tienne), ceci permet d'ajouter autant d'équipes
  // que nécessaire depuis un seul compte, utile pour peupler un tournoi de
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
    // Roster remplacé en entier plutôt que fusionné : plus simple et sûr,
    // pas de risque de mélanger d'anciens et de nouveaux joueurs sur les
    // mêmes lignes si l'ordre a changé.
    await supabase.from('tournament_team_players').delete().eq('team_id', myTeam.id);
    const { error: playersError } = await supabase
      .from('tournament_team_players')
      .insert(
        players.map((p) => ({
          team_id: myTeam.id,
          riot_name: p.riotName,
          riot_tag: p.riotTag,
          agent: p.agent,
          linked_profile_id: p.linkedProfileId,
        })),
      );
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

  // Réservé à l'admin, et seulement avant que le bracket existe, retirer
  // une équipe déjà placée dans l'arbre laisserait un match pointer vers une
  // équipe qui n'existe plus. La suppression cascade sur ses joueurs
  // (contrainte on delete cascade côté table).
  async function handleAdminRemoveTeam(teamId) {
    setSaving(true);
    await supabase.from('tournament_teams').delete().eq('id', teamId);
    setSaving(false);
    setExpandedTeamId(null);
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

  const splash = pickSplash(tournamentId, mapImages);
  const fillPercent = Math.min(100, Math.round((teams.length / tournament.max_teams) * 100));

  return (
    <div className="tournament-detail">
      <Button variant="ghost" className="link-back" onClick={onBack}>
        <Icon icon={ArrowLeft} size={16} /> {t('tournaments.back')}
      </Button>

      <div className="tournament-hero" style={splash ? { backgroundImage: `url(${splash})` } : undefined}>
        <span className={`tournament-status-badge ${tournament.status}`}>
          {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
        </span>
        <div className="tournament-hero-content">
          <h1>{tournament.name}</h1>
          {tournament.description && <p className="tournament-hero-description">{tournament.description}</p>}
          <div className="tournament-hero-progress">
            <div className="tournament-hero-progress-bar">
              <div className="tournament-hero-progress-fill" style={{ width: `${fillPercent}%` }} />
            </div>
            <span className="label">{t('tournaments.teamsCount', { count: teams.length, max: tournament.max_teams })}</span>
          </div>
        </div>
      </div>

      {isAdmin && pendingTeams.length > 0 && (
        <section className="tournament-admin-approvals admin-panel">
          <h2>{t('tournaments.pendingTeams')}</h2>
          <ul className="tournament-approval-list">
            {pendingTeams.map((team) => (
              <li key={team.id}>
                <span>{team.name}</span>
                <div className="tournament-team-actions">
                  <Button variant="primary" onClick={() => handleTeamStatus(team.id, 'approved')}>{t('tournaments.approve')}</Button>
                  <Button variant="danger" className="button-danger" onClick={() => handleTeamStatus(team.id, 'rejected')}>
                    {t('tournaments.reject')}
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {isAdmin && matches.length === 0 && (
        <section className="tournament-admin-add-team admin-panel">
          <h2>{t('tournaments.adminAddTeam')}</h2>
          {isFull ? (
            <p className="label">{t('tournaments.full')}</p>
          ) : (
            <TeamRosterForm
              initialName=""
              initialPlayers={EMPTY_PLAYERS}
              saving={saving}
              error={error}
              onSubmit={handleAdminAddTeam}
              submitLabel={t('tournaments.adminAddSubmit')}
            />
          )}
        </section>
      )}

      {isAdmin && matches.length === 0 && (
        <section className="tournament-admin-generate admin-panel">
          <Button
            variant="primary"
            className={`generate-bracket-button ${approvedTeams.length >= 2 ? 'ready' : ''}`}
            onClick={handleGenerateBracket}
            loading={saving}
            loadingLabel={t('tournaments.saving')}
            disabled={saving || approvedTeams.length < 2}
          >
            {t('tournaments.bracket.generate')}
          </Button>
          {approvedTeams.length < 2 && <p className="label">{t('tournaments.bracket.needApproved')}</p>}
        </section>
      )}

      <div className={matches.length > 0 ? 'tournament-columns' : undefined}>
      <section className="tournament-teams-list">
        <h2>{t('tournaments.registeredTeams')}</h2>
        {teams.length === 0 ? (
          <p className="label">{t('tournaments.noTeamsYet')}</p>
        ) : (
          <ul className="tournament-team-grid">
            {teams.map((team, index) => {
              const expanded = expandedTeamId === team.id;
              const players = playersByTeam.get(team.id) ?? [];
              return (
                <li
                  key={team.id}
                  className={`tournament-team-card status-${team.status} ${expanded ? 'expanded' : ''}`}
                  style={{ '--i': index }}
                >
                  <Button
                    variant="ghost"
                    type="button"
                    className={isAdmin ? 'clickable' : ''}
                    onClick={isAdmin ? () => setExpandedTeamId(expanded ? null : team.id) : undefined}
                    disabled={!isAdmin}
                  >
                    <div className="tournament-team-card-head">
                      <span className="tournament-team-card-name">{team.name}</span>
                      {isAdmin && <span className="tournament-team-row-chevron"><Icon icon={expanded ? ChevronDown : ChevronRight} size={16} /></span>}
                    </div>
                    <div className="tournament-team-card-tags">
                      {team.status === 'pending' && <span className="label tag-pending">{t('tournaments.pending')}</span>}
                      {team.captain_id === myId && <span className="label tag-mine">{t('tournaments.yourTeam')}</span>}
                    </div>
                    {/* Aperçu de composition : les icônes d'agent choisies pour
                        chaque joueur, visibles sans avoir à déplier · un
                        emplacement vide (agent pas choisi) reste un "?". */}
                    <div className="tournament-team-composition">
                      {Array.from({ length: PLAYER_COUNT }).map((_, slot) => {
                        const player = players[slot];
                        const icon = player?.agent ? agentIcons.get(player.agent) : null;
                        return (
                          <span key={slot} className="team-roster-agent-avatar small">
                            {icon ? <img src={icon} alt="" /> : <span>?</span>}
                          </span>
                        );
                      })}
                    </div>
                  </Button>

                  {isAdmin && expanded && (
                    <div className="tournament-team-expanded">
                      <ul className="team-roster-display">
                        {players.map((p) => (
                          <li key={p.id}>
                            <span className="team-roster-agent-avatar small">
                              {p.agent && agentIcons.get(p.agent) ? (
                                <img src={agentIcons.get(p.agent)} alt="" />
                              ) : (
                                <span>?</span>
                              )}
                            </span>
                            {p.riot_name}#{p.riot_tag}
                          </li>
                        ))}
                      </ul>
                      {matches.length === 0 && (
                        <Button variant="danger" className="button-danger" loading={saving} onClick={() => handleAdminRemoveTeam(team.id)}>
                          {t('tournaments.removeTeam')}
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
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
              <ul className="team-roster-display">
                {myTeamPlayers.map((p) => (
                  <li key={p.id}>
                    <span className="team-roster-agent-avatar small">
                      {p.agent && agentIcons.get(p.agent) ? <img src={agentIcons.get(p.agent)} alt="" /> : <span>?</span>}
                    </span>
                    {p.riot_name}#{p.riot_tag}
                  </li>
                ))}
              </ul>
              {!registrationClosed && (
                <div className="tournament-team-actions">
                  <Button variant="primary" onClick={() => setEditing(true)}>{t('tournaments.editTeam')}</Button>
                  <Button variant="danger" onClick={handleWithdraw} loading={saving} className="button-danger">
                    {t('tournaments.withdraw')}
                  </Button>
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
                    ? myTeamPlayers.map((p) => ({
                        riotName: p.riot_name,
                        riotTag: p.riot_tag,
                        agent: p.agent,
                        linkedProfileId: p.linked_profile_id,
                      }))
                    : EMPTY_PLAYERS
                }
                saving={saving}
                error={error}
                onSubmit={handleUpdate}
                submitLabel={t('tournaments.saveChanges')}
              />
              <Button variant="ghost" onClick={() => setEditing(false)}>{t('tournaments.cancel')}</Button>
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
    </div>
  );
}

export default TournamentDetail;
