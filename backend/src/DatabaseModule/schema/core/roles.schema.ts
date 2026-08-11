import { pgTable, uuid, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';

import { roleStatusEnum } from '@/DatabaseModule/schema/core/enums.schema';

export const roles = pgTable(
  'm_roles',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    roleKey: varchar('role_key', { length: 100 }).notNull().unique(),
    roleName: varchar('role_name', { length: 255 }).notNull(),
    description: text('description'),
    status: roleStatusEnum('status').default('active').notNull(),
    createdBy: varchar('created_by', { length: 255 }),
    updatedBy: varchar('updated_by', { length: 255 }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    roleKeyIdx: index('idx_mrole_rolekey').on(table.roleKey),
    statusIdx: index('idx_mrole_status').on(table.status),
  }),
);

export type Role = typeof roles.$inferSelect;
export type NewRole = typeof roles.$inferInsert;
