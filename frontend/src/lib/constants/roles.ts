// Mirror of backend/src/SharedModule/utils/constants.ts UserRoles — keep in lockstep.
export const UserRoles = {
  SUPER_ADMIN: 'superadmin',
  USER: 'user',
} as const;

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles];
