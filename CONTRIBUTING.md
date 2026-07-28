# Contributing to counter-service

## Commit Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).

### Format

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | When to use | Version bump |
|------|-------------|-------------|
| `feat` | New feature | Minor |
| `fix` | Bug fix | Patch |
| `perf` | Performance improvement | Patch |
| `refactor` | Code refactoring | None |
| `test` | Tests only | None |
| `docs` | Documentation only | None |
| `ci` | CI/CD changes | None |
| `chore` | Maintenance | None |
| `build` | Build system changes | None |
| `BREAKING CHANGE` | Breaking API change (in footer) | Major |

### Examples

```bash
feat(api): add DELETE /counters/:name endpoint
fix(store): handle concurrent increment correctly
perf(store): switch to Map for O(1) lookups
docs(readme): update environment variable table
ci: add trivy container scan to build job
chore(deps): bump fastify from 5.3.0 to 5.3.3
```

### Task reference

Include the task ID in the commit footer when working on a tracked task:

```
feat(api): add rate limiting per IP

Refs: T-021
```

## Branch naming

```
task/T-NNN-short-description    # feature branches
fix/T-NNN-short-description     # bug fix branches
chore/short-description         # maintenance
```

## Pull Requests

- All PRs must pass CI (Security, Test, Build).
- Squash merge only.
- Branch is deleted after merge.
- CHANGELOG.md updated by the `release` skill — no manual edits required.
