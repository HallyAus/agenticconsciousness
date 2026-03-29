import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = process.env.NODE_ENV === 'production'
  ? '/app/data/ratelimit.db'
  : path.join(process.cwd(), 'data', 'ratelimit.db');

const SCHEMA = `
CREATE TABLE IF NOT EXISTS anonymous_usage (
  fingerprint TEXT PRIMARY KEY,
  use_count INTEGER DEFAULT 0,
  first_use TEXT DEFAULT (datetime('now')),
  last_use TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS verified_users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT UNIQUE NOT NULL,
  verification_token TEXT UNIQUE,
  token_expires_at TEXT,
  verified_at TEXT,
  revoked_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  daily_count INTEGER DEFAULT 0,
  daily_reset TEXT DEFAULT (date('now'))
);

CREATE TABLE IF NOT EXISTS usage_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  fingerprint TEXT NOT NULL,
  email TEXT,
  tool TEXT NOT NULL,
  ip TEXT,
  tokens_used INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_usage_log_created ON usage_log(created_at);
CREATE INDEX IF NOT EXISTS idx_usage_log_email ON usage_log(email);
CREATE INDEX IF NOT EXISTS idx_usage_log_tool ON usage_log(tool);
`;

// Singleton via globalThis to survive HMR
const globalRef = globalThis as unknown as { __ratelimitDb?: Database.Database };

export function getDb(): Database.Database {
  if (!globalRef.__ratelimitDb) {
    // Ensure data directory exists in dev
    if (process.env.NODE_ENV !== 'production') {
      const fs = require('fs');
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }

    const db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    db.pragma('busy_timeout = 5000');
    db.pragma('journal_size_limit = 67108864'); // 64MB WAL limit

    // Integrity check
    try {
      const result = db.pragma('integrity_check') as { integrity_check: string }[];
      if (result[0]?.integrity_check !== 'ok') {
        console.warn('SQLite integrity check failed, recreating database');
        db.close();
        const fs = require('fs');
        fs.unlinkSync(DB_PATH);
        // Recurse to create fresh
        return getDb();
      }
    } catch {
      // If integrity check itself fails, just proceed
    }

    db.exec(SCHEMA);

    // Cleanup old usage logs (90 day retention)
    db.exec("DELETE FROM usage_log WHERE created_at < datetime('now', '-90 days')");

    globalRef.__ratelimitDb = db;
  }
  return globalRef.__ratelimitDb;
}
