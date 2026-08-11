import fastifyWebsocket from '@fastify/websocket';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

async function _websocketPlugin(fastify: FastifyInstance) {
  await fastify.register(fastifyWebsocket, {
    options: { maxPayload: 1048576 },
  });

  fastify.get('/api/ws', { websocket: true }, (socket, _req) => {
    fastify.log.info('WebSocket client connected');

    socket.on('message', (message: Buffer) => {
      socket.send(JSON.stringify({ type: 'echo', data: message.toString() }));
    });

    socket.on('close', () => {
      fastify.log.info('WebSocket client disconnected');
    });

    socket.on('error', (err: Error) => {
      fastify.log.error({ err }, 'WebSocket error');
    });
  });
}

export const websocketPlugin = fp(_websocketPlugin, { name: 'websocket-plugin' });
