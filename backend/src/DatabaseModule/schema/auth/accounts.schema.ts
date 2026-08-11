import { pgTable, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

import { users } from '@/DatabaseModule/schema/core/users.schema';

export const accounts = pgTable(
  'ba_accounts',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    accountId: varchar('account_id', { length: 255 }).notNull(),
    providerId: varchar('provider_id', { length: 255 }).notNull(),
    userId: varchar('user_id', { length: 255 })
      .notNull()
      .references(() => users.id, { onUpdate: 'cascade', onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    expiresAt: timestamp('expires_at'),
    password: text('password'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdIdx: index('idx_baaccount_userid').on(table.userId),
    providerIdx: index('idx_baaccount_provider').on(table.providerId),
  }),
);

export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;
