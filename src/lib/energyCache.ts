import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH =
  process.env.NODE_ENV === 'production'
    ? '/app/data/energy-cache.db'
    : path.join(process.cwd(), 'data', 'energy-cache.db');

declare const globalThis: { __energyCacheDb?: Database.Database };

export function getEnergyDb(): Database.Database {
  if (globalThis.__energyCacheDb) return globalThis.__energyCacheDb;

  // Ensure data directory exists in dev
  if (process.env.NODE_ENV !== 'production') {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('busy_timeout = 5000');

  db.exec(`
    CREATE TABLE IF NOT EXISTS plans_cache (
      retailer_code TEXT PRIMARY KEY,
      plan_data TEXT NOT NULL,
      fetched_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS endpoints_cache (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      data TEXT NOT NULL,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);

  globalThis.__energyCacheDb = db;
  return db;
}

export function getCachedPlans(retailerCode: string): unknown[] | null {
  const db = getEnergyDb();
  const row = db
    .prepare(
      `SELECT plan_data FROM plans_cache
       WHERE retailer_code = ? AND fetched_at > datetime('now', '-24 hours')`
    )
    .get(retailerCode) as { plan_data: string } | undefined;

  if (!row) return null;
  return JSON.parse(row.plan_data) as unknown[];
}

export function setCachedPlans(retailerCode: string, plans: unknown[]): void {
  const db = getEnergyDb();
  db.prepare(
    `INSERT OR REPLACE INTO plans_cache (retailer_code, plan_data, fetched_at)
     VALUES (?, ?, datetime('now'))`
  ).run(retailerCode, JSON.stringify(plans));
}

export function getCachedEndpoints(): unknown | null {
  const db = getEnergyDb();
  const row = db
    .prepare(
      `SELECT data FROM endpoints_cache
       WHERE id = 1 AND fetched_at > datetime('now', '-24 hours')`
    )
    .get() as { data: string } | undefined;

  if (!row) return null;
  return JSON.parse(row.data) as unknown;
}

export function setCachedEndpoints(data: unknown): void {
  const db = getEnergyDb();
  db.prepare(
    `INSERT OR REPLACE INTO endpoints_cache (id, data, fetched_at)
     VALUES (1, ?, datetime('now'))`
  ).run(JSON.stringify(data));
}
