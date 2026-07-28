# ADR-0002: Use Fastify as the HTTP Framework

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** RFC-0001, ADR-0001

## Context

A Node.js HTTP framework is needed to route requests, validate path parameters, handle
errors, and integrate plugins (rate limiting, CORS, logging). The choice significantly
affects throughput, developer ergonomics, and security posture (built-in schema validation
vs. manual guard code).

## Decision

We will use **Fastify v5** as the HTTP framework.

## Alternatives Considered

- **Express** — largest community, most tutorials; however no built-in schema validation
  (requires separate `express-validator` or `joi`), 3–5× lower throughput than Fastify in
  benchmarks, and not natively ESM-ready.
- **Hono** — very lightweight and edge-compatible; smaller community and plugin ecosystem
  relative to Fastify.

## Consequences

**Positive**
- Fastify's JSON Schema-based input validation prevents injection attacks without extra
  libraries — satisfies `openspec/specs/security/spec.md` input validation requirements.
- Built-in Pino structured logging.
- `@fastify/rate-limit` and `@fastify/cors` are first-party plugins with good maintenance.
- Performance: handles hundreds of thousands of req/s in benchmarks — p99 ≤ 50 ms target
  is easily met even under load.
- `fastify.inject()` makes HTTP integration tests fast without a real server socket.

**Negative / trade-offs**
- Smaller Stack Overflow community than Express; docs require reading API reference more
  carefully.
- Plugin versions must be aligned with Fastify major version (v5 in this case).

**Neutral / follow-ups**
- Pin Fastify v5.x in `package.json` with a caret range `^5.0.0`.
- Review `@fastify/rate-limit` and `@fastify/cors` versions for v5 compatibility before
  scaffolding.
