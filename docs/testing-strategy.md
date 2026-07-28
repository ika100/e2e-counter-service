# Testing Strategy — counter-service

## Overview

`counter-service` is a thin, in-memory REST service. The test strategy follows the classic
pyramid with a strong bias towards unit and integration tests (fast, reliable) and minimal
end-to-end tests (reserved for CI smoke tests against a running container).

Security non-functional tests are mandatory at every CI gate.

---

## Test Pyramid

```
         ┌────────────┐
         │   E2E / smoke   │  ← 2–3 tests, Docker container
         │  (1–2 tests)    │     or docker-compose
         └──────┬─────┘
                │
         ┌──────▼──────────┐
         │  Integration     │  ← HTTP layer via Fastify .inject()
         │  (10–15 tests)   │     no real socket, tests full route pipeline
         └──────┬───────────┘
                │
         ┌──────▼───────────┐
         │   Unit tests      │  ← Pure logic: store, validation
         │  (10–15 tests)    │     node --test, no HTTP
         └───────────────────┘
```

---

## Tooling & Configuration

| Concern | Tool | Config |
|---------|------|--------|
| Test runner | `node --test` (built-in, Node.js 22) | `package.json` `test` script |
| HTTP test client | Fastify `app.inject()` | No real socket — fast, no port conflicts |
| Code coverage | `node --test --experimental-coverage` | Output to `coverage/` |
| Linting | ESLint (flat config, `eslint.config.mjs`) | `devbox run lint` |
| SAST | GitHub CodeQL (`security-extended`) | GitHub Actions `security` job |
| Dependency scan | `npm audit` + Trivy FS | `devbox run security` |
| Secrets scan | Gitleaks | `devbox run security` |
| Container scan | Trivy image scan | GitHub Actions `build` job |

---

## Coverage Targets

| Module | Target |
|--------|--------|
| `src/store.js` | 100% (pure logic, easy to cover fully) |
| `src/routes/counters.js` | ≥ 90% |
| `src/routes/health.js` | 100% |
| `src/app.js` | ≥ 80% |
| Overall | ≥ 85% |

CI does NOT fail on coverage drops below target (informational for now); a coverage gate
can be added in a future task once the baseline is established.

---

## Test File Layout

```
test/
├── unit/
│   ├── store.test.js            # CounterStore unit tests
│   └── validation.test.js       # Name regex/length validation unit tests
└── integration/
    ├── counters.test.js          # POST + GET /counters/:name via inject()
    ├── health.test.js            # GET /health via inject()
    ├── validation.test.js        # 400/413/429 error paths via inject()
    └── openapi.test.js           # GET /openapi.json via inject()
```

---

## Test Data

| Fixture | Value | Purpose |
|---------|-------|---------|
| Valid name | `"visits"` | Happy path |
| Valid name max length | `"a".repeat(100)` | Boundary — must succeed |
| Invalid name (space) | `"hello world"` | Must return 400 |
| Invalid name (symbols) | `"foo!bar"` | Must return 400 |
| Invalid name (too long) | `"a".repeat(101)` | Must return 400 |
| Non-existent counter | `"ghost"` | GET must return 404 |

---

## CI Test Gates

| Stage | What runs | Failure action |
|-------|-----------|---------------|
| PR | `devbox run lint` + `devbox run test` | Block merge |
| PR | CodeQL SAST + Trivy FS + Gitleaks | Block merge |
| main push | Same as PR | Alert on Slack/GitHub (post-merge) |
| Release tag | Trivy image scan | Block registry push |

---

## Non-Functional Test Approach

### Performance

- Manual load test: `autocannon -c 50 -d 10 http://localhost:3001/counters/perf-test`
- Not enforced in CI (no SLA in current Kubernetes setup).
- Target: p99 ≤ 50 ms at 100 req/s on local machine.

### Security (CI-enforced)

See test cases TC-SEC-001 through TC-SEC-004 in the test plan.

---

## Definition of Done — Testing

For each feature task, "done" means:

1. All new code paths have at least one unit or integration test.
2. All acceptance criteria from the task plan have a corresponding test case.
3. `devbox run test` exits 0 locally.
4. CI `Test` job is green on the PR.
5. No new CRITICAL/HIGH security findings introduced.
