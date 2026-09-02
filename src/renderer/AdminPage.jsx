import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2, Eye, EyeOff } from 'lucide-react';
import { supabase } from './supabaseClient.js';
import Badge from './ui/Badge';
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
    <form className="admin-form" onSubmit={handleSubmit}>
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
        <span className="admin-form-hint">{t('admin.tournaments.maxTeamsHint')}</span>
      </label>

      <div className="admin-form-row">
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
      </div>

      {error && <p className="error-banner">{error}</p>}

      <div className="admin-form-actions">
        <Button variant="primary" type="submit" loading={saving} loadingLabel={t('admin.tournaments.creating')}>
          {t('admin.tournaments.create')}
        </Button>
      </div>
    </form>
  );
}

function TournamentList({ tournaments }) {
  const { t } = useTranslation();

  if (tournaments.length === 0) {
    return <p className="admin-empty">{t('admin.tournaments.empty')}</p>;
  }

  return (
    <ul className="admin-list">
      {tournaments.map((tournament) => (
        <li key={tournament.id} className="admin-item">
          <div className="admin-item-main">
            <span className="admin-item-name">{tournament.name}</span>
            <span className="admin-item-meta">
              {tournament.max_teams} {t('admin.tournaments.teamsUnit')}
            </span>
          </div>
          <span className={`tournament-status-badge ${tournament.status}`}>
            {t(STATUS_LABELS[tournament.status] ?? tournament.status)}
          </span>
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
    <form className="admin-form" onSubmit={handleSubmit}>
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
        <span className="admin-form-hint">{t('admin.announcements.imageUrlHint')}</span>
      </label>

      {error && <p className="error-banner">{error}</p>}

      <div className="admin-form-actions">
        <Button variant="primary" type="submit" loading={saving} loadingLabel={t('admin.announcements.publishing')}>
          {t('admin.announcements.publish')}
        </Button>
      </div>
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
    return <p className="admin-empty">{t('admin.announcements.empty')}</p>;
  }

  return (
    <ul className="admin-list">
      {announcements.map((announcement) => {
        const toggleLabel = t(
          announcement.is_active ? 'admin.announcements.deactivate' : 'admin.announcements.activate',
        );
        return (
          <li key={announcement.id} className="admin-item">
            <div className="admin-item-main">
              <span className="admin-item-name">{announcement.title}</span>
            </div>
            <span className={`tournament-status-badge ${announcement.is_active ? 'ongoing' : 'completed'}`}>
              {t(announcement.is_active ? 'admin.announcements.active' : 'admin.announcements.inactive')}
            </span>
            <div className="admin-item-actions">
              <Button
                variant="icon"
                type="button"
                title={toggleLabel}
                aria-label={toggleLabel}
                onClick={() => toggleActive(announcement)}
              >
                <Icon icon={announcement.is_active ? EyeOff : Eye} size={16} />
              </Button>
              <Button
                variant="icon"
                type="button"
                className="admin-item-delete"
                title={t('admin.announcements.delete')}
                aria-label={t('admin.announcements.delete')}
                onClick={() => remove(announcement.id)}
              >
                <Icon icon={Trash2} size={16} />
              </Button>
            </div>
          </li>
        );
      })}
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
      <div className="admin-columns">
        <CollapsibleCard id="admin.tournamentCreate" title={t('admin.tournaments.createTitle')}>
          <TournamentCreateForm myId={myId} onCreated={loadTournaments} />
        </CollapsibleCard>

        <CollapsibleCard
          id="admin.tournamentList"
          title={t('admin.tournaments.listTitle')}
          headerExtra={loading ? null : <Badge>{tournaments.length}</Badge>}
        >
          <LoadingGate active={loading} fallback={<AdminTournamentsSkeleton />}>
            <TournamentList tournaments={tournaments} />
          </LoadingGate>
        </CollapsibleCard>
      </div>

      <div className="admin-columns">
        <CollapsibleCard id="admin.announcementCreate" title={t('admin.announcements.createTitle')}>
          <AnnouncementCreateForm myId={myId} onCreated={loadAnnouncements} />
        </CollapsibleCard>

        <CollapsibleCard
          id="admin.announcementList"
          title={t('admin.announcements.listTitle')}
          headerExtra={announcementsLoading ? null : <Badge>{announcements.length}</Badge>}
        >
          <LoadingGate active={announcementsLoading} fallback={<AdminTournamentsSkeleton />}>
            <AnnouncementList announcements={announcements} onChanged={loadAnnouncements} />
          </LoadingGate>
        </CollapsibleCard>
      </div>
    </div>
  );
}

export default AdminPage;
