export const API_VERSION = '1.0.0';

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;

export const SESSION_INACTIVITY_TIMEOUT_MINUTES = Number(
  process.env.SESSION_INACTIVITY_TIMEOUT_MINUTES ?? 15,
);

export const UserRoles = {
  SUPER_ADMIN: 'superadmin',
  USER: 'user',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];
