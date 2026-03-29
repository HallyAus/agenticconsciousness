import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.DB_PATH || path.join(process.cwd(), 'data', 'tool-access.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;

  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  _db.pragma('busy_timeout = 5000');
  _db.pragma('foreign_keys = ON');

  initSchema(_db);
  validateStartup(_db);

  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tool_access_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fingerprint TEXT NOT NULL,
      email TEXT,
      used_at INTEGER NOT NULL,
      tool_id TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_fp_date
      ON tool_access_logs(fingerprint, used_at);

    CREATE INDEX IF NOT EXISTS idx_email_date
      ON tool_access_logs(email, used_at);

    CREATE TABLE IF NOT EXISTS verification_tokens (
      token TEXT PRIMARY KEY,
      email TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      expires_at INTEGER NOT NULL,
      used INTEGER NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_token_expires
      ON verification_tokens(expires_at);

    CREATE TABLE IF NOT EXISTS verified_emails (
      email TEXT PRIMARY KEY,
      verified_at INTEGER NOT NULL
    );
  `);

  // 90-day log cleanup
  const cutoff90 = Date.now() - 90 * 24 * 60 * 60 * 1000;
  db.prepare('DELETE FROM tool_access_logs WHERE used_at < ?').run(cutoff90);
  db.prepare('DELETE FROM verification_tokens WHERE expires_at < ?').run(Date.now());
}

function validateStartup(db: Database.Database) {
  if (!process.env.COOKIE_SECRET) {
    console.warn('[db] COOKIE_SECRET not set — HMAC cookie verification disabled');
  }

  const check = db.prepare('PRAGMA integrity_check').get() as { integrity_check: string };
  if (check.integrity_check !== 'ok') {
    throw new Error(`[db] SQLite integrity check failed: ${check.integrity_check}`);
  }

  console.log('[db] SQLite ready:', DB_PATH);
}
