import { ZodError } from 'zod';

import { logger } from '@/SharedModule/utils/logger';

import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from 'fastify';

export function registerErrorHandler(fastify: FastifyInstance): void {
  fastify.setErrorHandler(
    (err: FastifyError & { statusCode?: number }, req: FastifyRequest, reply: FastifyReply) => {
      const statusCode = err.statusCode ?? 500;

      if (err instanceof ZodError) {
        logger.warn({ errors: err.issues, url: req.url }, 'Zod validation error');
        return reply.status(400).send({
          status: 'error',
          message: 'Validation error',
          errors: err.issues.map((e) => ({ path: e.path, message: e.message })),
        });
      }

      if (statusCode === 401) {
        return reply.status(401).send({ status: 'error', message: err.message ?? 'Unauthorized' });
      }

      if (statusCode === 403) {
        return reply.status(403).send({ status: 'error', message: err.message ?? 'Forbidden' });
      }

      if (statusCode >= 400 && statusCode < 500) {
        return reply
          .status(statusCode)
          .send({ status: 'error', message: err.message ?? 'Bad request' });
      }

      logger.error({ message: err.message, stack: err.stack, url: req.url }, 'Server error');
      const message =
        process.env.NODE_ENV === 'production'
          ? 'An internal server error occurred'
          : (err.message ?? 'Internal server error');

      return reply.status(500).send({ status: 'error', message });
    },
  );
}
