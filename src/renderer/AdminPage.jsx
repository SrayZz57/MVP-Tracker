import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import Icon from './Icon.jsx';

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

// Annonces affichées sur l'écran "Content de te revoir" (AccountGreeting.jsx)
// — ex. annoncer un tournoi. Pas d'upload d'image : le bug Storage/RLS
// documenté ailleurs dans le projet (matchSync.js) rendrait un nouvel upload
// probablement tout aussi cassé. L'admin colle une URL d'image externe
// (Discord CDN, Imgur...) à la place.
function AnnouncementCreateForm({ myId, onCreated }) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);

    const { error: insertError } = await supabase.from('announcements').insert({
      title: title.trim(),
      body: body.trim(),
      image_url: imageUrl.trim() || null,
      created_by: myId,
    });

    setSaving(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }

    setTitle('');
    setBody('');
    setImageUrl('');
    onCreated();
  }

  return (
    <form className="tournament-create-form" onSubmit={handleSubmit}>
      <h2>{t('admin.announcements.createTitle')}</h2>

      <label>
        {t('admin.announcements.titleLabel')}
        <input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={80} />
      </label>

      <label>
        {t('admin.announcements.bodyLabel')}
        <textarea value={body} onChange={(e) => setBody(e.target.value)} rows={3} maxLength={500} required />
      </label>

      <label>
        {t('admin.announcements.imageUrlLabel')}
        <input
          type="url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </label>
      <p className="label">{t('admin.announcements.imageUrlHint')}</p>

      {error && <p className="error-banner">{error}</p>}

      <button type="submit" disabled={saving}>
        {saving ? t('admin.announcements.publishing') : t('admin.announcements.publish')}
      </button>
    </form>
  );
}

function AnnouncementList({ announcements, onChanged }) {
  const { t } = useTranslation();

  async function toggleActive(announcement) {
    await supabase.from('announcements').update({ is_active: !announcement.is_active }).eq('id', announcement.id);
    onChanged();
  }

  async function remove(id) {
    await supabase.from('announcements').delete().eq('id', id);
    onChanged();
  }

  if (announcements.length === 0) {
    return <p className="label">{t('admin.announcements.empty')}</p>;
  }

  return (
    <ul className="tournament-admin-list">
      {announcements.map((announcement) => (
        <li key={announcement.id} className="tournament-admin-item">
          <span className="tournament-admin-name">{announcement.title}</span>
          <span className={`tournament-status-badge ${announcement.is_active ? 'ongoing' : ''}`}>
            {t(announcement.is_active ? 'admin.announcements.active' : 'admin.announcements.inactive')}
          </span>
          <button
            type="button"
            className="strategy-tool icon-only"
            title={t(announcement.is_active ? 'admin.announcements.deactivate' : 'admin.announcements.activate')}
            onClick={() => toggleActive(announcement)}
          >
            <Icon icon={announcement.is_active ? EyeOff : Eye} size={16} />
          </button>
          <button
            type="button"
            className="strategy-tool icon-only danger"
            title={t('admin.announcements.delete')}
            onClick={() => remove(announcement.id)}
          >
            <Icon icon={Trash2} size={16} />
          </button>
        </li>
      ))}
    </ul>
  );
}

function AdminPage({ myId }) {
  const { t } = useTranslation();
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementsLoading, setAnnouncementsLoading] = useState(true);

  async function loadTournaments() {
    const { data, error } = await supabase
      .from('tournaments')
      .select('id, name, status, max_teams')
      .order('created_at', { ascending: false });
    if (!error) setTournaments(data ?? []);
    setLoading(false);
  }

  async function loadAnnouncements() {
    const { data, error } = await supabase
      .from('announcements')
      .select('id, title, is_active')
      .order('created_at', { ascending: false });
    if (!error) setAnnouncements(data ?? []);
    setAnnouncementsLoading(false);
  }

  useEffect(() => {
    loadTournaments();
    loadAnnouncements();
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

      <section className="admin-section">
        <AnnouncementCreateForm myId={myId} onCreated={loadAnnouncements} />
      </section>

      <section className="admin-section">
        <h2>{t('admin.announcements.listTitle')}</h2>
        {announcementsLoading ? (
          <p className="label">{t('admin.announcements.loading')}</p>
        ) : (
          <AnnouncementList announcements={announcements} onChanged={loadAnnouncements} />
        )}
      </section>
    </div>
  );
}

export default AdminPage;
