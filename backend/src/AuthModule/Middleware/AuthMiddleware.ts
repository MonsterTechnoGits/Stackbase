import { type UserRole } from '@/SharedModule/utils/constants';

import type { FastifyRequest, FastifyReply } from 'fastify';

export const validateUserRole =
  (allowedRoles: UserRole | 'ALL' | (UserRole | 'ALL')[]) =>
  async (req: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = req.user;
    if (!user) {
      reply.status(401).send({ status: 'error', message: 'Unauthorized' });
      return;
    }

    const roles: (UserRole | 'ALL')[] = Array.isArray(allowedRoles) ? allowedRoles : [allowedRoles];

    if (roles.includes('ALL')) return;

    if (!roles.includes(user.roleKey as UserRole)) {
      reply.status(403).send({ status: 'error', message: 'Forbidden: insufficient role' });
      return;
    }
  };
