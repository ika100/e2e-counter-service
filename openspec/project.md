---
project-type: microservice
github-repo: ika100/e2e-counter-service
docker-registry: ghcr.io/ika100
docker-image: ghcr.io/ika100/e2e-counter-service
gitops-repo: https://github.com/ika100/e2e-gitops.git
gitops-values-path: apps/counter-service/values.yaml
base-branch: main
version: 0.1.2
---

# counter-service

REST microservice — tracks named in-memory counters via POST/GET /counters/:name.

## Purpose

`counter-service` provides a lightweight, named in-memory counter store. Any client can
create, increment, and read counters identified by an arbitrary name string. The service
is stateless at the process boundary — counters live only in process memory and reset on
restart. It is consumed primarily by the `frontend` SPA in the e2e-platform.

## Users & Context

- **Primary consumer:** `frontend` SPA (ika100/e2e-frontend) — calls the API from a
  browser via a backend-for-frontend or directly through a configured base URL.
- **Platform:** Kubernetes cluster managed by ArgoCD (ika100/e2e-gitops).
- **Environment:** Containerised; single-process; no external storage.

## Scope

**In scope:**
- Named counter creation on first increment.
- Increment a named counter by 1 (`POST /counters/:name`).
- Read the current value of a named counter (`GET /counters/:name`).
- Health/liveness endpoint (`GET /health`).
- JSON API responses.

**Non-goals:**
- Persistent storage (counters are in-memory only).
- Decrement, reset, or delete operations.
- Multi-node synchronization / distributed counters.
- Authentication / per-user counter isolation (counters are global within the process).
- Rate limiting beyond basic abuse prevention.

## Success Metrics

- `GET /counters/:name` responds in < 50 ms p99 under normal load.
- Zero CRITICAL/HIGH security vulnerabilities in CI scans.
- 100% of increment and read scenarios covered by automated tests.
- Docker image < 150 MB.

## Conventions

- **Language:** Node.js 22 (ESM modules).
- **Framework:** Fastify (lightweight, schema-first).
- **Test runner:** `node --test` (built-in Node.js test runner).
- **Linter:** ESLint with flat config.
- **Code style:** 2-space indent, single quotes, trailing commas.
- **Directory layout:**
  ```
  src/
  ├── app.js          # Fastify app factory
  ├── routes/
  │   ├── counters.js # POST/GET /counters/:name
  │   └── health.js   # GET /health
  └── store.js        # In-memory counter store
  test/
  ├── unit/
  └── integration/
  ```

## Links

- Platform: [platform.yaml](../../platform.yaml)
- GitHub: https://github.com/ika100/e2e-counter-service
- Architecture: [docs/architecture.md](../docs/architecture.md)
- RFC: [docs/rfcs/RFC-0001-tech-stack.md](../docs/rfcs/RFC-0001-tech-stack.md)
- Task Plan: [planning/task-plan.md](../planning/task-plan.md)
