import fastifyCookie from '@fastify/cookie';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

async function _cookiePlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyCookie);
}

export const cookiePlugin = fp(_cookiePlugin, { name: 'cookie-plugin' });
