import { relations } from 'drizzle-orm';

import { accounts } from '@/DatabaseModule/schema/auth/accounts.schema';
import { sessions } from '@/DatabaseModule/schema/auth/sessions.schema';
import { roles } from '@/DatabaseModule/schema/core/roles.schema';
import { users } from '@/DatabaseModule/schema/core/users.schema';

export const usersRelations = relations(users, ({ one, many }) => ({
  roleRef: one(roles, { fields: [users.roleId], references: [roles.id] }),
  sessions: many(sessions),
  accounts: many(accounts),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));
