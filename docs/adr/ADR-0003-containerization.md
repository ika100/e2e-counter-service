# ADR-0003: Multi-Stage Alpine Dockerfile with Non-Root User

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** RFC-0001, openspec/specs/security/spec.md

## Context

`counter-service` runs in a Kubernetes pod managed by ArgoCD. The container image must be
minimal (to reduce attack surface and pull time) and must not run as root (security
requirement). The Dockerfile is the primary build artifact pushed to
`ghcr.io/ika100/e2e-counter-service`.

## Decision

We will use a **two-stage Dockerfile** based on `node:22-alpine`:

1. **Build stage (`builder`):** copies source, runs `npm ci --omit=dev` to install only
   production dependencies, prunes dev artifacts.
2. **Runtime stage:** copies only `node_modules`, `src/`, and `package.json` from the
   builder; sets user to the built-in `node` user (UID 1000); exposes port 3001; entrypoint
   is `node src/server.js`.

## Alternatives Considered

- **Single-stage Dockerfile** — simpler, but includes dev tooling in the final image,
  increasing size and attack surface.
- **Distroless image** — smallest possible base; however Alpine is nearly as small and
  much easier to debug (has `sh`, `curl`, etc. available for troubleshooting).
- **node:22-slim (Debian-based)** — larger than Alpine; no significant benefit.

## Consequences

**Positive**
- `node:22-alpine` base keeps image well under 150 MB target.
- Non-root user satisfies container hardening security requirement.
- Multi-stage ensures dev dependencies (`eslint`, test tools) do not enter the runtime image.
- Trivy scans the final image in CI; Alpine's minimal surface minimizes CVE exposure.

**Negative / trade-offs**
- Alpine uses `musl libc` instead of `glibc` — native Node.js addons that require glibc
  could fail. Fastify and its plugins are pure JS, so this is not a concern here.

**Neutral / follow-ups**
- Pin the exact Alpine tag (e.g., `node:22.x.y-alpine3.21`) in the Dockerfile to prevent
  base image drift — the build skill should look up the current patch version.
- Add `.dockerignore` to exclude `node_modules`, `.git`, `test/`, `docs/`, `.worktrees/`.
