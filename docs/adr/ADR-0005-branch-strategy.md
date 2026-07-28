# ADR-0005: Squash-Merge to Main with Task Branches and Worktrees

- **Status:** Accepted
- **Date:** 2025-01-31
- **Deciders:** Platform team
- **Related:** docs/ci-cd.md

## Context

The project needs a branch strategy that supports parallel task development (build skill
worktrees), clean commit history on `main`, and conventional commit enforcement for
automated versioning.

## Decision

We will use **squash-merge to `main`** with the following branch naming:

| Branch type | Pattern |
|-------------|---------|
| Feature/task | `task/T-NNN-<kebab-slug>` |
| Setup (serial) | `chore/setup-<timestamp>` |
| Release | `release/v<semver>` |
| Hotfix | `hotfix/T-NNN-<slug>` |

Rules:
- Every task branch is created in a git worktree at `.worktrees/T-NNN/`.
- PR squash-merge commit MUST follow Conventional Commits format.
- `main` is protected: CI must pass before merge; branch deleted after merge.
- `.worktrees/` is listed in `.gitignore`.

## Alternatives Considered

- **Git Flow (develop + release branches)** — extra complexity not warranted for a small
  single-service repo; release skill handles versioning from `main` directly.
- **Merge commits** — noisy history; harder to read `git log` for changelog generation.
- **Rebase merges** — possible but worktrees work better with squash (no rebase conflicts
  when multiple agents work in parallel).

## Consequences

**Positive**
- Clean, linear history on `main` — one commit per task.
- Conventional commit squash message enables automated semver bump.
- Parallel agents in separate worktrees do not interfere with each other.
- `.worktrees/` in `.gitignore` keeps the repo clean.

**Negative / trade-offs**
- Individual commits in task branches are lost on squash — not a problem since the PR
  description and task plan capture the context.

**Neutral / follow-ups**
- Configure GitHub repo: Settings → Branches → allow only "Squash merging".
- Add `.worktrees/` and `planning/.build/` to `.gitignore`.
