# ADR-0006: Security Scanning with CodeQL, Trivy, and Gitleaks

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** RFC-0001, openspec/specs/security/spec.md, docs/ci-cd.md

## Context

Every PR and push to `main` must pass security gates before merge. The release pipeline
must additionally scan the Docker container image before pushing to the registry. We need
tools that run in GitHub Actions without external accounts or paid licenses.

## Decision

We will use the following three-layer scanning approach:

| Layer | Tool | When | Gate |
|-------|------|------|------|
| SAST | GitHub CodeQL (`security-extended` query set) | Every PR + main push | CRITICAL/HIGH blocks merge |
| Dependency SCA | `npm audit --audit-level=high` (via `devbox run security`) | Every PR + main push | CRITICAL/HIGH blocks merge |
| Filesystem CVE | Trivy Action (filesystem scan, SARIF upload) | Every PR + main push | CRITICAL/HIGH blocks merge |
| Secrets | Gitleaks (`devbox run security`) | Every PR + main push | Any secret blocks merge |
| Container CVE | Trivy Action (image scan, SARIF upload) | After Docker build on main/tags | CRITICAL/HIGH blocks release |

## Alternatives Considered

- **Snyk** — excellent SCA, but requires a Snyk account and token; free tier limits apply.
- **Semgrep** — good SAST alternative to CodeQL; requires a separate account for rules.
- **TruffleHog** — alternative to Gitleaks; Gitleaks is simpler to run in CI without
  account setup.

## Consequences

**Positive**
- All tools are free and account-free for this use case.
- SARIF results upload to GitHub Security tab — centralised visibility.
- `devbox run security` provides a consistent local scan command matching CI.
- Container image is scanned before `latest` tag is pushed — prevents shipping
  vulnerable images.

**Negative / trade-offs**
- CodeQL autobuild for JavaScript requires the devbox environment to be installed first
  (so Node.js is in PATH). The CI workflow handles this ordering.
- Trivy filesystem scan may flag false positives in dev dependencies not present in the
  final container — review SARIF results per release.

**Neutral / follow-ups**
- Add `.trivyignore` file if specific CVEs are accepted with documented rationale.
- Schedule a weekly Trivy scan of the latest pushed image to catch newly published CVEs.
