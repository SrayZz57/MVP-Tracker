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
    puuid TEXT NOT NULL DEFAULT '',
    name TEXT NOT NULL,
    map TEXT NOT NULL,
    canvas_json TEXT NOT NULL,
    created_at INTEGER NOT NULL
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS crosshairs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puuid TEXT NOT NULL DEFAULT '',
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
    puuid TEXT NOT NULL DEFAULT '',
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
    puuid TEXT NOT NULL DEFAULT '',
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
    puuid TEXT NOT NULL DEFAULT '',
    week_start TEXT NOT NULL,
    recap_json TEXT NOT NULL,
    rank_json TEXT,
    narrative_json TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    UNIQUE(puuid, week_start)
  )
`);

db.exec(`
  CREATE TABLE IF NOT EXISTS puzzles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    puuid TEXT NOT NULL DEFAULT '',
    date TEXT NOT NULL,
    situation_json TEXT NOT NULL,
    choice TEXT,
    correct INTEGER,
    created_at INTEGER NOT NULL,
    answered_at INTEGER,
    UNIQUE(puuid, date)
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

// Scoping par compte (2026-08-18) : ajoute `puuid` aux tables qui n'en avaient
// pas encore, pour que consulter le tracker d'un autre joueur sur la même
// machine ne mélange plus ses données avec les tiennes. `puzzles` et
// `weekly_narratives` avaient une contrainte UNIQUE sur une seule colonne
// (date / week_start) — SQLite ne permet pas de la transformer en UNIQUE
// composite via ALTER TABLE, donc ces deux tables sont recréées avec le bon
// schéma si elles existent encore sous l'ancienne forme (détecté via absence
// de la colonne puuid), en conservant les lignes existantes.
function tableHasColumn(table, column) {
  return db
    .prepare(`PRAGMA table_info(${table})`)
    .all()
    .some((c) => c.name === column);
}

