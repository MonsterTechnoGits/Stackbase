import { pgTable, varchar, boolean, uuid, timestamp, index } from 'drizzle-orm/pg-core';

import { userStatusEnum } from '@/DatabaseModule/schema/core/enums.schema';

import { roles } from './roles.schema';

export const users = pgTable(
  'm_users',
  {
    id: varchar('id', { length: 255 }).primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: varchar('image', { length: 500 }),
    status: userStatusEnum('status').default('active').notNull(),
    roleId: uuid('role_id').references(() => roles.id, { onDelete: 'set null' }),
    createdBy: varchar('created_by', { length: 255 }),
    updatedBy: varchar('updated_by', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    emailIdx: index('idx_muser_email').on(table.email),
    statusIdx: index('idx_muser_status').on(table.status),
    roleIdx: index('idx_muser_roleid').on(table.roleId),
  }),
);

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
