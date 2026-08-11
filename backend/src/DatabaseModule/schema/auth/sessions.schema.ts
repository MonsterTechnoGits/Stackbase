import { pgTable, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

import { users } from '@/DatabaseModule/schema/core/users.schema';

export const sessions = pgTable(
  'ba_sessions',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    token: text('token').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: varchar('ip_address', { length: 100 }),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_basession_userid').on(table.userId),
    tokenIdx: index('idx_basession_token').on(table.token),
  }),
);

export type Session = typeof sessions.$inferSelect;
export type NewSession = typeof sessions.$inferInsert;