function addPuuidColumn(table) {
  if (!tableHasColumn(table, 'puuid')) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN puuid TEXT NOT NULL DEFAULT ''`);
  }
}

addPuuidColumn('strategies');
addPuuidColumn('crosshairs');
addPuuidColumn('bets');
addPuuidColumn('match_assessments');

function recreateWithCompositeUnique(table, columns, uniqueCols) {
  if (tableHasColumn(table, 'puuid')) {
    // Colonne déjà là : soit table neuve (CREATE TABLE ci-dessus l'a posée),
    // soit déjà migrée lors d'un lancement précédent — rien à faire.
    const hadUniqueAlready = db
      .prepare(`SELECT sql FROM sqlite_master WHERE type = 'table' AND name = ?`)
      .get(table)?.sql;
    if (hadUniqueAlready?.includes(`UNIQUE(${uniqueCols.join(', ')})`)) return;
  }
  const legacyCols = columns.filter((c) => c !== 'puuid');
  db.exec(`ALTER TABLE ${table} RENAME TO ${table}_legacy`);
  const createSql = table === 'puzzles'
    ? `CREATE TABLE puzzles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        puuid TEXT NOT NULL DEFAULT '',
        date TEXT NOT NULL,
        situation_json TEXT NOT NULL,
        choice TEXT,
        correct INTEGER,
        created_at INTEGER NOT NULL,
        answered_at INTEGER,
        UNIQUE(puuid, date)
      )`
    : `CREATE TABLE weekly_narratives (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        puuid TEXT NOT NULL DEFAULT '',
        week_start TEXT NOT NULL,
        recap_json TEXT NOT NULL,
        rank_json TEXT,
        narrative_json TEXT NOT NULL,
        created_at INTEGER NOT NULL,
        UNIQUE(puuid, week_start)
      )`;
  db.exec(createSql);
  const hasPuuidInLegacy = tableHasColumn(`${table}_legacy`, 'puuid');
  const selectCols = legacyCols.map((c) => (c === 'puuid' ? "''" : c));
  db.exec(
    `INSERT INTO ${table} (${legacyCols.join(', ')}) SELECT ${hasPuuidInLegacy ? legacyCols.join(', ') : selectCols.join(', ')} FROM ${table}_legacy`,
  );
  db.exec(`DROP TABLE ${table}_legacy`);
}

recreateWithCompositeUnique(
  'puzzles',
  ['id', 'puuid', 'date', 'situation_json', 'choice', 'correct', 'created_at', 'answered_at'],
  ['puuid', 'date'],
);
recreateWithCompositeUnique(
  'weekly_narratives',
  ['id', 'puuid', 'week_start', 'recap_json', 'rank_json', 'narrative_json', 'created_at'],
  ['puuid', 'week_start'],
);

// Attribue les lignes créées avant ce scoping (puuid = '') au compte
// actuellement configuré, pour ne pas perdre l'historique déjà là.
export function backfillLegacyPuuid(puuid) {
  if (!puuid) return;
  ['strategies', 'crosshairs', 'bets', 'match_assessments', 'puzzles', 'weekly_narratives'].forEach((table) => {
    db.prepare(`UPDATE ${table} SET puuid = ? WHERE puuid = ''`).run(puuid);
  });
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

export function saveCrosshair(puuid, name, code, color, image) {
  db.prepare(
    'INSERT INTO crosshairs (puuid, name, code, color, image, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(puuid, name, code, color || null, image || null, Date.now());
}

export function getCrosshairs(puuid) {
  return db
    .prepare('SELECT id, name, code, color, image FROM crosshairs WHERE puuid = ? ORDER BY created_at DESC')
    .all(puuid);
}

export function deleteCrosshair(puuid, id) {
  db.prepare('DELETE FROM crosshairs WHERE id = ? AND puuid = ?').run(id, puuid);
}

export function saveStrategy(puuid, name, map, canvasJson) {
  db.prepare(
    'INSERT INTO strategies (puuid, name, map, canvas_json, created_at) VALUES (?, ?, ?, ?, ?)',
  ).run(puuid, name, map, canvasJson, Date.now());
}

export function getStrategiesForMap(puuid, map) {
  return db
    .prepare(
      'SELECT id, name, map, canvas_json, created_at FROM strategies WHERE map = ? AND puuid = ? ORDER BY created_at DESC',
    )
    .all(map, puuid);
}

export function deleteStrategy(puuid, id) {
  db.prepare('DELETE FROM strategies WHERE id = ? AND puuid = ?').run(id, puuid);
}

export function getPendingBet(puuid) {
  return (
    db
      .prepare("SELECT * FROM bets WHERE status = 'pending' AND puuid = ? ORDER BY created_at DESC LIMIT 1")
      .get(puuid) ?? null
  );
}

export function createBet(puuid, type, threshold, baselineMatchId) {
  db.prepare(
    "INSERT INTO bets (puuid, type, threshold, baseline_match_id, status, created_at) VALUES (?, ?, ?, ?, 'pending', ?)",
  ).run(puuid, type, threshold ?? null, baselineMatchId ?? null, Date.now());
  return getPendingBet(puuid);
}

export function cancelBet(puuid, id) {
  db.prepare("DELETE FROM bets WHERE id = ? AND puuid = ? AND status = 'pending'").run(id, puuid);
}

export function resolveBet(puuid, id, resolvedMatchId, actualValue, won, points) {
  db.prepare(
    "UPDATE bets SET status = 'resolved', resolved_match_id = ?, actual_value = ?, won = ?, points = ?, resolved_at = ? WHERE id = ? AND puuid = ?",
  ).run(resolvedMatchId, actualValue, won ? 1 : 0, points, Date.now(), id, puuid);
  return db.prepare('SELECT * FROM bets WHERE id = ?').get(id);
}

export function getBetHistory(puuid, limit) {
  return db
    .prepare("SELECT * FROM bets WHERE status = 'resolved' AND puuid = ? ORDER BY resolved_at DESC LIMIT ?")
    .all(puuid, limit);
}

export function getTotalBetPoints(puuid) {
  const row = db
    .prepare("SELECT COALESCE(SUM(points), 0) as total FROM bets WHERE status = 'resolved' AND puuid = ?")
    .get(puuid);
  return row.total;
}

export function getAssessmentForMatch(puuid, matchId) {
  return db.prepare('SELECT * FROM match_assessments WHERE match_id = ? AND puuid = ?').get(matchId, puuid) ?? null;
}

export function saveAssessment(puuid, matchId, date, map, answersJson) {
  db.prepare(
    'INSERT INTO match_assessments (puuid, match_id, date, map, answers_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(puuid, matchId, date, map || null, answersJson, Date.now());
  return getAssessmentForMatch(puuid, matchId);
}

export function getAssessmentHistory(puuid, limit) {
  return db
    .prepare('SELECT * FROM match_assessments WHERE puuid = ? ORDER BY created_at DESC LIMIT ?')
    .all(puuid, limit);
}

export function getNarrativeForWeek(puuid, weekStart) {
  return db.prepare('SELECT * FROM weekly_narratives WHERE week_start = ? AND puuid = ?').get(weekStart, puuid) ?? null;
}

export function getPreviousNarrative(puuid, weekStart) {
  return (
    db
      .prepare('SELECT * FROM weekly_narratives WHERE week_start < ? AND puuid = ? ORDER BY week_start DESC LIMIT 1')
      .get(weekStart, puuid) ?? null
  );
}

export function saveNarrative(puuid, weekStart, recapJson, rankJson, narrativeJson) {
  db.prepare(
    'INSERT INTO weekly_narratives (puuid, week_start, recap_json, rank_json, narrative_json, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(puuid, weekStart, recapJson, rankJson || null, narrativeJson, Date.now());
  return getNarrativeForWeek(puuid, weekStart);
}

export function getNarrativeHistory(puuid, limit) {
  return db.prepare('SELECT * FROM weekly_narratives WHERE puuid = ? ORDER BY week_start DESC LIMIT ?').all(puuid, limit);
}

export function getPuzzleByDate(puuid, date) {
  return db.prepare('SELECT * FROM puzzles WHERE date = ? AND puuid = ?').get(date, puuid) ?? null;
}

export function savePuzzle(puuid, date, situationJson) {
  db.prepare('INSERT INTO puzzles (puuid, date, situation_json, created_at) VALUES (?, ?, ?, ?)').run(
    puuid,
    date,
    situationJson,
    Date.now(),
  );
  return getPuzzleByDate(puuid, date);
}

export function answerPuzzle(puuid, date, choice, correct) {
  db.prepare('UPDATE puzzles SET choice = ?, correct = ?, answered_at = ? WHERE date = ? AND puuid = ?').run(
    choice,
    correct ? 1 : 0,
    Date.now(),
    date,
    puuid,
  );
  return getPuzzleByDate(puuid, date);
}

export function getPuzzleHistory(puuid, limit) {
  return db.prepare('SELECT * FROM puzzles WHERE puuid = ? ORDER BY date DESC LIMIT ?').all(puuid, limit);
}
