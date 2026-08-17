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
  CREATE TABLE IF NOT EXISTS strategies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    map TEXT NOT NULL,
    canvas_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
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

db.exec(`
  CREATE TABLE IF NOT EXISTS bets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    threshold REAL,
    baseline_match_id TEXT,
    status TEXT NOT NULL DEFAULT 'pending',
    resolved_match_id TEXT,
    actual_value REAL,
    won INTEGER,
    points INTEGER,
    created_at INTEGER NOT NULL,
    resolved_at INTEGER
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS match_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    match_id TEXT NOT NULL UNIQUE,
    date TEXT NOT NULL,
    map TEXT,
    answers_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_narratives (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    week_start TEXT NOT NULL UNIQUE,
    recap_json TEXT NOT NULL,
    rank_json TEXT,
    narrative_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS puzzles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    date TEXT NOT NULL UNIQUE,
    situation_json TEXT NOT NULL,
    choice TEXT,
    correct INTEGER,
    created_at INTEGER NOT NULL,
    answered_at INTEGER
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

export function saveStrategy(name, map, canvasJson) {
  db.prepare(
    'INSERT INTO strategies (name, map, canvas_json, created_at) VALUES (?, ?, ?, ?)',
  ).run(name, map, canvasJson, Date.now());
}

export function getStrategiesForMap(map) {
  return db
    .prepare('SELECT id, name, map, canvas_json, created_at FROM strategies WHERE map = ? ORDER BY created_at DESC')
    .all(map);
}

export function deleteStrategy(id) {
  db.prepare('DELETE FROM strategies WHERE id = ?').run(id);
}

export function getPendingBet() {
  return db.prepare("SELECT * FROM bets WHERE status = 'pending' ORDER BY created_at DESC LIMIT 1").get() ?? null;
}

export function createBet(type, threshold, baselineMatchId) {
  db.prepare(
    "INSERT INTO bets (type, threshold, baseline_match_id, status, created_at) VALUES (?, ?, ?, 'pending', ?)",
  ).run(type, threshold ?? null, baselineMatchId ?? null, Date.now());
  return getPendingBet();
}

export function cancelBet(id) {
  db.prepare("DELETE FROM bets WHERE id = ? AND status = 'pending'").run(id);
}

export function resolveBet(id, resolvedMatchId, actualValue, won, points) {
  db.prepare(
    "UPDATE bets SET status = 'resolved', resolved_match_id = ?, actual_value = ?, won = ?, points = ?, resolved_at = ? WHERE id = ?",
  ).run(resolvedMatchId, actualValue, won ? 1 : 0, points, Date.now(), id);
  return db.prepare('SELECT * FROM bets WHERE id = ?').get(id);
}

export function getBetHistory(limit) {
  return db.prepare("SELECT * FROM bets WHERE status = 'resolved' ORDER BY resolved_at DESC LIMIT ?").all(limit);
}

export function getTotalBetPoints() {
  const row = db.prepare("SELECT COALESCE(SUM(points), 0) as total FROM bets WHERE status = 'resolved'").get();
  return row.total;
}

export function getAssessmentForMatch(matchId) {
  return db.prepare('SELECT * FROM match_assessments WHERE match_id = ?').get(matchId) ?? null;
}

export function saveAssessment(matchId, date, map, answersJson) {
  db.prepare(
    'INSERT INTO match_assessments (match_id, date, map, answers_json, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(matchId, date, map || null, answersJson, Date.now());
  return getAssessmentForMatch(matchId);
}

export function getAssessmentHistory(limit) {
  return db.prepare('SELECT * FROM match_assessments ORDER BY created_at DESC LIMIT ?').all(limit);
}

export function getNarrativeForWeek(weekStart) {
  return db.prepare('SELECT * FROM weekly_narratives WHERE week_start = ?').get(weekStart) ?? null;
}

export function getPreviousNarrative(weekStart) {
  return (
    db
      .prepare('SELECT * FROM weekly_narratives WHERE week_start < ? ORDER BY week_start DESC LIMIT 1')
      .get(weekStart) ?? null
  );
}

export function saveNarrative(weekStart, recapJson, rankJson, narrativeJson) {
  db.prepare(
    'INSERT INTO weekly_narratives (week_start, recap_json, rank_json, narrative_json, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(weekStart, recapJson, rankJson || null, narrativeJson, Date.now());
  return getNarrativeForWeek(weekStart);
}

export function getNarrativeHistory(limit) {
  return db.prepare('SELECT * FROM weekly_narratives ORDER BY week_start DESC LIMIT ?').all(limit);
}

export function getPuzzleByDate(date) {
  return db.prepare('SELECT * FROM puzzles WHERE date = ?').get(date) ?? null;
}

export function savePuzzle(date, situationJson) {
  db.prepare('INSERT INTO puzzles (date, situation_json, created_at) VALUES (?, ?, ?)').run(
    date,
    situationJson,
    Date.now(),
  );
  return getPuzzleByDate(date);
}

export function answerPuzzle(date, choice, correct) {
  db.prepare('UPDATE puzzles SET choice = ?, correct = ?, answered_at = ? WHERE date = ?').run(
    choice,
    correct ? 1 : 0,
    Date.now(),
    date,
  );
  return getPuzzleByDate(date);
}

export function getPuzzleHistory(limit) {
  return db.prepare('SELECT * FROM puzzles ORDER BY date DESC LIMIT ?').all(limit);
}
