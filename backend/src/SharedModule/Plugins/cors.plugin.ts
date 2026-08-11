import cors from '@fastify/cors';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

async function _corsPlugin(fastify: FastifyInstance) {
  await fastify.register(cors, {
    origin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000,http://localhost:3001').split(','),
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
}

export const corsPlugin = fp(_corsPlugin, { name: 'cors-plugin' });
