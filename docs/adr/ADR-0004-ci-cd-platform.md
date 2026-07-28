# ADR-0004: GitHub Actions as CI/CD Platform

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** RFC-0001, docs/ci-cd.md

## Context

The service needs an automated CI/CD pipeline that runs on every PR and push to `main`,
enforces security gates, builds and pushes Docker images, and triggers GitOps updates. The
platform is hosted on GitHub (`ika100` org).

## Decision

We will use **GitHub Actions** as the CI/CD platform with workflow files in
`.github/workflows/ci.yml`.

## Alternatives Considered

- **CircleCI** — capable, but requires a separate account and billing; no native GitHub
  Security tab integration.
- **Jenkins** — self-hosted; high operational overhead; no SARIF upload support without plugins.
- **GitLab CI** — excellent, but the platform is GitHub-native; migration overhead.

## Consequences

**Positive**
- Native GitHub integration: PR status checks, Security tab (SARIF), Packages (ghcr.io),
  Releases — all in one platform.
- `GITHUB_TOKEN` is auto-provisioned per job; no manual credential setup for registry push.
- Free tier covers the platform's usage for public repos.
- `jetify-com/devbox-install-action` integrates cleanly for reproducible environments.
- CodeQL is free for public repos and integrates natively.

**Negative / trade-offs**
- GitHub Actions is not portable if the org migrates off GitHub.
- Job queuing can introduce delays during peak usage (free tier runners).

**Neutral / follow-ups**
- Configure branch protection rules on `main` to require CI status checks.
- Use `concurrency` groups to cancel stale PR runs.
