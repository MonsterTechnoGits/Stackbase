import { toNodeHandler } from 'better-auth/node';

import { auth } from '@/AuthModule/BetterAuthConfig';
import { pool } from '@/DatabaseModule/connection';
import { UserStatus } from '@/DatabaseModule/schema';

import type { FastifyPluginAsync } from 'fastify';

const nodeHandler = toNodeHandler(auth);

const userResponse = {
  type: 'object',
  properties: {
    id: { type: 'string', format: 'uuid' },
    name: { type: 'string' },
    email: { type: 'string', format: 'email' },
    emailVerified: { type: 'boolean' },
    image: { type: ['string', 'null'] },
    createdAt: { type: 'string', format: 'date-time' },
    updatedAt: { type: 'string', format: 'date-time' },
  },
} as const;

const sessionResponse = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    userId: { type: 'string', format: 'uuid' },
    expiresAt: { type: 'string', format: 'date-time' },
    ipAddress: { type: ['string', 'null'] },
    userAgent: { type: ['string', 'null'] },
  },
} as const;

const authPublicRoutes: FastifyPluginAsync = async (fastify) => {
  const forward = async (
    req: Parameters<typeof nodeHandler>[0],
    reply: {
      hijack(): void;
      raw: Parameters<typeof nodeHandler>[1];
      log: { error(...args: unknown[]): void };
    },
  ) => {
    try {
      reply.hijack();
      await nodeHandler(req, reply.raw);
    } catch (err) {
      fastify.log.error({ err }, 'Better Auth handler error');
      reply.raw.writeHead(500);
      reply.raw.end(JSON.stringify({ message: 'Authentication error' }));
    }
  };

  fastify.post('/auth/sign-in/email', {
    preValidation: async (request, reply) => {
      const body = request.body as { email?: string };
      if (body?.email) {
        try {
          const userRes = await pool.query<{ status: string }>(
            'SELECT status FROM m_users WHERE email = $1 LIMIT 1',
            [body.email],
          );
          if (
            userRes.rowCount !== null &&
            userRes.rowCount > 0 &&
            userRes.rows[0]?.status !== UserStatus.ACTIVE
          ) {
            return reply.status(401).send({
              code: 'ACCOUNT_DISABLED',
              message: 'This account is inactive or banned.',
            });
          }
        } catch (err) {
          request.log.error({ err }, 'Error checking user status during sign-in');
        }
      }
    },
    schema: {
      tags: ['Auth'],
      summary: 'Sign in',
      description:
        'Authenticates a user with email and password. ' +
        'On success, sets an HTTP-only session cookie.',
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
        },
      },
      response: {
        200: {
          type: 'object',
          properties: {
            token: { type: ['string', 'null'] },
            user: userResponse,
          },
        },
        401: {
          type: 'object',
          properties: {
            code: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
    handler: forward as never,
  });

  fastify.post('/auth/sign-out', {
    schema: {
      tags: ['Auth'],
      summary: 'Sign out',
      description: 'Invalidates the current session and clears the session cookie.',
      response: {
        200: {
          type: 'object',
          properties: {
            success: { type: 'boolean' },
          },
        },
      },
    },
    handler: forward as never,
  });

  fastify.get('/auth/get-session', {
    schema: {
      tags: ['Auth'],
      summary: 'Get current session',
      description: 'Returns the session and user associated with the current session cookie.',
      response: {
        200: {
          type: 'object',
          properties: {
            session: { ...sessionResponse, nullable: true },
            user: { ...userResponse, nullable: true },
          },
        },
      },
    },
    handler: forward as never,
  });

  fastify.all('/auth/*', { schema: { hide: true } }, forward as never);
};

export default authPublicRoutes;
