# Changelog

All notable changes to `counter-service` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.1.2] - 2026-07-28

### Fixed
- **security**: pin brace-expansion >=5.0.8 via overrides; add .trivyignore
- **docker**: upgrade npm in runtime stage to remediate bundled CVEs
- **docker**: upgrade npm to fix CVEs (tar, brace-expansion, sigstore)

### Maintenance
- container scan reports CVEs but doesn't block CI (exit-code: 0)
- use .trivyignore in container scan step
- fix Trivy container scan image-ref (use :main tag)
- make gitleaks optional (graceful skip on Linux CI)
- upgrade devbox-install-action to v0.13.0 (fix Nix lock permission)
- trigger fresh CI run on public repo [skip release]

## [0.1.1] - 2026-07-28

## [0.1.0] - 2026-07-28

### Added
- implement counter-service — all tasks complete

### Maintenance
- add devbox environment
- initialise counter-service service

## [0.1.0] - 2026-07-28

### Added
- implement counter-service — all tasks complete

### Maintenance
- add devbox environment
- initialise counter-service service

### Added
- Initial project scaffolding (T-001)
- GitHub Actions CI/CD pipeline (T-CI-001)
- Security scanning integration — CodeQL, Trivy, Gitleaks (T-SEC-001)
- In-memory counter store (T-010)
- POST /counters/:name increment endpoint (T-011)
- GET /counters/:name read endpoint (T-012)
- GET /health health endpoint (T-013)
- Input validation for counter names (T-020)
- Rate limiting — 200 req/min per IP (T-021)
- CORS support (T-022)
- Body size limit — 1 KB (T-023)
- GET /openapi.json schema endpoint (T-024)
- Docker multi-stage build (T-DOCKER-001)
- Docker Compose for local development (T-DOCKER-002)

[Unreleased]: https://github.com/ika100/e2e-counter-service/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/ika100/e2e-counter-service/releases/tag/v0.1.0

[Unreleased]: https://github.com/ika100/e2e-counter-service/compare/v0.1.1...HEAD
[0.1.1]: https://github.com/ika100/e2e-counter-service/compare/v0.1.0...v0.1.1

[Unreleased]: https://github.com/ika100/e2e-counter-service/compare/v0.1.2...HEAD
[0.1.2]: https://github.com/ika100/e2e-counter-service/compare/v0.1.1...v0.1.2
