import { useMemo } from 'react';
import { groupStats, timeSlot, dayOfWeek, TIME_SLOT_ORDER, WEEK_ORDER, formStats } from '../valorantStats.js';

function renderGroupTable(title, rows) {
  return (
    <div className="card">
      <h3>{title}</h3>
      <table>
        <thead>
          <tr>
            <th></th>
            <th>Parties</th>
            <th>Winrate</th>
            <th>K/D/A moyen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key}>
              <td>{row.key}</td>
              <td>{row.games}</td>
              <td>{row.winrate === null ? '?' : `${row.winrate.toFixed(0)}%`}</td>
              <td>
                {row.avgKills.toFixed(1)}/{row.avgDeaths.toFixed(1)}/{row.avgAssists.toFixed(1)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FormTab({ settings, matches }) {
  const form = useMemo(
    () => formStats(matches, settings.name, settings.tag),
    [matches, settings.name, settings.tag],
  );

  const timeSlotStats = useMemo(
    () =>
      groupStats(matches, settings.name, settings.tag, (match) => timeSlot(match)).sort(
        (a, b) => TIME_SLOT_ORDER.indexOf(a.key) - TIME_SLOT_ORDER.indexOf(b.key),
      ),
    [matches, settings.name, settings.tag],
  );

  const dayOfWeekStats = useMemo(
    () =>
      groupStats(matches, settings.name, settings.tag, (match) => dayOfWeek(match)).sort(
        (a, b) => WEEK_ORDER.indexOf(a.key) - WEEK_ORDER.indexOf(b.key),
      ),
    [matches, settings.name, settings.tag],
  );

  if (matches.length === 0) {
    return <p>Aucun match en cache pour l'instant — clique sur "Rafraîchir".</p>;
  }

  return (
    <div>
      <div className="card">
        <h3>Forme récente</h3>
        <div className="stat-tiles">
          <div className="stat-tile">
            {form.streakType === null ? (
              <div className="value" style={{ fontSize: '1rem' }}>Pas assez de données</div>
            ) : (
              <div className={`streak-badge ${form.streakType === 'Victoire' ? 'win' : 'loss'}`}>
                {form.streakCount} {form.streakType === 'Victoire' ? '🔥' : '📉'}
              </div>
            )}
            <div className="label">Série actuelle ({form.streakType ?? '—'})</div>
          </div>
          <div className="stat-tile">
            <div className="value">{form.recentKd === null ? '?' : form.recentKd.toFixed(2)}</div>
            <div className="label">K/D sur {form.recentCount} derniers matchs</div>
          </div>
          <div className="stat-tile">
            <div className="value">{form.overallKd === null ? '?' : form.overallKd.toFixed(2)}</div>
            <div className="label">K/D moyenne générale</div>
          </div>
        </div>
      </div>

      {renderGroupTable('Stats par tranche horaire', timeSlotStats)}
      {renderGroupTable('Stats par jour de la semaine', dayOfWeekStats)}
    </div>
  );
}

export default FormTab;
