# CI/CD Pipeline Design — counter-service

## Overview

The CI/CD pipeline for `counter-service` follows a **security → test → build → release →
deploy** flow implemented as a single GitHub Actions workflow (`.github/workflows/ci.yml`).
All commands run through Devbox for reproducibility.

**Registry:** `ghcr.io/ika100/e2e-counter-service`
**GitOps:** `https://github.com/ika100/e2e-gitops` → `apps/counter-service/values.yaml`

---

## Pipeline Stages

```
Push / PR
    │
    ├─── security ─────────────────────────────────┐
    │    CodeQL SAST + Trivy FS + Gitleaks          │
    │    Blocks PR on CRITICAL/HIGH                 │
    │                                               │
    ├─── test ─────────────────────────────────────┤
    │    eslint + node --test + coverage upload     │
    │    Blocks PR on failures                      │
    │                                               │  (parallel)
    └─── [both must pass] ──────────────────────────┘
              │
              ▼
         build (Docker)
         ├─ PR:   build only (no push)
         │        └─ Trivy image scan (informational on PR)
         └─ main: build + push :sha-<SHA> tag
                  └─ Trivy image scan (CRITICAL/HIGH blocks)
              │
              ▼ (on v* tag only)
         release
         ├─ Build + push :X.Y.Z and :latest
         ├─ Create GitHub Release (from .release-notes.md)
         └─ gitops-update
              └─ Bump image.tag in apps/counter-service/values.yaml
              └─ Open PR in ika100/e2e-gitops
```

---

## Branch Strategy

See [ADR-0005](adr/ADR-0005-branch-strategy.md).

| Branch | Trigger | Actions |
|--------|---------|---------|
| `task/T-NNN-*` | Push | security + test |
| `main` (PR) | PR opened/updated | security + test + build (no push) |
| `main` (push) | Squash merge | security + test + build (push SHA tag) |
| `v*` (tag) | Tag pushed | security + test + build + release + gitops-update |

Branch protection on `main`:
- Required checks: `Security`, `Test`, `Build`
- Squash merge only; delete branch on merge.

---

## Security Gates

