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

db.exec(`
  CREATE TABLE IF NOT EXISTS crosshairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    color TEXT,
    image TEXT,
    created_at INTEGER NOT NULL
  )
`);

// Migration légère pour les bases déjà créées avant l'ajout de ces colonnes.
try {
  db.exec('ALTER TABLE crosshairs ADD COLUMN color TEXT');
} catch {
  // colonne déjà présente
}
try {
  db.exec('ALTER TABLE crosshairs ADD COLUMN image TEXT');
} catch {
  // colonne déjà présente
}

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

export function saveCrosshair(name, code, color, image) {
  db.prepare(
    'INSERT INTO crosshairs (name, code, color, image, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(name, code, color || null, image || null, Date.now());
}

export function getCrosshairs() {
  return db
    .prepare('SELECT id, name, code, color, image FROM crosshairs ORDER BY created_at DESC')
    .all();
}

export function deleteCrosshair(id) {
  db.prepare('DELETE FROM crosshairs WHERE id = ?').run(id);
}
