# Test Plan — counter-service

> Every OpenSpec scenario maps to at least one test case. Every coding task names the tests
> that prove it. See `docs/testing-strategy.md` for the overall approach, tooling, coverage
> targets, and CI gates.

## Coverage Summary

| Level | Framework/Tool | Where it runs | Target |
|-------|----------------|---------------|--------|
| Unit | `node --test` | local + CI | 100% store, ≥ 85% overall |
| Integration | `node --test` + Fastify `inject()` | local + CI | all HTTP routes |
| E2E / smoke | `curl` or `node --test` vs live container | CI (after Docker build) | critical journeys |
| Non-functional | CodeQL, Trivy, Gitleaks, npm audit | CI (security job) | zero CRITICAL/HIGH |

---

## Test Cases

### Unit Tests — Counter Store

| Test ID | Level | Verifies (Spec / Scenario) | For task | Preconditions | Steps | Expected result |
|---------|-------|--------------------------|----------|---------------|-------|-----------------|
| TC-001 | unit | counter-api REQ: Increment counter / Increment a counter that does not yet exist | T-010 | Fresh `CounterStore` instance | Call `store.increment("newkey")` | Returns `1`; `store.get("newkey")` returns `1` |
| TC-002 | unit | counter-api REQ: Increment counter / Increment an existing counter | T-010 | `CounterStore` with `"visits"` at value `5` (5 increments applied) | Call `store.increment("visits")` | Returns `6` |
| TC-003 | unit | counter-api REQ: Increment counter / Multiple sequential increments | T-010 | Fresh `CounterStore` | Call `store.increment("clicks")` 3 times | Returns `1`, `2`, `3` on each call |
| TC-004u | unit | counter-api REQ: Read counter value / Read an existing counter | T-010 | `CounterStore` with `"logins"` at `42` | Call `store.get("logins")` | Returns `42` |
| TC-005u | unit | counter-api REQ: Read counter value / Read a counter that has never been incremented | T-010 | Fresh `CounterStore` | Call `store.get("ghost")` | Returns `undefined` |

### Unit Tests — Validation

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-010u | unit | counter-api REQ: Counter name validation / Valid name at maximum boundary | T-020 | Validation function | Pass name of 100 chars `[a-zA-Z0-9_-]` | Returns valid / no error |
| TC-011u | unit | counter-api REQ: Counter name validation / Name exceeds max length | T-020 | Validation function | Pass name of 101 chars | Throws or returns error |
| TC-012u | unit | counter-api REQ: Counter name validation / Name contains invalid characters | T-020 | Validation function | Pass `"bad name!"` | Throws or returns error |

---

### Integration Tests — POST /counters/:name

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-004 | integration | counter-api REQ: Increment counter / auto-create; JSON response contract | T-011 | Fastify app via `app.inject()`; no prior state for `"newpage"` | `POST /counters/newpage` | Status `200`; body `{ name: "newpage", value: 1 }`; `Content-Type: application/json` |
| TC-005 | integration | counter-api REQ: Increment counter / increment existing | T-011 | `"visits"` previously incremented to 5 | `POST /counters/visits` | Status `200`; body `{ name: "visits", value: 6 }` |
| TC-006 | integration | counter-api REQ: JSON response contract / Content-Type on success | T-011 | Any valid counter name | `POST /counters/test` | Response header `Content-Type` matches `application/json` |

### Integration Tests — GET /counters/:name

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-007 | integration | counter-api REQ: Read counter value / Read an existing counter | T-012 | Counter `"logins"` exists at `42` | `GET /counters/logins` | Status `200`; body `{ name: "logins", value: 42 }` |
| TC-008 | integration | counter-api REQ: Read counter value / Read a counter that has never been incremented | T-012 | No counter `"ghost"` | `GET /counters/ghost` | Status `404`; body `{ error: "Counter not found", name: "ghost" }` |

### Integration Tests — GET /health

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-009 | integration | counter-api REQ: Health endpoint | T-013 | Fastify app running | `GET /health` | Status `200`; body `{ status: "ok" }` |

### Integration Tests — Input Validation

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-010 | integration | counter-api REQ: Counter name validation / Name exceeds max length | T-020 | App with validation | `POST /counters/<101-char-name>` | Status `400`; body `{ error: "Invalid counter name" }` |
| TC-011 | integration | counter-api REQ: Counter name validation / Name contains invalid characters | T-020 | App with validation | `POST /counters/bad%20name` and `GET /counters/foo!bar` | Status `400`; body `{ error: "Invalid counter name" }` |
| TC-012 | integration | security REQ: Input validation / SQL injection via counter name | T-020 | App with validation | `POST /counters/'; DROP TABLE counters--` | Status `400`; no server error |
| TC-013 | integration | counter-api REQ: Counter name validation / Valid name at max boundary | T-020 | App with validation | `POST /counters/<100-char-valid-name>` | Status `200`; counter created |
| TC-017 | integration | security REQ: Oversized payload | T-023 | App with body limit | `POST /counters/test` with `Content-Length: 2000` body | Status `413 Payload Too Large` |

