# ADR-0008: Devbox for Reproducible Development Environments

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** RFC-0001, references/devbox.md

## Context

All agents (build, release, security) that operate on this repo must use identical tool
versions. CI must also use the same versions to prevent "works locally, fails in CI" bugs.
Without a pinned environment, Node.js versions, Trivy versions, and Gitleaks versions
can drift between developer machines and CI runners.

## Decision

We will use **Devbox** with a committed `devbox.lock` for all development and CI environments.

The existing `devbox.json` pins:
- `nodejs@22`
- `git@latest`
- `trivy@latest`
- `gitleaks@latest`

Standard scripts exposed:

| Script | Command |
|--------|---------|
| `test` | `node --test` |
| `lint` | `npx eslint . --max-warnings=0` |
| `lint-fix` | `npx eslint . --fix` |
| `build` | `npm run build` |
| `security` | `npm audit --audit-level=high && gitleaks detect --no-git --quiet` |
| `image-build` | `docker build -t $IMAGE_NAME:local .` |
| `image-scan` | `trivy image --severity CRITICAL,HIGH --exit-code 1 $IMAGE_NAME:local` |

CI uses `jetify-com/devbox-install-action@v0.4.0` with `enable-cache: true`.

## Alternatives Considered

- **`actions/setup-node` per CI job** — each job configures Node.js independently; no
  guarantee of version parity with local dev; security tools (trivy, gitleaks) need
  separate install steps.
- **Docker-in-Docker for CI** — heavier; not needed when Devbox's Nix cache provides
  fast, reproducible installs.
- **`.nvmrc` + manual tool installs** — works for Node.js but doesn't manage trivy,
  gitleaks, or other tools.

## Consequences

**Positive**
- `devbox.lock` pins exact Nix store hashes — bit-for-bit identical environments.
- `devbox run <script>` is the only command agents need; no language-specific knowledge
  required for CI steps.
- Cache warm hits in CI are ~5 s; cold install ~30 s.
- `gh` (GitHub CLI) and `docker` are **NOT** in `devbox.json` — they are system
  prerequisites managed outside (per devbox.md conventions).

**Negative / trade-offs**
- Developers must install Devbox once (`curl -fsSL https://get.jetify.com/devbox | bash`).
- `devbox.lock` must be re-committed when packages are added or updated.

**Neutral / follow-ups**
- `devbox.lock` is committed and never `.gitignore`d.
- `node_modules/` IS in `.gitignore` (installed by `init_hook` when entering devbox shell).
- When adding new npm packages to the project, run `devbox run npm install` inside the
  shell so the `init_hook` stays correct.
