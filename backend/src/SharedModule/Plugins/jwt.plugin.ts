import fastifyJwt from '@fastify/jwt';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

/**
 * JWT Plugin
 *
 * Registers @fastify/jwt and exposes:
 *   fastify.jwt.sign(payload, options)   — create a signed token
 *   fastify.jwt.verify(token)            — verify + decode a token (throws on invalid/expired)
 *
 * Used exclusively for short-lived activation tokens (7 days).
 * Session auth is handled separately by Better Auth (auth.plugin.ts).
 *
 * The JWT_SECRET env var must be set — server will refuse to start without it.
 */
async function _jwtPlugin(fastify: FastifyInstance) {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET env var is required');

  await fastify.register(fastifyJwt, { secret });
}

export const jwtPlugin = fp(_jwtPlugin, { name: 'jwt-plugin' });
