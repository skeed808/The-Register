// The only table in v1. No officer data, no evidence from live companies, is ever stored.
// The demo case lives in typed seed modules (src/data), not the database.
import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const counters = pgTable('rate_counters', {
  key: text('key').primaryKey(),
  count: integer('count').notNull().default(0),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
