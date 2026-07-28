# ADR-0001: Use Node.js 22 as the Runtime

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** RFC-0001, openspec/specs/counter-api/spec.md

## Context

`counter-service` needs a runtime for a lightweight HTTP service. The broader `e2e-platform`
already uses Node.js for the frontend. Using the same runtime keeps the toolchain consistent
and reduces cognitive overhead.

## Decision

We will use **Node.js 22 LTS** (pinned in `devbox.json` as `nodejs@22`).

## Alternatives Considered

- **Go** — faster binary startup, but adds a second language to the platform.
- **Python 3.12** — higher memory usage, slower HTTP throughput than Node.js for I/O-bound
  services.

## Consequences

**Positive**
- Single language runtime across the platform (frontend + counter-service).
- Node.js 22 is LTS until April 2027 — long maintenance window.
- Excellent async I/O performance — more than sufficient for in-memory counter ops.
- Built-in test runner (`node --test`) removes a testing dependency.

**Negative / trade-offs**
- Single-threaded event loop — not a concern for this service's workload.
- Slightly larger container image than Go, but still < 150 MB on Alpine.

**Neutral / follow-ups**
- Pin the exact Node.js version in `devbox.lock` and `Dockerfile` to avoid drift.
