/**
 * Fastify application factory.
 *
 * Creates and configures the Fastify instance with:
 *   - CORS support (@fastify/cors)
 *   - Rate limiting (@fastify/rate-limit, 200 req/min per IP, /health exempt)
 *   - 1 KB body size limit
 *   - Custom error handler for validation errors → 400 { error: "Invalid counter name" }
 *   - Counter routes (POST/GET /counters/:name)
 *   - Health route (GET /health)
 *   - OpenAPI schema route (GET /openapi.json)
 *
 * @param {object} [options]
 * @param {string} [options.corsOrigin] - CORS allowed origin (default: '*')
 * @param {number} [options.rateLimitMax] - Max requests per window (default: 200)
 * @param {string} [options.rateLimitTimeWindow] - Time window (default: '1 minute')
 * @param {string} [options.logLevel] - Fastify log level (default: 'info')
 * @returns {Promise<import('fastify').FastifyInstance>}
 */

import Fastify from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import { CounterStore } from './store.js';
import { counterRoutes } from './routes/counters.js';
import { healthRoutes } from './routes/health.js';
import { openapiRoutes } from './routes/openapi.js';
import { versionRoutes } from './routes/version.js';

export async function buildApp(options = {}) {
  const {
    corsOrigin = process.env.CORS_ORIGIN ?? '*',
    rateLimitMax = 200,
    rateLimitTimeWindow = '1 minute',
    logLevel = process.env.LOG_LEVEL ?? 'info',
  } = options;

  const app = Fastify({
    logger: { level: logLevel },
    bodyLimit: 1024, // 1 KB — T-023
    // Allow param up to 200 chars so the schema validator (maxLength: 100) can
    // return a proper 400 instead of Fastify's built-in 414 URI Too Long.
    routerOptions: { maxParamLength: 200 },
  });

  // CORS — T-022
  await app.register(cors, {
    origin: corsOrigin,
  });

  // Rate limiting — T-021 (200 req/min per IP; /health exempt via config.rateLimit = false)
  await app.register(rateLimit, {
    max: rateLimitMax,
    timeWindow: rateLimitTimeWindow,
  });

  // Custom error handler — maps Fastify validation errors to spec format (T-020)
  app.setErrorHandler((err, _req, reply) => {
    // Fastify validation errors (schema failures)
    if (err.validation) {
      return reply.status(400).send({ error: 'Invalid counter name' });
    }
    // Body too large (bodyLimit exceeded) — T-023
    if (err.statusCode === 413) {
      return reply.status(413).send({ error: 'Payload Too Large' });
    }
    // Rate limit — forward 429 with custom body
    if (err.statusCode === 429) {
      reply.header('retry-after', err.header?.['retry-after'] ?? err.retryAfter ?? 60);
      return reply.status(429).send({ error: 'Too many requests' });
    }
    // Pass other errors through
    app.log.error(err);
    return reply.status(err.statusCode ?? 500).send({ error: err.message });
  });

  // Shared counter store
  const store = new CounterStore();

  // Register routes
  await app.register(healthRoutes, { store });
  await app.register(openapiRoutes);
  await app.register(versionRoutes);
  await app.register(counterRoutes, { store });

  return app;
}
