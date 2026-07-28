/**
 * GET /openapi.json — returns the OpenAPI 3.1 schema document.
 */

const openapiDocument = {
  openapi: '3.1.0',
  info: {
    title: 'counter-service',
    version: '0.1.0',
    description: 'REST microservice — tracks named in-memory counters via POST/GET /counters/:name',
  },
  paths: {
    '/counters/{name}': {
      post: {
        summary: 'Increment a named counter',
        description: 'Increments the counter by 1, creating it if it does not exist.',
        operationId: 'incrementCounter',
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[a-zA-Z0-9_-]+$',
              minLength: 1,
              maxLength: 100,
            },
          },
        ],
        responses: {
          200: {
            description: 'Counter incremented successfully',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'number' },
                  },
                  required: ['name', 'value'],
                },
              },
            },
          },
          400: {
            description: 'Invalid counter name',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          429: {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
      get: {
        summary: 'Read a named counter',
        description: 'Returns the current value of a named counter.',
        operationId: 'getCounter',
        parameters: [
          {
            name: 'name',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[a-zA-Z0-9_-]+$',
              minLength: 1,
              maxLength: 100,
            },
          },
        ],
        responses: {
          200: {
            description: 'Counter value',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'number' },
                  },
                  required: ['name', 'value'],
                },
              },
            },
          },
          400: {
            description: 'Invalid counter name',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
          404: {
            description: 'Counter not found',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    error: { type: 'string' },
                    name: { type: 'string' },
                  },
                  required: ['error', 'name'],
                },
              },
            },
          },
          429: {
            description: 'Too many requests',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/Error' },
              },
            },
          },
        },
      },
    },
    '/health': {
      get: {
        summary: 'Health check',
        description: 'Returns 200 OK when the service is running normally.',
        operationId: 'healthCheck',
        responses: {
          200: {
            description: 'Service is healthy',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    status: { type: 'string', enum: ['ok'] },
                  },
                  required: ['status'],
                },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      Error: {
        type: 'object',
        properties: {
          error: { type: 'string' },
        },
        required: ['error'],
      },
    },
  },
};

/** @param {import('fastify').FastifyInstance} app */
export async function openapiRoutes(app) {
  app.get(
    '/openapi.json',
    {
      config: { rateLimit: false },
      // No response schema — let Fastify serialize the full document as-is
    },
    async (_req, reply) => {
      return reply.send(openapiDocument);
    },
  );
}
