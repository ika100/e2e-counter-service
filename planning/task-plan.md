# Coding Task Plan — counter-service

> Traceability: each task links to the requirement(s) and ADR(s) it implements and the
> test(s) that verify it. Tasks that can run in parallel are marked **[parallel]** — the
> build skill uses this to dispatch concurrent agents in isolated git worktrees.

## Project Type

`project-type: microservice`

## Milestones

- **M1 — Foundation:** CI pipeline, security scanning, project scaffolding, Docker green.
- **M2 — Walking skeleton:** Thinnest deployable counter API — increment + read working.
- **M3 — Full API:** Validation, CORS, rate limiting, health endpoint, OpenAPI schema.
- **M4 — Release ready:** All features complete, security clean, release automation in place.

---

## Foundational Tasks (serial — run in this order)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-001 | Project scaffolding & structure | — | — | `package.json` with `type: "module"`, `scripts`, and prod deps (`fastify`, `@fastify/rate-limit`, `@fastify/cors`); dev deps (`eslint`); directory layout (`src/`, `test/`); `.gitignore` (includes `.worktrees/`, `planning/.build/`, `node_modules/`, `coverage/`); `README.md` stub | — | S | M1 |
| T-DEVBOX-001 | Devbox environment setup | ADR-0008-tooling-devbox | T-001 | Existing `devbox.json` verified correct (nodejs@22, all standard scripts); `devbox.lock` committed; `devbox run test` exits 0 on empty test suite; `devbox run lint` exits 0 | — | S | M1 |
| T-CI-001 | GitHub Actions CI pipeline | ADR-0004-ci-cd-platform | T-DEVBOX-001 | `.github/workflows/ci.yml` written using the template in `docs/ci-cd.md`; jobs: `security`, `test`, `build`, `release`, `gitops-update`; `IMAGE_NAME` set to `ghcr.io/ika100/e2e-counter-service`; `REGISTRY` set to `ghcr.io`; CodeQL language set to `javascript`; Trivy action configured; `devbox run lint` and `devbox run test` in test job; Docker build/push in build job; release job triggers on `v*` tags; GitOps update job opens PR to `ika100/e2e-gitops` | TC-SEC-001 | M | M1 |
| T-SEC-001 | Security scanning integration | ADR-0006-security-scanning | T-CI-001 | CodeQL `security-extended` queries in `security` job; Trivy FS scan in `security` job with SARIF upload; Gitleaks in `devbox run security` script; Trivy image scan in `build` job with SARIF upload; CRITICAL/HIGH findings fail CI; results visible in GitHub Security tab | TC-SEC-001, TC-SEC-002, TC-SEC-003, TC-SEC-004 | M | M1 |
| T-REL-001 | Semver & CHANGELOG automation | ADR-0007-release-strategy | T-001 | `openspec/project.md` frontmatter has `version: 0.1.0`; `CHANGELOG.md` stub created with `## [Unreleased]` section; conventional commit format documented in `CONTRIBUTING.md`; `release` skill can run end-to-end against the repo | — | S | M1 |
| T-DOCKER-001 | Dockerfile (multi-stage, non-root) | ADR-0003-containerization | T-001 | Two-stage `Dockerfile`: builder stage installs prod deps with `npm ci --omit=dev`; runtime stage is `node:22-alpine`, copies from builder, runs as `node` user (UID 1000), exposes port 3001, CMD is `["node", "src/server.js"]`; `.dockerignore` excludes `node_modules`, `.git`, `test/`, `docs/`, `.worktrees/`, `planning/`, `coverage/`; `docker build .` succeeds; `devbox run image-build` succeeds; image is < 150 MB | TC-SEC-004 | S | M1 |
| T-DOCKER-002 | Docker Compose for local dev/test | — | T-DOCKER-001 | `docker-compose.yml` defines `counter-service` service; maps host port `3001` → container `3001`; passes `PORT`, `CORS_ORIGIN`, `LOG_LEVEL` env vars; `docker compose up` starts the service; `curl http://localhost:3001/health` returns `{"status":"ok"}` | — | S | M1 |

