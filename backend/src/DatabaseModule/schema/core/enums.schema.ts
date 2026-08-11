import { pgEnum } from 'drizzle-orm/pg-core';

export const userStatusEnum = pgEnum('user_status', ['active', 'inactive', 'banned']);

export const UserStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  BANNED: 'banned',
} as const;

export type UserStatusType = (typeof UserStatus)[keyof typeof UserStatus];

export const roleStatusEnum = pgEnum('role_status', ['active', 'inactive']);

export const RoleStatus = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
} as const;

export type RoleStatusType = (typeof RoleStatus)[keyof typeof RoleStatus];
