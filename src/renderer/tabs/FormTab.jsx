import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  groupStats,
  excludeDeathmatch,
  timeSlot,
  dayOfWeek,
  dayLabelKey,
  resultLabelKey,
  TIME_SLOT_ORDER,
  WEEK_ORDER,
  formStats,
} from '../valorantStats.js';
import LoadingState from '../LoadingState.jsx';
import PlatformFilterToggle from '../PlatformFilterToggle.jsx';
import usePlatformFilter from '../usePlatformFilter.js';

const WEEKDAY_ICONS = {
  Lundi: '📅', Mardi: '📅', Mercredi: '📅', Jeudi: '📅', Vendredi: '📅', Samedi: '🎉', Dimanche: '🎉',
};

function timeSlotIcon(key) {
  const hour = parseInt(key, 10);
  if (hour >= 6 && hour < 12) return '🌅';
  if (hour >= 12 && hour < 18) return '☀️';
  if (hour >= 18 && hour < 24) return '🌆';
  return '🌙';
}

// Fonction utilitaire (pas un composant) : reçoit `t` et une fonction de
// traduction de la clé de ligne (les jours sont en français en interne).
function renderStatBars(t, title, rows, icon, rowIcon, rowLabel) {
  return (
    <div className="card">
      <h3>{icon} {title}</h3>
      {rows.length === 0 ? (
        <p>{t('form.noDataYet')}</p>
      ) : (
        rows.map((row) => (
          <div key={row.key} className="stat-bar-row">
            <span className="stat-bar-label">
              {rowIcon ? rowIcon(row.key) : ''} {rowLabel ? rowLabel(row.key) : row.key}
            </span>
            <span className="stat-bar-track">
              <span
                className={`stat-bar-fill ${row.winrate === null ? '' : row.winrate >= 50 ? 'good' : 'bad'}`}
                style={{ width: `${row.winrate ?? 4}%` }}
              />
            </span>
            <span className="stat-bar-value">{row.winrate === null ? '?' : `${row.winrate.toFixed(0)}%`}</span>
            <span className="stat-bar-meta">
              {t('form.gamesCount', { count: row.games })} — K/D/A {row.avgKills.toFixed(1)}/{row.avgDeaths.toFixed(1)}/{row.avgAssists.toFixed(1)}
            </span>
          </div>
        ))
      )}
    </div>
  );
}

function bestEntry(rows) {
  const withEnoughGames = rows.filter((row) => row.games >= 2 && row.winrate !== null);
  if (withEnoughGames.length === 0) return null;
  return withEnoughGames.reduce((best, row) => (row.winrate > best.winrate ? row : best));
}

function FormTab({ settings, matches, loading }) {
  const { t } = useTranslation();
  const { platforms, platform, setPlatform, filteredMatches } = usePlatformFilter(matches);

  const form = useMemo(
    () => formStats(excludeDeathmatch(filteredMatches), settings.name, settings.tag),
    [filteredMatches, settings.name, settings.tag],
  );

  const timeSlotStats = useMemo(
    () =>
      groupStats(excludeDeathmatch(filteredMatches), settings.name, settings.tag, (match) => timeSlot(match)).sort(
        (a, b) => TIME_SLOT_ORDER.indexOf(a.key) - TIME_SLOT_ORDER.indexOf(b.key),
      ),
    [filteredMatches, settings.name, settings.tag],
  );

  const dayOfWeekStats = useMemo(
    () =>
      groupStats(excludeDeathmatch(filteredMatches), settings.name, settings.tag, (match) => dayOfWeek(match)).sort(
        (a, b) => WEEK_ORDER.indexOf(a.key) - WEEK_ORDER.indexOf(b.key),
      ),
    [filteredMatches, settings.name, settings.tag],
  );

  const bestTimeSlot = useMemo(() => bestEntry(timeSlotStats), [timeSlotStats]);
  const bestDay = useMemo(() => bestEntry(dayOfWeekStats), [dayOfWeekStats]);

  if (matches.length === 0) {
    if (loading) return <LoadingState />;
    return <p>{t('stats.noMatchesYet')}</p>;
  }

  const streakTypeLabel = form.streakType ? t(resultLabelKey(form.streakType)) : t('form.noStreak');
  const dayLabel = (key) => (dayLabelKey(key) ? t(dayLabelKey(key)) : key);

  return (
    <div>
      <PlatformFilterToggle platforms={platforms} platform={platform} onChange={setPlatform} />

      <div className="card">
        <h3>{t('form.recentForm')}</h3>
        <div className="stat-tiles">
          <div className="stat-tile">
            {form.streakType === null ? (
              <div className="value" style={{ fontSize: '1rem' }}>{t('form.notEnoughData')}</div>
            ) : (
              <div className={`streak-badge ${form.streakType === 'Victoire' ? 'win' : 'loss'}`}>
                {form.streakCount} {form.streakType === 'Victoire' ? '🔥' : '📉'}
              </div>
            )}
            <div className="label">{t('form.currentStreak', { type: streakTypeLabel })}</div>
          </div>
          <div className="stat-tile">
            <div className="value">{form.recentKd === null ? '?' : form.recentKd.toFixed(2)}</div>
            <div className="label">{t('form.kdRecent', { count: form.recentCount })}</div>
          </div>
          <div className="stat-tile">
            <div className="value">{form.overallKd === null ? '?' : form.overallKd.toFixed(2)}</div>
            <div className="label">{t('form.kdOverall')}</div>
          </div>
        </div>
      </div>

      {(bestTimeSlot || bestDay) && (
        <div className="card highlight-card">
          <h3>{t('form.bestTimeToPlay')}</h3>
          <div className="stat-tiles">
            {bestTimeSlot && (
              <div className="stat-tile">
                <div className="value">{timeSlotIcon(bestTimeSlot.key)} {bestTimeSlot.key}</div>
                <div className="label">
                  {t('form.winratePlays', { percent: bestTimeSlot.winrate.toFixed(0), count: bestTimeSlot.games })}
                </div>
              </div>
            )}
            {bestDay && (
              <div className="stat-tile">
                <div className="value">{WEEKDAY_ICONS[bestDay.key]} {dayLabel(bestDay.key)}</div>
                <div className="label">
                  {t('form.winratePlays', { percent: bestDay.winrate.toFixed(0), count: bestDay.games })}
                </div>
              </div>
            )}
          </div>
          <p className="label" style={{ marginTop: '0.5rem' }}>
            {t('form.bestMomentHint')}
          </p>
        </div>
      )}

      {renderStatBars(t, t('form.statsByTimeSlot'), timeSlotStats, '🕐', timeSlotIcon)}
      {renderStatBars(t, t('form.statsByWeekday'), dayOfWeekStats, '📅', (key) => WEEKDAY_ICONS[key], dayLabel)}
    </div>
  );
}

export default FormTab;