---

## Feature Tasks (waves — grouped by parallelizability)

### Wave 1 [parallel] — Core API (no feature dependencies, branch from main after M1)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-010 | In-memory counter store module | counter-api/spec.md REQ: Increment counter, Read counter value | T-001 | `src/store.js` exports `CounterStore` class with `increment(name): number` and `get(name): number \| undefined`; `increment` on new key starts at 1; sequential increments return correct values; unit tests pass with `node --test` | TC-001, TC-002, TC-003 | S | M2 |
| T-011 | POST /counters/:name — increment endpoint | counter-api/spec.md REQ: Increment counter, JSON response contract | T-001 | Route registered in Fastify; calls `store.increment(name)`; returns `200 { name, value }`; integration tests use Fastify `.inject()` | TC-004, TC-005, TC-006 | S | M2 |
| T-012 | GET /counters/:name — read endpoint | counter-api/spec.md REQ: Read counter value, JSON response contract | T-001 | Route registered in Fastify; calls `store.get(name)`; returns `200 { name, value }` if exists; returns `404 { error, name }` if not found; integration tests via `.inject()` | TC-007, TC-008 | S | M2 |
| T-013 | GET /health — health endpoint | counter-api/spec.md REQ: Health endpoint | T-001 | Route registered; returns `200 { status: "ok" }`; integration test verifies status and body; health route is NOT counted against rate limit | TC-009 | XS | M2 |

### Wave 2 [parallel] — Hardening & Features (depends on Wave 1 merged)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-020 | Input validation — counter name | counter-api/spec.md REQ: Counter name validation; security/spec.md REQ: Input validation | T-010, T-011, T-012 | Fastify JSON Schema on `params.name`: pattern `^[a-zA-Z0-9_-]+$`, `minLength: 1`, `maxLength: 100`; names outside pattern or over 100 chars return `400 { error: "Invalid counter name" }`; customErrorHandler maps Fastify validation errors to the spec format | TC-010, TC-011, TC-012, TC-013 | S | M3 |
| T-021 | Rate limiting — 200 req/min per IP | security/spec.md REQ: Rate limiting | T-011, T-012 | `@fastify/rate-limit` registered with `max: 200`, `timeWindow: "1 minute"`; `/health` excluded via `config.rateLimit = false`; exceeding limit returns `429 { error: "Too many requests" }` with `Retry-After` header; integration test using `inject` loop | TC-014, TC-015 | S | M3 |
| T-022 | CORS support | counter-api/spec.md REQ: CORS support; contracts/spec.md CORS header | T-011, T-012 | `@fastify/cors` registered with `origin` read from `CORS_ORIGIN` env var (default `*`); preflight OPTIONS request for `/counters/test` returns `200` with `Access-Control-Allow-Origin` header; integration test verifies header | TC-016 | S | M3 |
| T-023 | Body size limit | security/spec.md REQ: Input validation (oversized payload) | T-011 | Fastify `bodyLimit` set to `1024` bytes (1 KB); POST with body > 1 KB returns `413 Payload Too Large` | TC-017 | XS | M3 |
| T-024 | GET /openapi.json — schema endpoint | contracts/spec.md REQ: OpenAPI schema (SHOULD) | T-011, T-012, T-013 | Route returns `200` with valid OpenAPI 3.1 JSON document describing all three endpoints; document includes schemas for success and error responses; validated with `ajv` in test | TC-018 | M | M3 |

