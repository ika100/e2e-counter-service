/**
 * GET /version — returns service name, version, and GitHub URL.
 *
 * Version is read from package.json at module load time.
 * This route is excluded from rate limiting.
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { join, dirname } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, '../../package.json'), 'utf8'));

const VERSION_INFO = {
  name: 'counter-service',
  version: pkg.version,
  gitUrl: 'https://github.com/ika100/e2e-counter-service',
};

/**
 * @param {import('fastify').FastifyInstance} app
 */
const SCHEMA = {
  config: { rateLimit: false },
  schema: {
    response: {
      200: {
        type: 'object',
        required: ['name', 'version', 'gitUrl'],
        properties: {
          name:    { type: 'string' },
          version: { type: 'string' },
          gitUrl:  { type: 'string' },
        },
      },
    },
  },
};

export async function versionRoutes(app) {
  const handler = async (_req, reply) => reply.send(VERSION_INFO);

  // /version — direct access (tests, internal, external deployments)
  // /counters/version — alias for Ingress path-based routing in local k3d
  //   Fastify prefers specific literal routes over parameterised /:name,
  //   so this is matched before GET /counters/:name when path is exactly /counters/version.
  for (const path of ['/version', '/counters/version']) {
    app.get(path, SCHEMA, handler);
  }
}
