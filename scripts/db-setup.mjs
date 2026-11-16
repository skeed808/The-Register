// Creates the one table v1 uses (rate-limit counters) on Neon. Safe to run repeatedly.
// Usage: DATABASE_URL=... node scripts/db-setup.mjs   (or with .env.local loaded: node --env-file=.env.local scripts/db-setup.mjs)
import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);
await sql`CREATE TABLE IF NOT EXISTS rate_counters (
  key text PRIMARY KEY,
  count integer NOT NULL DEFAULT 0,
  expires_at timestamptz NOT NULL
)`;
const [{ n }] = await sql`SELECT count(*)::int AS n FROM rate_counters`;
console.log(`rate_counters ready (${n} rows).`);
