/**
 * GET /health — liveness/readiness probe.
 *
 * Returns 200 { status: "ok", counters: <number of unique counter names> }
 * when the service is healthy.
 * This route is excluded from rate limiting.
 */

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ store: import('../store.js').CounterStore }} opts
 */
export async function healthRoutes(app, { store }) {
  app.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        response: {
          200: {
            type: 'object',
            required: ['status', 'counters'],
            properties: {
              status: { type: 'string' },
              counters: { type: 'integer' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      return reply.send({ status: 'ok', counters: store.size() });
    },
  );
}
