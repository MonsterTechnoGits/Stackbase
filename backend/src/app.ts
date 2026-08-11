import fastifyMultipart from '@fastify/multipart';
import fastifySSE from '@fastify/sse';
import fp from 'fastify-plugin';

// @cli:if auth
import authPublicRoutes from '@/AuthModule/Routes/auth.public.routes';
import profileRoutes from '@/AuthModule/Routes/profile.routes';
import { authPlugin } from '@/SharedModule/Plugins/auth.plugin';
// @cli:endif
import { cookiePlugin } from '@/SharedModule/Plugins/cookie.plugin';
import { corsPlugin } from '@/SharedModule/Plugins/cors.plugin';
import { helmetPlugin } from '@/SharedModule/Plugins/helmet.plugin';
import { jwtPlugin } from '@/SharedModule/Plugins/jwt.plugin';
import { staticFrontendPlugin } from '@/SharedModule/Plugins/staticFrontend.plugin';
import { swaggerPlugin } from '@/SharedModule/Plugins/swagger.plugin';
import { websocketPlugin } from '@/SharedModule/Plugins/websocket.plugin';

import type { FastifyInstance } from 'fastify';

async function appFactory(fastify: FastifyInstance) {
  // ── Framework plugins ──────────────────────────────────────────────────────
  await fastify.register(corsPlugin);
  await fastify.register(helmetPlugin);
  await fastify.register(cookiePlugin);
  await fastify.register(swaggerPlugin);
  await fastify.register(fastifySSE);
  await fastify.register(fastifyMultipart, { limits: { fileSize: 20 * 1024 * 1024 } });
  await fastify.register(websocketPlugin);
  await fastify.register(jwtPlugin);

  // @cli:if auth
  // ── Auth plugin — decorates fastify.authenticate (Better Auth session) ─────
  await fastify.register(authPlugin);

  // ── Public routes (/api/public/*) ──────────────────────────────────────────
  await fastify.register(authPublicRoutes, { prefix: '/api/public' });

  // ── Authenticated routes (/api/*) ──────────────────────────────────────────
  await fastify.register(profileRoutes, { prefix: '/api' });
  // @cli:endif

  // ── Static frontend (production only — dev uses `next dev` separately) ─────
  if (process.env.NODE_ENV === 'production') {
    await fastify.register(staticFrontendPlugin);
  }
}

export default fp(appFactory);
