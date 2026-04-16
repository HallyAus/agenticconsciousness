import { neon, neonConfig } from '@neondatabase/serverless';

// Cache HTTP connections across Lambda warm invocations
neonConfig.fetchConnectionCache = true;

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL && process.env.NODE_ENV !== 'test') {
  console.warn('[pg] DATABASE_URL not set — Postgres-backed routes will throw');
}

export const sql = neon(DATABASE_URL ?? '');
