# counter-service — Architecture

## Context & Goals

`counter-service` is a stateless REST microservice in the `e2e-platform` that tracks
named in-memory counters. Its goals are:

1. Provide fast, simple `POST /counters/:name` (increment) and `GET /counters/:name`
   (read) endpoints.
2. Auto-create counters on first increment — no explicit create step.
3. Run as a single-process container on Kubernetes with minimal resource footprint.
4. Serve as a dependency of `ika100/e2e-frontend`.

Spec: [openspec/specs/counter-api/spec.md](../openspec/specs/counter-api/spec.md)
Contract: [openspec/specs/contracts/spec.md](../openspec/specs/contracts/spec.md)

---

## High-Level Component View

```
┌─────────────────────────────────────────────────────────────────────┐
│  e2e-platform (Kubernetes cluster)                                   │
│                                                                       │
│  ┌─────────────┐     HTTP/JSON      ┌──────────────────────────────┐│
│  │  frontend   │ ──────────────────▶│       counter-service         ││
│  │  (SPA/SSR)  │                    │                               ││
│  │ ika100/     │                    │  ┌──────────────────────────┐ ││
│  │ e2e-frontend│                    │  │  Fastify HTTP Server     │ ││
│  └─────────────┘                    │  │  (port 3001)             │ ││
│                                     │  │                          │ ││
│                                     │  │  Routes:                 │ ││
│                                     │  │  POST /counters/:name    │ ││
│                                     │  │  GET  /counters/:name    │ ││
│                                     │  │  GET  /health            │ ││
│                                     │  │  GET  /openapi.json      │ ││
│                                     │  └──────────┬───────────────┘ ││
│                                     │             │                  ││
│                                     │  ┌──────────▼───────────────┐ ││
│                                     │  │  In-Memory Counter Store  │ ││
│                                     │  │  Map<string, number>     │ ││
│                                     │  └──────────────────────────┘ ││
│                                     └──────────────────────────────┘│
│                                                                       │
│  ┌──────────────────────────────────────────────────────────────────┐│
│  │  ArgoCD (ika100/e2e-gitops → apps/counter-service/values.yaml)  ││
│  └──────────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────────┘
```

---

## Component Responsibilities

| Component | Responsibility |
|-----------|---------------|
| **Fastify HTTP Server** | Parses requests, validates path params, routes to handlers, serializes JSON responses, enforces rate limits and body size limits |
| **Counter Route handlers** | Delegates to the store; maps store results to HTTP responses; returns 404 when counter is missing |
| **Health Route** | Returns `{ status: "ok" }` — exempt from rate limiting |
| **In-Memory Counter Store** | Holds a `Map<name, value>` in process memory; provides `increment(name)` and `get(name)` operations; reset on process restart |
| **Validation middleware** | Enforces name regex `[a-zA-Z0-9_-]` and max-length 100 via Fastify JSON Schema on route params |
| **Rate limiter** | `@fastify/rate-limit` plugin — 200 req/min per IP, returns 429 with `Retry-After` |
| **CORS** | `@fastify/cors` plugin — origin configurable via `CORS_ORIGIN` env var |

---

## Key Flows

### Flow 1 — Increment a counter (happy path)

```
Client
  │
  │  POST /counters/visits
  ▼
Fastify router
  │
  ├─ Validate path param "visits" against regex + length → PASS
  ├─ Rate limit check → PASS
  │
  ▼
CounterStore.increment("visits")
  ├─ If exists: map.set("visits", map.get("visits") + 1)
  └─ If new:    map.set("visits", 1)
  │
  ▼
Response: 200 { "name": "visits", "value": <new_value> }
```

### Flow 2 — Read a missing counter

```
Client
  │
  │  GET /counters/ghost
  ▼
Fastify router
  │
  ├─ Validate "ghost" → PASS
  ├─ Rate limit check → PASS
  │
  ▼
CounterStore.get("ghost")
  └─ Returns undefined
  │
  ▼
Response: 404 { "error": "Counter not found", "name": "ghost" }
```

### Flow 3 — Invalid counter name

```
Client
  │
  │  POST /counters/bad name!
  ▼
Fastify router
  └─ Schema validation fails (contains space and '!')
  │
  ▼
Response: 400 { "error": "Invalid counter name" }
```

---

## Directory Layout

```
/
├── src/
│   ├── app.js          # Fastify app factory (registers plugins + routes)
│   ├── store.js        # In-memory counter store module
│   ├── server.js       # Entry point: creates app, starts listening on PORT
│   └── routes/
│       ├── counters.js # POST + GET /counters/:name handlers
│       └── health.js   # GET /health handler
├── test/
│   ├── unit/
│   │   ├── store.test.js        # Unit tests for counter store
│   │   └── validation.test.js   # Unit tests for name validation logic
│   └── integration/
│       ├── counters.test.js     # HTTP integration tests via Fastify inject
│       └── health.test.js       # Health endpoint test
├── Dockerfile           # Multi-stage, node:22-alpine, non-root
├── docker-compose.yml   # Local dev stack
├── devbox.json
├── devbox.lock
├── package.json
└── .github/workflows/ci.yml
```

---

## Cross-Cutting Concerns

### Logging

- **Library:** Pino (Fastify's built-in logger) — structured JSON logs.
- **Level:** configurable via `LOG_LEVEL` env var (default `info`).
- **Sensitive fields:** Authorization headers are NOT logged.

### Error Handling

- Fastify's built-in error serializer returns `{ error: string }` on all 4xx/5xx.
- Unhandled promise rejections and uncaught exceptions are caught by Fastify and logged
  with Pino before returning a `500`.

### Configuration

- All config is via environment variables (see contract spec).
- No config files to manage; suitable for 12-factor deployment.

### Observability

- Pino JSON logs are emitted to stdout — collected by the cluster log aggregator.
- `GET /health` provides liveness/readiness probe target.
- Future: add `/metrics` (Prometheus) if needed.

### Data Model

The counter store is a simple `Map<string, number>` in process memory:

```
{
  "visits":  42,
  "clicks":  7,
  "signups": 1
}
```

No persistence — intentional. Counters reset on pod restart.

---

## Non-Functional Strategy

| Concern | Strategy |
|---------|---------|
| **Performance** | In-memory Map ops are O(1); Fastify is one of the fastest Node.js frameworks; target p99 ≤ 50 ms |
| **Security** | Fastify JSON Schema validation; `@fastify/rate-limit`; non-root container; Trivy image scan in CI |
| **Availability** | Kubernetes liveness + readiness probes on `/health`; HPA if traffic grows |
| **Scalability** | Horizontal scale is possible (counters are per-pod); distributed counter sync is out of scope |
| **Simplicity** | No ORM, no database, no message queue — pure in-memory; reduces operational surface |

---

## Links

- Tech stack RFC: [docs/rfcs/RFC-0001-tech-stack.md](rfcs/RFC-0001-tech-stack.md)
- CI/CD design: [docs/ci-cd.md](ci-cd.md)
- ADRs: [docs/adr/](adr/)
- Platform gitops: https://github.com/ika100/e2e-gitops
- Frontend (consumer): https://github.com/ika100/e2e-frontend
