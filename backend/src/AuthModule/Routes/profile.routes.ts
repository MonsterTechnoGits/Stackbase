import { pool } from '@/DatabaseModule/connection';
import { UserStatus } from '@/DatabaseModule/schema/core/enums.schema';
import Err from '@/SharedModule/utils/errorcode';

import type { FastifyPluginAsync } from 'fastify';

const apiErrorResponse = {
  type: 'object',
  properties: {
    status: { type: 'string' },
    message: { type: 'string' },
    code: { type: 'number' },
  },
} as const;

const profileRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/me', {
    preHandler: [fastify.authenticate],
    schema: {
      tags: ['Profile'],
      summary: 'Get current user profile',
      description: 'Returns the authenticated user profile including their assigned role.',
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: {
              type: 'object',
              required: ['id', 'name', 'email', 'emailVerified'],
              properties: {
                id: { type: 'string' },
                name: { type: 'string' },
                email: { type: 'string', format: 'email' },
                emailVerified: { type: 'boolean' },
                image: { type: 'string', nullable: true },
                roleKey: { type: 'string', nullable: true },
              },
            },
          },
        },
        401: apiErrorResponse,
        403: apiErrorResponse,
      },
    },
    handler: async (request, reply) => {
      if (!request.user)
        return reply
          .status(401)
          .send({ status: 'error', message: 'Unauthorized', code: Err.TokenValidationFailed });
      const res = await pool.query<{
        id: string;
        name: string;
        email: string;
        email_verified: boolean;
        image: string | null;
        status: string;
        role_key: string | null;
      }>(
        `SELECT u.id, u.name, u.email, u.email_verified, u.image, u.status, r.role_key
         FROM m_users u
         LEFT JOIN m_roles r ON r.id = u.role_id
         WHERE u.id = $1 LIMIT 1`,
        [request.user.id],
      );

      const row = res.rows[0];
      if (!row || row.status !== UserStatus.ACTIVE) {
        return reply.status(403).send({
          status: 'error',
          message: 'Account is inactive or banned',
          code: Err.InactiveUser,
        });
      }

      return reply.send({
        status: 'success',
        data: {
          id: row.id,
          name: row.name,
          email: row.email,
          emailVerified: row.email_verified,
          image: row.image ?? null,
          roleKey: row.role_key ?? null,
        },
      });
    },
  });
};

export default profileRoutes;
