import fastifySwagger from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import fp from 'fastify-plugin';

import type { FastifyInstance } from 'fastify';

async function _swaggerPlugin(fastify: FastifyInstance) {
  // OpenAPI JSON spec is always available (needed by generate:openapi script).
  // Swagger UI is only served in non-production environments.
  await fastify.register(fastifySwagger, {
    openapi: {
      openapi: '3.1.0',
      info: {
        title: 'The Weekend Stores API',
        description: [
          'The Weekend Stores API.',
          '',
          '### Authentication',
          'All `/api/*` routes require a valid session cookie set by Better Auth.',
          'Public routes under `/api/public/*` do not require authentication.',
          '',
          '### SSE endpoints',
          'Routes marked with `x-streaming: true` return a `text/event-stream` response.',
          'Connect via `EventSource` or `fetch` with a `ReadableStream` — not axios.',
          '',
          '### Observability (local dev)',
          'OpenTelemetry tracing is available in local development.',
          'Set `OTEL_ENABLED=true` in `backend/.env.dev` and start Jaeger:',
          '```',
          'docker run -d --name jaeger -p 4318:4318 -p 16686:16686 jaegertracing/all-in-one',
          '```',
          '| Tool | URL | Purpose |',
          '|---|---|---|',
          '| Jaeger UI | http://localhost:16686 | View traces |',
          '| OTLP receiver | http://localhost:4318 | Collector endpoint |',
        ].join('\n'),
        version: '1.0.0',
      },
      components: {
        securitySchemes: {
          cookieAuth: {
            type: 'apiKey',
            in: 'cookie',
            name: 'better-auth.session_token',
            description: 'Session cookie set automatically by Better Auth on sign-in.',
          },
        },
      },
      security: [{ cookieAuth: [] }],
      tags: [
        {
          name: 'Debug',
          description:
            'Device log ingestion from Android WebView — for remote debugging when device is off-site',
        },
        { name: 'Health', description: 'Server health check' },
        { name: 'Auth', description: 'Better Auth — email/password sign-in, sign-up, sign-out' },
        {
          name: 'Profile',
          description: 'Authenticated user profile — read-only view including role',
        },
        {
          name: 'SAP Auth',
          description:
            'SAP OData session auth — validates SAP user/password via CSRF token fetch and issues an app session cookie.',
        },
        { name: 'Items', description: 'Item CRUD operations' },
        {
          name: 'Purchase Orders',
          description:
            'SAP Purchase Order data — header and line items fetched live from API_PURCHASEORDER_PROCESS_SRV.',
        },
        {
          name: 'Products',
          description: 'SAP Product master data — fetched live from API_PRODUCT_SRV.',
        },
        {
          name: 'Material Stock',
          description: 'SAP Material Stock quantities — fetched live from API_MATERIAL_STOCK_SRV.',
        },
        {
          name: 'Goods Issue',
          description:
            'Goods Issue to Cost Center — cost center, material, and stock validation plus posting via API_COSTCENTER_SRV, API_PRODUCT_SRV, API_MATERIAL_STOCK_SRV, and API_MATERIAL_DOCUMENT_SRV (movement type 201).',
        },
        {
          name: 'Physical Inventory',
          description:
            'Physical Inventory — document headers, items, and serial numbers from API_PHYSICAL_INVENTORY_DOC_SRV.',
        },
        {
          name: 'Production Orders',
          description:
            'SAP Production Order data and GR/GI posting — fetched from API_PRODUCTION_ORDER_2_SRV; goods receipt/issue posted via API_MATERIAL_DOCUMENT_SRV (movement types 101 and 261).',
        },
      ],
    },
  });

  if (process.env.NODE_ENV !== 'production') {
    await fastify.register(fastifySwaggerUi, {
      routePrefix: '/api-docs',
      uiConfig: { docExpansion: 'list', deepLinking: true, tryItOutEnabled: true },
      staticCSP: true,
    });
  }
}

export const swaggerPlugin = fp(_swaggerPlugin, { name: 'swagger-plugin' });
