import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { app } from 'electron';

const db = new DatabaseSync(path.join(app.getPath('userData'), 'matches.db'));

db.exec(`
  CREATE TABLE IF NOT EXISTS matches (
    match_id TEXT PRIMARY KEY,
    puuid TEXT NOT NULL,
    game_start INTEGER,
    data TEXT NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS ping_samples (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp INTEGER NOT NULL,
    latency_ms INTEGER
  )
`);

export function saveMatches(puuid, matches) {
  const insert = db.prepare(
    'INSERT OR IGNORE INTO matches (match_id, puuid, game_start, data) VALUES (?, ?, ?, ?)',
  );
  for (const match of matches) {
    insert.run(match.metadata.matchid, puuid, match.metadata.game_start, JSON.stringify(match));
  }
}

export function getCachedMatches(puuid) {
  const rows = db
    .prepare('SELECT data FROM matches WHERE puuid = ? ORDER BY game_start DESC')
    .all(puuid);
  return rows.map((row) => JSON.parse(row.data));
}

export function savePingSample(latencyMs) {
  db.prepare('INSERT INTO ping_samples (timestamp, latency_ms) VALUES (?, ?)').run(
    Date.now(),
    latencyMs,
  );
}

export function getAllPingSamples() {
  return db.prepare('SELECT timestamp, latency_ms FROM ping_samples ORDER BY timestamp ASC').all();
}
