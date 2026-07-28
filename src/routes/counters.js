/**
 * Counter routes — POST /counters/:name and GET /counters/:name.
 */

/** @type {import('fastify').FastifySchema} */
const nameParamSchema = {
  type: 'object',
  properties: {
    name: {
      type: 'string',
      pattern: '^[a-zA-Z0-9_-]+$',
      minLength: 1,
      maxLength: 100,
    },
  },
  required: ['name'],
};

const successResponseSchema = {
  200: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      value: { type: 'number' },
    },
    required: ['name', 'value'],
  },
};

const errorResponseSchema = {
  400: {
    type: 'object',
    properties: {
      error: { type: 'string' },
    },
    required: ['error'],
  },
  404: {
    type: 'object',
    properties: {
      error: { type: 'string' },
      name: { type: 'string' },
    },
    required: ['error', 'name'],
  },
};

const listResponseSchema = {
  200: {
    type: 'object',
    properties: {
      counters: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            name: { type: 'string' },
            value: { type: 'number' },
          },
          required: ['name', 'value'],
        },
      },
    },
    required: ['counters'],
  },
};

/**
 * @param {import('fastify').FastifyInstance} app
 * @param {{ store: import('../store.js').CounterStore }} opts
 */
export async function counterRoutes(app, opts) {
  const { store } = opts;

  // GET /counters — list all counters sorted by name
  app.get(
    '/counters',
    {
      schema: {
        response: listResponseSchema,
      },
    },
    async (_req, reply) => {
      return reply.send({ counters: store.list() });
    },
  );

  // POST /counters/:name — increment (or create) a named counter
  app.post(
    '/counters/:name',
    {
      schema: {
        params: nameParamSchema,
        response: { ...successResponseSchema, ...errorResponseSchema },
      },
    },
    async (req, reply) => {
      const { name } = req.params;
      const value = store.increment(name);
      return reply.send({ name, value });
    },
  );

  // GET /counters/:name — read a named counter
  app.get(
    '/counters/:name',
    {
      schema: {
        params: nameParamSchema,
        response: { ...successResponseSchema, ...errorResponseSchema },
      },
    },
    async (req, reply) => {
      const { name } = req.params;
      const value = store.get(name);

      if (value === undefined) {
        return reply.status(404).send({ error: 'Counter not found', name });
      }

      return reply.send({ name, value });
    },
  );

  // DELETE /counters/:name — remove a named counter
  app.delete(
    '/counters/:name',
    {
      schema: {
        params: nameParamSchema,
        response: {
          204: { type: 'null' },
          ...errorResponseSchema,
        },
      },
    },
    async (req, reply) => {
      const { name } = req.params;
      const deleted = store.delete(name);

      if (!deleted) {
        return reply.status(404).send({ error: 'Counter not found', name });
      }

      return reply.status(204).send();
    },
  );
}
