import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from './supabaseClient.js';

// Écran d'administration — pour l'instant seulement la création de tournois
// (étape validée avec l'utilisateur avant d'enchaîner sur l'inscription
// d'équipes et l'affichage du bracket). Toute la vraie sécurité vient des
// policies RLS côté Supabase (public.is_admin()) : ce composant n'est
// accessible que si `isAdmin` est vrai côté App.jsx, mais même un accès
// direct forcé ne permettrait aucune écriture — la porte fermée est serveur.

const STATUS_LABELS = {
  registration: 'admin.tournaments.status.registration',
  ongoing: 'admin.tournaments.status.ongoing',
  completed: 'admin.tournaments.status.completed',
};

function TournamentCreateForm({ myId, onCreated }) {
  const { t } = useTranslation();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [maxTeams, setMaxTeams] = useState(8);
  const [registrationDeadline, setRegistrationDeadline] = useState('');
  const [startDate, setStartDate] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!name.trim() || maxTeams < 2) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('tournaments').insert({
      name: name.trim(),
      description: description.trim() || null,
      max_teams: maxTeams,
      registration_deadline: registrationDeadline || null,
      start_date: startDate || null,
      created_by: myId,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setName('');
    setDescription('');
    setMaxTeams(8);
    setRegistrationDeadline('');
    setStartDate('');
    onCreated();
  }

  return (
    <form className="tournament-create-form" onSubmit={handleSubmit}>
      <h2>{t('admin.tournaments.createTitle')}</h2>

      <label>
        {t('admin.tournaments.name')}
        <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} />
      </label>

      <label>
        {t('admin.tournaments.description')}
        <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} />
      </label>

      <label>
        {t('admin.tournaments.maxTeams')}
        <input
          type="number"
          min={2}
          max={128}
          value={maxTeams}
          onChange={(e) => setMaxTeams(Number(e.target.value))}
          required
        />
      </label>
      {/* Pas limité aux puissances de 2 : la génération du bracket (étape
          suivante) calculera les "byes" nécessaires pour les autres nombres. */}
      <p className="label">{t('admin.tournaments.maxTeamsHint')}</p>

      <label>
        {t('admin.tournaments.registrationDeadline')}
        <input
          type="datetime-local"
          value={registrationDeadline}
          onChange={(e) => setRegistrationDeadline(e.target.value)}
        />
      </label>

      <label>
        {t('admin.tournaments.startDate')}
        <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
      </label>

      {error && <p className="error-banner">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? t('admin.tournaments.creating') : t('admin.tournaments.create')}
      </button>
    </form>
  );
}

function TournamentList({ tournaments }) {
  const { t } = useTranslation();

  if (tournaments.length === 0) {
    return <p className="label">{t('admin.tournaments.empty')}</p>;
  }

  return (
    <ul className="tournament-admin-list">
      {tournaments.map((tournament) => (
        <li key={tournament.id} className="tournament-admin-item">
          <span className="tournament-admin-name">{tournament.name}</span>
          <span className={`tournament-status-badge ${tournament.status}`}>
            {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
          </span>
          <span className="label">{tournament.max_teams} {t('admin.tournaments.teamsUnit')}</span>
        </li>
      ))}
    </ul>
  );
}

function AdminPage({ myId }) {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);

  async function loadTournaments() {
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, name, status, max_teams')
      .order('created_at', { ascending: false });
    if (!error) setTournaments(data ?? []);
    setLoading(false);
  }

  useEffect(() => {
    loadTournaments();
  }, []);

  return (
    <div className="admin-page">
      <h1>{t('admin.title')}</h1>

      <section className="admin-section">
        <TournamentCreateForm myId={myId} onCreated={loadTournaments} />
      </section>

      <section className="admin-section">
        <h2>{t('admin.tournaments.listTitle')}</h2>
        {loading ? <p className="label">{t('admin.tournaments.loading')}</p> : <TournamentList tournaments={tournaments} />}
      </section>
    </div>
  );
}

export default AdminPage;