See [ADR-0006](adr/ADR-0006-security-scanning.md) and [references/security.md](https://github.com/ika100/e2e-counter-service).

| Gate | Tool | Severity threshold | Blocks |
|------|------|--------------------|--------|
| SAST | CodeQL (`security-extended`) | CRITICAL, HIGH | PR merge |
| Dependency CVEs | npm audit + Trivy FS | CRITICAL, HIGH | PR merge |
| Secrets | Gitleaks | Any secret | PR merge |
| Container CVEs | Trivy image scan | CRITICAL, HIGH | Release push |

SARIF results for CodeQL and Trivy are uploaded to **GitHub Security → Code Scanning** tab.

---

## Environment Variables & Secrets

| Name | Type | Used in |
|------|------|---------|
| `GITHUB_TOKEN` | Auto | Registry login, GitHub Release creation |
| `GITOPS_PAT` | Secret | Clone + PR on e2e-gitops repo |
| `GITOPS_REPO` | Secret | GitOps repo name (ika100/e2e-gitops) |
| `GITOPS_VALUES_PATH` | Variable | `apps/counter-service/values.yaml` |

---

## Devbox Integration

All CI steps use `jetify-com/devbox-install-action@v0.4.0` with `enable-cache: true`.
Commands are invoked as `devbox run <script>`:

```yaml
- uses: jetify-com/devbox-install-action@v0.4.0
  with:
    enable-cache: true
- run: devbox run lint
- run: devbox run test
- run: devbox run security
```

This ensures Node.js 22, Trivy, and Gitleaks are at the exact same versions as local dev.

---

## Release Strategy

See [ADR-0007](adr/ADR-0007-release-strategy.md).

1. The `release` skill analyzes commits since the last tag.
2. Determines semver bump from conventional commit types.
3. Updates `openspec/project.md` version frontmatter.
4. Updates `CHANGELOG.md`.
5. Generates `.release-notes.md` (AI-written).
6. Pushes `vX.Y.Z` tag → triggers `release` job in CI.
7. CI builds Docker image, tags `:X.Y.Z` and `:latest`, pushes to `ghcr.io`.
8. CI creates GitHub Release using `.release-notes.md`.
9. CI opens PR in `ika100/e2e-gitops` to set `image.tag: X.Y.Z`.

---

## GitHub Actions Workflow Template

The following template (from `assets/github-actions-microservice.yml`) is adapted and
written to `.github/workflows/ci.yml` by task `T-CI-001`:

```yaml
name: CI

on:
  push:
    branches: [main]
    tags: ["v*"]
  pull_request:
    branches: [main]

env:
  REGISTRY:   ghcr.io
  IMAGE_NAME: ghcr.io/ika100/e2e-counter-service

permissions:
  contents:        read
  packages:        write
  security-events: write
  pull-requests:   read

jobs:
  security:
    name: Security
    runs-on: ubuntu-latest
    permissions:
      contents: read
      security-events: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - uses: github/codeql-action/init@v3
        with:
          languages: javascript
          queries: security-extended
      - uses: github/codeql-action/autobuild@v3
      - uses: github/codeql-action/analyze@v3
        with: { upload: true }
      - name: Local security scan
        run: devbox run security
      - name: Dependency vulnerability scan (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: fs
          scan-ref: .
          format: sarif
          output: trivy-fs-results.sarif
          severity: CRITICAL,HIGH
          exit-code: "1"
      - name: Upload Trivy results
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-fs-results.sarif
          category: trivy-dependencies

  test:
    name: Test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - name: Lint
        run: devbox run lint
      - name: Test
        run: devbox run test
        env:
          NODE_ENV: test
      - name: Upload coverage
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: [security, test]
    outputs:
      sha-tag: ${{ env.REGISTRY }}/ghcr.io/ika100/e2e-counter-service:sha-${{ github.sha }}
    steps:
      - uses: actions/checkout@v4
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        if: github.event_name != 'pull_request'
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - uses: docker/metadata-action@v5
        id: meta
        with:
          images: ghcr.io/ika100/e2e-counter-service
          tags: |
            type=sha,prefix=sha-
            type=ref,event=branch
            type=ref,event=pr
      - name: Build (and push if not PR)
        uses: docker/build-push-action@v5
        with:
          context: .
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Container vulnerability scan (Trivy)
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ghcr.io/ika100/e2e-counter-service:sha-${{ github.sha }}
          format: sarif
          output: trivy-image-results.sarif
          severity: CRITICAL,HIGH
          exit-code: "1"
      - name: Upload container scan results
        if: always()
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: trivy-image-results.sarif
          category: trivy-container

  release:
    name: Release
    runs-on: ubuntu-latest
    needs: [security, test, build]
    if: startsWith(github.ref, 'refs/tags/v')
    permissions:
      contents: write
      packages: write
    steps:
      - uses: actions/checkout@v4
        with: { fetch-depth: 0 }
      - uses: jetify-com/devbox-install-action@v0.4.0
        with: { enable-cache: true }
      - uses: docker/setup-buildx-action@v3
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - name: Extract semver from tag
        id: version
        run: echo "version=${GITHUB_REF#refs/tags/v}" >> $GITHUB_OUTPUT
      - name: Build and push release image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: true
          tags: |
            ghcr.io/ika100/e2e-counter-service:${{ steps.version.outputs.version }}
            ghcr.io/ika100/e2e-counter-service:latest
          cache-from: type=gha
          cache-to: type=gha,mode=max
      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          body_path: .release-notes.md
          token: ${{ secrets.GITHUB_TOKEN }}

  gitops-update:
    name: GitOps Update
    runs-on: ubuntu-latest
    needs: [release]
    if: startsWith(github.ref, 'refs/tags/v')
    steps:
      - name: Check secrets configured
        id: check
        run: |
          if [ -z "${{ secrets.GITOPS_PAT }}" ] || [ -z "${{ secrets.GITOPS_REPO }}" ]; then
            echo "skip=true" >> $GITHUB_OUTPUT
          else
            echo "skip=false" >> $GITHUB_OUTPUT
          fi
      - uses: actions/checkout@v4
        if: steps.check.outputs.skip == 'false'
        with:
          repository: ${{ secrets.GITOPS_REPO }}
          token: ${{ secrets.GITOPS_PAT }}
          path: gitops
      - uses: jetify-com/devbox-install-action@v0.4.0
        if: steps.check.outputs.skip == 'false'
        with:
          enable-cache: true
          project-path: gitops
      - name: Update image tag
        if: steps.check.outputs.skip == 'false'
        run: |
          VERSION="${GITHUB_REF#refs/tags/v}"
          VALUES="gitops/${{ vars.GITOPS_VALUES_PATH }}"
          yq e -i ".image.tag = \"${VERSION}\"" "$VALUES"
      - uses: peter-evans/create-pull-request@v6
        if: steps.check.outputs.skip == 'false'
        with:
          token: ${{ secrets.GITOPS_PAT }}
          path: gitops
          commit-message: "chore(deps): bump counter-service to ${{ github.ref_name }}"
          branch: "bump/counter-service-${{ github.ref_name }}"
          title: "⬆️ Bump counter-service to ${{ github.ref_name }}"
          delete-branch: true
```

---

## Local Development Workflow

```bash
# Enter devbox environment
devbox shell

# Install dependencies
npm install

# Run tests
devbox run test

# Lint
devbox run lint

# Run security scans locally
devbox run security

# Build Docker image locally
devbox run image-build

# Scan local Docker image
devbox run image-scan

# Start service locally (outside Docker)
node src/server.js

# Start with Docker Compose
docker compose up
```
