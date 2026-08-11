import helmet from '@fastify/helmet';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

async function _helmetPlugin(fastify: FastifyInstance) {
  await fastify.register(helmet, {
    // Next.js's static export relies on inline hydration scripts and blob-loaded
    // chunks that Helmet's default CSP (script-src 'self') blocks outright.
    contentSecurityPolicy: false,
  });
}

export const helmetPlugin = fp(_helmetPlugin, { name: 'helmet-plugin' });
