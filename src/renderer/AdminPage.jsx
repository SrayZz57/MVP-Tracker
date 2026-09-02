import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import Button from './ui/Button';
import CollapsibleCard from './CollapsibleCard.jsx';
import { AdminTournamentsSkeleton } from './skeletons.jsx';
import LoadingGate from './LoadingGate.jsx';
import Icon from './Icon.jsx';

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

      <Button variant="primary" type="submit" loading={saving} loadingLabel={t('admin.tournaments.creating')}>
        {t('admin.tournaments.create')}
      </Button>
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

      <CollapsibleCard
        id="admin.tournamentCreate"
        title={t('admin.tournaments.createTitle')}
        className="admin-section"
      >
        <TournamentCreateForm myId={myId} onCreated={loadTournaments} />
      </CollapsibleCard>

      <CollapsibleCard id="admin.tournamentList" title={t('admin.tournaments.listTitle')} className="admin-section">
        <LoadingGate active={loading} fallback={<AdminTournamentsSkeleton />}>
          <TournamentList tournaments={tournaments} />
        </LoadingGate>
      </CollapsibleCard>

      <CollapsibleCard
        id="admin.announcementCreate"
        title={t('admin.announcements.createTitle')}
        className="admin-section"
      >
        <AnnouncementCreateForm myId={myId} onCreated={loadAnnouncements} />
      </CollapsibleCard>

      <CollapsibleCard id="admin.announcementList" title={t('admin.announcements.listTitle')} className="admin-section">
        {announcementsLoading ? (
          <p className="label">{t('admin.announcements.loading')}</p>
        ) : (
          <AnnouncementList announcements={announcements} onChanged={loadAnnouncements} />
        )}
      </CollapsibleCard>
    </div>
  );
}

export default AdminPage;
