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
export async function versionRoutes(app) {
  app.get(
    '/version',
    {
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
    },
    async (_req, reply) => {
      return reply.send(VERSION_INFO);
    },
  );
}
