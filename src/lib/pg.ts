import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

// Lazy-initialised Neon client. We avoid calling neon() at module load so that
// Next.js build-time page-data collection (and CI environments without the DB
// secret) can import this file without throwing.

type SqlClient = NeonQueryFunction<false, false>;

let _client: SqlClient | null = null;

function getClient(): SqlClient {
  if (_client) return _client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error('[pg] DATABASE_URL not set — cannot open Postgres connection');
  }
  _client = neon(url);
  return _client;
}

// Tagged-template proxy that defers initialisation until first use.
export const sql: SqlClient = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  return (getClient() as unknown as (
    s: TemplateStringsArray,
    ...v: unknown[]
  ) => unknown)(strings, ...values);
}) as unknown as SqlClient;
