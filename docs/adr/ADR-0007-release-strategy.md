# ADR-0007: Semver + Conventional Commits + Automated CHANGELOG

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** RFC-0001, docs/ci-cd.md

## Context

`counter-service` is part of `e2e-platform`. Its Docker image tag must be predictable for
the GitOps repo (`apps/counter-service/values.yaml`) to pin specific versions. We need a
release process that derives the version from commit history, generates a CHANGELOG, and
triggers the GitOps update automatically.

## Decision

We will use **Semantic Versioning 2.0** with **Conventional Commits** on `main`. The
`release` skill automates the version bump, CHANGELOG update, git tag, GitHub Release
creation, Docker image push, and GitOps PR.

Commit type → semver mapping:

| Commit type | SemVer bump |
|-------------|------------|
| `feat` | minor |
| `fix`, `perf`, `security` | patch |
| `BREAKING CHANGE` in footer | major |
| `refactor`, `chore`, `ci`, `docs`, `test` | none |

CHANGELOG format follows [Keep a Changelog](https://keepachangelog.com/).

Starting version: `0.1.0` (initial development; `1.0.0` = first stable release).

## Alternatives Considered

- **Calendar versioning (CalVer)** — not suitable for a library/API where semantic meaning
  of breaking changes matters.
- **Manual versioning** — error-prone; release skill requires conventional commits to
  determine bump automatically.
- **`standard-version` / `semantic-release` npm packages** — functional but add npm
  dependencies to the project; the release skill handles this without adding tooling.

## Consequences

**Positive**
- Automated version determination removes human error.
- GitOps PR is automatically opened after each release, keeping the cluster in sync.
- CHANGELOG is machine-generated but human-readable.
- Docker images are tagged with both the semver (`1.2.3`) and `latest` on stable releases.

**Negative / trade-offs**
- Developers must use conventional commit format for squash-merge commits — requires
  discipline or commit message enforcement.

**Neutral / follow-ups**
- Consider adding `commitlint` to CI to enforce commit message format on PRs if team grows.
- Pre-release versions (`-alpha.N`, `-beta.N`, `-rc.N`) are supported via
  `PI_RELEASE_PRERELEASE` env var in the release skill.
