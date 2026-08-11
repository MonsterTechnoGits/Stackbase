import { fromNodeHeaders } from 'better-auth/node';
import fp from 'fastify-plugin';

import { auth } from '@/AuthModule/BetterAuthConfig';
import { pool } from '@/DatabaseModule/connection';
import { UserStatus } from '@/DatabaseModule/schema/core/enums.schema';
import { UserRoles, type UserRole } from '@/SharedModule/utils/constants';

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';

declare module 'fastify' {
  interface FastifyInstance {
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
  interface FastifyRequest {
    user: {
      id: string;
      email: string;
      name: string;
      roleKey: UserRole;
    } | null;
  }
}

async function _authPlugin(fastify: FastifyInstance) {
  fastify.decorate('authenticate', async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
      if (!session?.user) {
        return reply.status(401).send({ status: 'error', message: 'Unauthorized' });
      }

      const sessionUser = session.user as {
        id: string;
        email: string;
        name: string;
      };

      const userRes = await pool.query<{ status: string; role_key: string | null }>(
        `SELECT u.status, r.role_key
         FROM m_users u
         LEFT JOIN m_roles r ON r.id = u.role_id
         WHERE u.id = $1 LIMIT 1`,
        [sessionUser.id],
      );

      if (!userRes.rows[0] || userRes.rows[0].status !== UserStatus.ACTIVE) {
        return reply
          .status(401)
          .send({ status: 'error', message: 'Account is inactive or banned' });
      }

      const roleKey: UserRole =
        userRes.rows[0].role_key === UserRoles.SUPER_ADMIN ? UserRoles.SUPER_ADMIN : UserRoles.USER;

      req.user = {
        id: sessionUser.id,
        email: sessionUser.email,
        name: sessionUser.name,
        roleKey,
      };

      if (session.session?.id) {
        pool
          .query('UPDATE ba_sessions SET last_activity_at = NOW() WHERE id = $1', [
            session.session.id,
          ])
          .catch((err: unknown) => {
            fastify.log.warn({ err }, 'Failed to update session last_activity_at');
          });
      }
    } catch (err) {
      fastify.log.error({ err }, 'Auth session error');
      return reply.status(401).send({ status: 'error', message: 'Unauthorized' });
    }
  });
}

export const authPlugin = fp(_authPlugin, { name: 'auth-plugin' });