### Integration Tests — Rate Limiting

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-014 | integration | security REQ: Rate limiting / Client exceeds rate limit | T-021 | Rate limiter set to 5 req/min for test (override for speed) | Send 6 requests in quick succession | First 5 return `200`; 6th returns `429` with `Retry-After` header |
| TC-015 | integration | security REQ: Rate limiting / Health endpoint exempt | T-021 | Rate limit exceeded (same IP) | `GET /health` after exceeding limit | Status `200` |

### Integration Tests — CORS

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-016 | integration | counter-api REQ: CORS support / Cross-origin request receives CORS headers | T-022 | App with CORS enabled; `CORS_ORIGIN=http://localhost:5173` | `GET /counters/test` with `Origin: http://localhost:5173` header | Response has `Access-Control-Allow-Origin: http://localhost:5173` |

### Integration Tests — OpenAPI

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-018 | integration | contracts REQ: OpenAPI schema / OpenAPI schema is reachable | T-024 | App running | `GET /openapi.json` | Status `200`; response is valid JSON; has `openapi: "3.1.0"` field; describes `/counters/{name}` and `/health` paths |

### Integration Tests — Unknown Routes

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|-----------------|
| TC-019 | integration | counter-api REQ: Unknown routes return 404 | T-011 | App running | `GET /undefined-path` | Status `404` |

---

## Non-Functional / Security Tests

| Test ID | Level | Verifies | For task | Tool | Pass condition |
|---------|-------|---------|----------|------|----------------|
| TC-SEC-001 | non-functional | No CRITICAL/HIGH SAST alerts in JavaScript code | T-SEC-001, T-CI-001 | CodeQL (`security-extended`) | Zero CRITICAL/HIGH alerts in SARIF output uploaded to GitHub Security tab |
| TC-SEC-002 | non-functional | No CRITICAL/HIGH dependency CVEs | T-SEC-001, T-SEC-002 | `npm audit --audit-level=high` + Trivy FS scan | Exit code `0`; no CRITICAL/HIGH CVEs |
| TC-SEC-003 | non-functional | No secrets or credentials in source code | T-SEC-001 | Gitleaks (`devbox run security`) | No leaks detected; exit code `0` |
| TC-SEC-004 | non-functional | Container image has no CRITICAL/HIGH OS CVEs | T-DOCKER-001, T-SEC-001 | Trivy image scan in GitHub Actions `build` job | Exit code `0`; zero CRITICAL/HIGH CVEs in `ghcr.io/ika100/e2e-counter-service:sha-<SHA>` |

---

## Traceability Check

| Spec requirement | Scenarios | Test IDs |
|-----------------|-----------|---------|
| counter-api: Increment counter | auto-create, existing, sequential | TC-001, TC-002, TC-003, TC-004, TC-005 |
| counter-api: Read counter value | existing, not-found | TC-004u, TC-005u, TC-007, TC-008 |
| counter-api: Counter name validation | over-length, bad chars, boundary | TC-010u, TC-011u, TC-012u, TC-010, TC-011, TC-012, TC-013 |
| counter-api: JSON response contract | Content-Type on success/error | TC-006 |
| counter-api: Unknown routes return 404 | undefined route | TC-019 |
| counter-api: Health endpoint | healthy response | TC-009 |
| counter-api: CORS support | origin header present | TC-016 |
| counter-api: Performance NFR | p99 ≤ 50 ms | manual load test (autocannon) |
| counter-api: Availability NFR | health probe | TC-009 |
| security: Input validation | injection, path traversal, oversize | TC-012, TC-017 |
| security: Rate limiting | 429 on excess, health exempt | TC-014, TC-015 |
| security: Sensitive data handling | no auth header in logs | manual review |
| security: Container hardening | non-root, no CVEs | TC-SEC-004 |
| security: Dependency CVE hygiene | clean npm audit | TC-SEC-002 |
| security: No secrets in source | gitleaks clean | TC-SEC-003 |
| contracts: API contract stability | value is number | TC-007, TC-004 |
| contracts: OpenAPI schema | /openapi.json valid | TC-018 |

---

### Version Endpoint Test Cases (T-040)

| Test ID | Level | Verifies | For task | Preconditions | Steps | Expected result |
|---------|-------|---------|----------|---------------|-------|------------------|
| TC-VER-001 | Integration | `GET /version` returns 200 with correct body | T-040 | Fastify app started via `buildApp()` | `app.inject({ method: 'GET', url: '/version' })` | Status 200; body `{ name: 'counter-service', version: <matches package.json>, gitUrl: 'https://github.com/ika100/e2e-counter-service' }` |
| TC-VER-002 | Integration | `version` field matches `package.json` | T-040 | Same as above | Compare `response.body.version` with `JSON.parse(readFileSync('package.json')).version` | Values are equal |
| TC-VER-003 | Integration | `/version` excluded from rate limit | T-040 | Rate limiter registered | Call `GET /version` 250 times (above 200/min limit) | All 250 responses return 200 (not 429) |

---

### Coverage checklist

- [x] Every requirement scenario appears in the "Verifies" column at least once.
- [x] Every task in the task plan appears in the "For task" column.
- [x] Error, boundary, and negative cases have dedicated test cases (TC-008, TC-010–TC-015, TC-017, TC-019).
- [x] About feature version endpoint test cases TC-VER-001–TC-VER-003 added (T-040).
