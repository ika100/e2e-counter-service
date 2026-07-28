# Security Specification

## Purpose

Defines the security requirements for `counter-service`. Because counters are public and
in-memory (no PII, no auth), the threat model focuses on input validation, abuse
prevention, dependency hygiene, and container hardening.

---

## Requirements

### Requirement: Input validation and injection prevention

The system SHALL validate and sanitize all route parameters before processing. Counter
names SHALL be constrained to `[a-zA-Z0-9_-]` with a maximum length of 100 characters.
The system SHALL NOT pass any user-supplied value directly to an eval, shell command, or
database query.

#### Scenario: Attempt SQL/NoSQL injection via counter name

- **GIVEN** a malicious client
- **WHEN** it sends `POST /counters/'; DROP TABLE counters--`
- **THEN** the response is `400 Bad Request`
- **AND** no injection is executed on the server

#### Scenario: Attempt path traversal via counter name

- **GIVEN** a malicious client
- **WHEN** it sends `GET /counters/../etc/passwd`
- **THEN** the response is `400 Bad Request` or `404 Not Found`
- **AND** no file system access occurs

#### Scenario: Oversized payload is rejected

- **GIVEN** a client sends a `POST /counters/:name` with a body > 1 KB
- **WHEN** the server processes the request
- **THEN** the response is `413 Payload Too Large`
- **AND** the server does not allocate memory proportional to the payload size

---

### Requirement: Rate limiting / abuse prevention

The system SHOULD limit each client IP to a maximum of **200 requests per minute**. When
the limit is exceeded the service SHALL respond with `429 Too Many Requests` and include a
`Retry-After` header.

#### Scenario: Client exceeds rate limit

- **GIVEN** a client has sent 200 requests within 60 seconds
- **WHEN** the client sends request 201 within that window
- **THEN** the response status is `429 Too Many Requests`
- **AND** the `Retry-After` header is present indicating when the window resets

#### Scenario: Health endpoint exempt from rate limiting

- **GIVEN** a client has exceeded the rate limit
- **WHEN** it sends `GET /health`
- **THEN** the response status is `200 OK` (health endpoint is exempt)

---

### Requirement: Sensitive data handling

The system SHALL NOT log any personally identifiable information or secret values. HTTP
access logs SHALL record only method, path, status code, and response time. Environment
variables containing secrets (e.g., future API keys) SHALL be loaded via environment only
and SHALL NOT be committed to source control.

#### Scenario: Request log does not contain sensitive headers

- **GIVEN** a client sends a request with an `Authorization` header
- **WHEN** the server logs the request
- **THEN** the log entry does NOT include the value of the `Authorization` header

---

### Requirement: HTTPS in transit

In production deployments the service SHALL be exposed only via HTTPS (TLS termination at
the ingress layer). The service itself MAY accept plain HTTP from the ingress within the
cluster. TLS certificates SHALL be managed by cert-manager or the cluster ingress
controller, not by the service.

#### Scenario: External traffic is TLS-terminated

- **GIVEN** the service is deployed on Kubernetes behind an HTTPS ingress
- **WHEN** an external client connects over HTTP
- **THEN** the ingress redirects the client to HTTPS (301)
- **AND** the response is served over TLS

---

### Requirement: Container hardening

The Docker container SHALL run as a non-root user. The container image SHALL be based on a
minimal base image (e.g., `node:22-alpine`). The image SHALL contain no CRITICAL or HIGH
CVEs as reported by Trivy before being pushed to the registry.

#### Scenario: Container does not run as root

- **GIVEN** the production Docker image
- **WHEN** the container is started
- **THEN** `whoami` or `/proc/1/status` shows a non-root UID (≥ 1000)

#### Scenario: Trivy scan finds no CRITICAL/HIGH CVEs

- **GIVEN** the built Docker image
- **WHEN** `trivy image --severity CRITICAL,HIGH` is run against it
- **THEN** the exit code is `0` and no CRITICAL or HIGH vulnerabilities are reported

---

### Requirement: Dependency CVE hygiene

The system SHALL have no CRITICAL or HIGH CVEs in its npm dependency tree as reported by
`npm audit`. The CI pipeline SHALL fail if any such vulnerability is detected.

#### Scenario: npm audit fails on HIGH CVE

- **GIVEN** a dependency with a known HIGH CVE is introduced
- **WHEN** `npm audit --audit-level=high` runs in CI
- **THEN** the exit code is non-zero and the CI job fails

#### Scenario: Clean dependency tree passes audit

- **GIVEN** all dependencies have no CRITICAL or HIGH CVEs
- **WHEN** `npm audit --audit-level=high` runs in CI
- **THEN** the exit code is `0` and the CI job continues

---

### Requirement: No secrets in source code

The repository SHALL contain no hard-coded secrets, API keys, passwords, or private
certificates. Gitleaks SHALL run in CI on every push and PR.

#### Scenario: Secret committed to repo is detected

- **GIVEN** a developer accidentally commits an API key string
- **WHEN** the CI security job runs Gitleaks
- **THEN** Gitleaks reports the leak and the CI job fails
- **AND** the PR is blocked from merging
