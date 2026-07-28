/**
 * GET /health — liveness/readiness probe.
 *
 * Returns 200 { status: "ok" } when the service is healthy.
 * This route is excluded from rate limiting.
 */

/** @param {import('fastify').FastifyInstance} app */
export async function healthRoutes(app) {
  app.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'string' },
            },
          },
        },
      },
    },
    async (_req, reply) => {
      return reply.send({ status: 'ok' });
    },
  );
}
