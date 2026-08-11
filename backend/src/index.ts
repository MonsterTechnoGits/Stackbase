import Fastify from 'fastify';

import app from '@/app';
import { checkDbConnection } from '@/DatabaseModule/connection';
import { runBootstrap } from '@/DatabaseModule/seed/bootstrap';

const isDev = process.env.NODE_ENV !== 'production';

const server = Fastify({
  pluginTimeout: 60_000, // 60s — increased from 10s default to handle heavy plugin deps (AI SDK, etc.)

  logger: {
    level: process.env.LOG_LEVEL ?? (isDev ? 'info' : 'warn'),
    ...(isDev && {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:yyyy-mm-dd HH:MM:ss',
          ignore: 'pid,hostname',
        },
      },
    }),
  },
});

// ── Startup banner ───────────────────────────────────────────────────────────

function printStartupBanner(): void {
  const green = '\x1b[32m';
  const cyan = '\x1b[36m';
  const dim = '\x1b[2m';
  const bold = '\x1b[1m';
  const reset = '\x1b[0m';

  const host = 'http://localhost';

  console.log('');
  console.log(`${bold}${green}  ✔ Server started successfully${reset}`);
  console.log('');
  console.log(`${bold}  Local endpoints${reset}`);
  console.log(`  ${dim}─────────────────────────────────────────${reset}`);
  const port = process.env.PORT ?? 44300;
  console.log(`  ${cyan}API Base      ${reset}  ${host}:${port}/api`);
  console.log(`  ${cyan}Swagger UI    ${reset}  ${host}:${port}/api-docs`);
  console.log(`  ${cyan}OpenAPI JSON  ${reset}  ${host}:${port}/documentation/json`);
  console.log('');
}

const start = async () => {
  // ── Register app — all plugins must be registered before listen
  try {
    // Health check registered directly — guaranteed to work in production
    // regardless of runtime route scanning (which requires .ts imports).
    server.get('/api/public/health', async (_req, reply) => {
      return reply.send({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
    });

    await checkDbConnection();
    server.log.info('Database connection verified');

    await server.register(app);

    await runBootstrap();

    const port = Number(process.env.PORT ?? 44300);
    await server.listen({ port, host: '0.0.0.0' });
    printStartupBanner();
  } catch (err) {
    server.log.error({ err }, 'Failed to start server');
    process.exit(1);
  }
};

process.on('SIGTERM', async () => {
  server.log.info('SIGTERM received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  server.log.info('SIGINT received, shutting down gracefully');
  await server.close();
  process.exit(0);
});

start();