### Wave 3 [parallel] — New features (after Wave 2)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-030 | GET /counters — list all counters | counter-api/spec.md | T-010, T-012 | `GET /counters` returns `200 { counters: [{ name, value }] }` sorted by name; returns `[]` when no counters exist; respects rate limit and CORS headers; integration test via `.inject()` | TC-030, TC-031, TC-032 | S | M3 |
| T-031 | DELETE /counters/:name — reset a counter | counter-api/spec.md | T-010, T-011 | `DELETE /counters/:name` returns `204 No Content` on success; `404 { error, name }` if counter does not exist; name validation same as other routes; integration test via `.inject()` | TC-033, TC-034, TC-035 | S | M3 |

---

### Wave 4 [serial] — Security hardening (after Wave 3)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-SEC-002 | Dependency audit & remediation | security/spec.md REQ: Dependency CVE hygiene | T-CI-001 | `devbox run security` (`npm audit --audit-level=high`) exits 0; no CRITICAL/HIGH CVEs in `npm audit` output; all dependencies up to date | TC-SEC-002 | S | M4 |

---

## Release Tasks (serial — run after all feature waves)

| ID | Title | Implements | Depends on | Acceptance criteria | Tests | Est | Milestone |
|----|-------|-----------|------------|---------------------|-------|-----|-----------|
| T-REL-002 | First versioned release (v0.1.0) | ADR-0007-release-strategy | all feature tasks merged | `planning/.build/release-version.txt` written with `0.1.0`; `CHANGELOG.md` updated with `[0.1.0]` section; `v0.1.0` tag pushed; GitHub Release created at `ika100/e2e-counter-service`; Docker image `ghcr.io/ika100/e2e-counter-service:0.1.0` and `:latest` pushed; GitOps PR opened on `ika100/e2e-gitops` to set `image.tag: 0.1.0` | — | S | M4 |

---

## Sequencing

```
M1 Foundation (serial):
  T-001 → T-DEVBOX-001 → T-CI-001 → T-SEC-001 → T-REL-001
                       → T-DOCKER-001 → T-DOCKER-002

M2 Walking skeleton — Wave 1 (parallel from main):
  T-010  T-011  T-012  T-013

M3 Full API — Wave 2 (parallel, after Wave 1 merged):
  T-020  T-021  T-022  T-023  T-024

M4 Security & Release (serial, after Wave 2 merged):
  T-SEC-002 → T-REL-002
```

**Critical path:** T-001 → T-CI-001 → T-010 → T-011 → T-020 → T-SEC-002 → T-REL-002

---

## Git Flow per Task (parallel waves)

```
main (HEAD after M1)
├─ .worktrees/T-010/  → branch: task/T-010-counter-store     [agent A]
├─ .worktrees/T-011/  → branch: task/T-011-post-counter      [agent B]
├─ .worktrees/T-012/  → branch: task/T-012-get-counter       [agent C]
└─ .worktrees/T-013/  → branch: task/T-013-health            [agent D]

After Wave 1 merged → start Wave 2:
├─ .worktrees/T-020/  → branch: task/T-020-validation        [agent A]
├─ .worktrees/T-021/  → branch: task/T-021-rate-limit        [agent B]
├─ .worktrees/T-022/  → branch: task/T-022-cors              [agent C]
├─ .worktrees/T-023/  → branch: task/T-023-body-limit        [agent D]
└─ .worktrees/T-024/  → branch: task/T-024-openapi           [agent E]
```

---

## Size Legend

| Est | Meaning |
|-----|---------|
| XS | < 30 min |
| S | < 2 hours |
| M | < 4 hours |
| L | < 1 day |

---

## Definition of Done (all tasks)

Code implemented · tests written and passing · acceptance criteria met ·
`devbox run test` exits 0 · `devbox run lint` exits 0 · security scans pass
(no CRITICAL/HIGH) · PR opened with conventional commit title (`T-NNN` in footer) ·
CI green on PR · squash-merged to `main` · worktree cleaned up.

## Release Definition of Done

All feature tasks merged to `main` · CI green on `main` · no open security alerts ·
`CHANGELOG.md` updated · GitHub Release created · Docker image pushed to `ghcr.io` ·
GitOps PR opened on `ika100/e2e-gitops`.
