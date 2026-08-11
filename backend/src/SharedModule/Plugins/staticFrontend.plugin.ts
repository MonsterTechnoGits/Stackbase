import path from 'path';

import fastifyStatic from '@fastify/static';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

// Production deploy layout is a flat folder (see ci/pm2/ecosystem.config.js):
//   <DEPLOY_DIR>/index.js     ← this bundled backend (tsup emits one file, so
//                                __dirname here IS the deploy root)
//   <DEPLOY_DIR>/frontend/    ← static Next.js export (output: "export")
const FRONTEND_DIR = path.join(__dirname, 'frontend');

async function _staticFrontendPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyStatic, {
    root: FRONTEND_DIR,
    wildcard: false,
  });

  // SPA fallback: serve index.html for any non-API GET that doesn't match a
  // static file, so client-side route refreshes (e.g. /applications/gr-po)
  // don't 404 if the exporter didn't emit a matching .html file.
  fastify.setNotFoundHandler((req, reply) => {
    if (req.method !== 'GET' || req.url.startsWith('/api')) {
      return reply.code(404).send({ message: 'Not Found' });
    }
    return reply.sendFile('index.html');
  });
}

export const staticFrontendPlugin = fp(_staticFrontendPlugin, { name: 'static-frontend-plugin' });
