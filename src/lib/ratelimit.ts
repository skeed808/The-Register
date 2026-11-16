import 'server-only';
// Rate limits and the assistant budget.
// With DATABASE_URL set, counters live in Neon Postgres (via Drizzle), so limits hold
// across serverless instances. Without it, an in-memory fallback keeps local runs
// working; that fallback resets on cold start and is not a real safeguard.

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { sql } from 'drizzle-orm';
import { counters } from './db/schema';

export const LIMITS = {
  /** Live Companies House lookups per IP hash per 5 minutes. */
  searchPer5Min: 40,
  /** Free-form assistant questions per session. */
  askPerSession: 10,
  /** Hard global cap on model calls per UTC day. */
  askGlobalPerDay: 300,
};

const memory = new Map<string, { n: number; expires: number }>();

const db = process.env.DATABASE_URL ? drizzle(neon(process.env.DATABASE_URL)) : null;

/** Increments a counter and returns the new count. */
export async function hit(key: string, windowSeconds: number): Promise<number> {
  const now = Date.now();
  if (!db) {
    const cur = memory.get(key);
    if (!cur || cur.expires < now) {
      memory.set(key, { n: 1, expires: now + windowSeconds * 1000 });
      return 1;
    }
    cur.n += 1;
    return cur.n;
  }
  const expires = new Date(now + windowSeconds * 1000);
  const rows = await db
    .insert(counters)
    .values({ key, count: 1, expiresAt: expires })
    .onConflictDoUpdate({
      target: counters.key,
      set: {
        count: sql`CASE WHEN ${counters.expiresAt} < now() THEN 1 ELSE ${counters.count} + 1 END`,
        expiresAt: sql`CASE WHEN ${counters.expiresAt} < now() THEN ${expires} ELSE ${counters.expiresAt} END`,
      },
    })
    .returning({ count: counters.count });
  return rows[0]?.count ?? 1;
}

export async function hashIp(ip: string) {
  const data = new TextEncoder().encode(ip + (process.env.SESSION_SECRET ?? 'register'));
  const buf = await crypto.subtle.digest('SHA-256', data);
  return Buffer.from(buf).toString('hex').slice(0, 24);
}
