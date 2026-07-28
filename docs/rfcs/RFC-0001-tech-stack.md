# RFC-0001: Tech Stack Selection for counter-service

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Spawns ADRs:** ADR-0001, ADR-0002, ADR-0003, ADR-0004, ADR-0005, ADR-0006, ADR-0007

---

## Context

`counter-service` is a lightweight REST microservice with a single concern: tracking named
in-memory counters. Requirements are:

- Low latency (p99 ≤ 50 ms).
- Simple HTTP API (POST/GET /counters/:name, GET /health).
- No external storage.
- Runs in a Kubernetes container.
- Consumed by a React/Vite frontend (CORS required).
- Part of the `e2e-platform` — should share language/tooling conventions where possible.

The `frontend` service uses React/TypeScript (Node.js ecosystem). Using Node.js for
`counter-service` keeps the platform's toolchain consistent.

---

## Layer Decisions

### 1. Language & Runtime

| Option | Pros | Cons |
|--------|------|------|
| **Node.js 22** ✅ | Async I/O, excellent HTTP libraries, same ecosystem as frontend, LTS until 2027, devbox already pins nodejs@22 | Single-threaded (not a concern for this use case) |
| Go | Very fast, tiny binaries | Different toolchain, overkill for a small service |
| Python | Simple, readable | Higher memory footprint, slower cold start |

**Recommendation: Node.js 22 (LTS).**

### 2. HTTP Framework

| Option | Pros | Cons |
|--------|------|------|
| **Fastify** ✅ | Fastest Node.js HTTP framework, JSON Schema validation built-in, plugin ecosystem (rate-limit, cors), Pino logging out-of-box | Smaller community than Express |
| Express | Huge community, very familiar | No built-in validation, 3-5× slower throughput than Fastify |
| Hono | Tiny, edge-compatible | Newer, smaller community |

**Recommendation: Fastify v5.**

Key plugins:
- `@fastify/rate-limit` — rate limiting
- `@fastify/cors` — CORS headers

### 3. In-Memory Store

A native JavaScript `Map<string, number>` is sufficient:
- O(1) get/set.
- No external dependency.
- Thread-safe within Node.js's single-threaded event loop.

No Redis, no database — by design (see non-goals in spec).

### 4. Test Runner

| Option | Pros | Cons |
|--------|------|------|
| **Node.js built-in (`node --test`)** ✅ | Zero dependencies, available since Node 18, consistent with devbox.json script | Less mature than Jest/Vitest |
| Jest | Mature, excellent mocking | Extra dependency, slower startup |
| Vitest | Fast, ESM-native | Extra dependency |

**Recommendation: Node.js built-in test runner.**

Use `supertest` or Fastify's `.inject()` for HTTP integration tests.

### 5. Linting

**ESLint** with flat config — consistent with the frontend's toolchain. Configured for
ESM modules. No Prettier (use ESLint formatting rules to keep it simple).

### 6. Containerization

Multi-stage Dockerfile:
- **Build stage:** `node:22-alpine` — install prod dependencies only (`npm ci --omit=dev`).
- **Runtime stage:** `node:22-alpine` — copy build artifacts; run as non-root user `node`
  (UID 1000); expose port 3001.

Target image size: < 150 MB.

### 7. Devbox

Existing `devbox.json` already pins `nodejs@22`, `trivy`, `gitleaks` and defines the
standard scripts (`test`, `lint`, `security`, `image-build`, `image-scan`).
`devbox.lock` is committed for reproducibility.

### 8. CI/CD

GitHub Actions using the microservice pipeline template. All CI steps run via
`devbox run <script>`. Security gates: CodeQL (SAST), Trivy (filesystem + container),
Gitleaks (secrets). Docker image pushed to `ghcr.io/ika100/e2e-counter-service`.

### 9. Release

Semver via conventional commits. The `release` skill bumps `openspec/project.md` version,
updates `CHANGELOG.md`, pushes a `v*` tag, creates a GitHub Release, builds and pushes
the Docker image, and opens a GitOps PR to update `apps/counter-service/values.yaml`.

---

## Accepted Stack Summary

| Layer | Choice |
|-------|--------|
| Runtime | Node.js 22 LTS |
| Framework | Fastify v5 |
| Rate limiting | `@fastify/rate-limit` |
| CORS | `@fastify/cors` |
| Logging | Pino (via Fastify) |
| In-memory store | Native `Map` |
| Testing | `node --test` + Fastify `.inject()` |
| Linting | ESLint (flat config) |
| Container base | `node:22-alpine` (multi-stage) |
| Dev environment | Devbox (nodejs@22 + trivy + gitleaks) |
| CI/CD | GitHub Actions |
| Registry | ghcr.io/ika100/e2e-counter-service |
| GitOps | ArgoCD (ika100/e2e-gitops) |
| Versioning | SemVer + Conventional Commits |
