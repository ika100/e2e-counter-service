# Counter API Specification

## Purpose

Defines the behavior of the named in-memory counter HTTP API: how counters are created
implicitly on first increment, how they are incremented, and how their current value is
read. Covers the happy path, edge cases, and error conditions.

---

## Requirements

### Requirement: Increment counter

The system SHALL increment a named counter by 1 when a `POST /counters/:name` request is
received. If the counter does not yet exist it SHALL be created with a starting value of
0 and then incremented to 1. The response SHALL be `200 OK` with a JSON body containing
the counter's name and its new value.

#### Scenario: Increment an existing counter

- **GIVEN** a counter named `"visits"` exists with value `5`
- **WHEN** a client sends `POST /counters/visits`
- **THEN** the response status is `200 OK`
- **AND** the response body is `{ "name": "visits", "value": 6 }`

#### Scenario: Increment a counter that does not yet exist (auto-create)

- **GIVEN** no counter named `"newpage"` exists
- **WHEN** a client sends `POST /counters/newpage`
- **THEN** the response status is `200 OK`
- **AND** the response body is `{ "name": "newpage", "value": 1 }`

#### Scenario: Multiple sequential increments

- **GIVEN** a counter named `"clicks"` with value `0`
- **WHEN** a client sends `POST /counters/clicks` three times in sequence
- **THEN** after the third request the response body is `{ "name": "clicks", "value": 3 }`

---

### Requirement: Read counter value

The system SHALL return the current value of a named counter when a `GET /counters/:name`
request is received. The response SHALL be `200 OK` with a JSON body containing the
counter's name and value.

#### Scenario: Read an existing counter

- **GIVEN** a counter named `"logins"` exists with value `42`
- **WHEN** a client sends `GET /counters/logins`
- **THEN** the response status is `200 OK`
- **AND** the response body is `{ "name": "logins", "value": 42 }`

#### Scenario: Read a counter that has never been incremented

- **GIVEN** no counter named `"ghost"` has ever been created
- **WHEN** a client sends `GET /counters/ghost`
- **THEN** the response status is `404 Not Found`
- **AND** the response body is `{ "error": "Counter not found", "name": "ghost" }`

---

### Requirement: Counter name validation

The system SHALL reject counter names that are empty, exceed 100 characters, or contain
characters outside `[a-zA-Z0-9_-]`. The response SHALL be `400 Bad Request` with a JSON
error body.

#### Scenario: Name exceeds maximum length

- **GIVEN** any client request (`GET` or `POST`)
- **WHEN** the `:name` path parameter is longer than 100 characters
- **THEN** the response status is `400 Bad Request`
- **AND** the response body contains `{ "error": "Invalid counter name" }`

#### Scenario: Name contains invalid characters

- **GIVEN** any client request
- **WHEN** the `:name` path parameter contains a character not in `[a-zA-Z0-9_-]`
  (e.g., spaces, slashes, emoji, SQL meta-characters)
- **THEN** the response status is `400 Bad Request`
- **AND** the response body contains `{ "error": "Invalid counter name" }`

#### Scenario: Valid name at maximum boundary

- **GIVEN** a counter name is exactly 100 characters of `[a-zA-Z0-9_-]`
- **WHEN** a client sends `POST /counters/<100-char-name>`
- **THEN** the response status is `200 OK`
- **AND** the counter is created or incremented normally

---

### Requirement: JSON response contract

The system SHALL always respond with `Content-Type: application/json`. All success
responses SHALL include `{ "name": string, "value": number }`. All error responses SHALL
include `{ "error": string }`.

#### Scenario: Content-Type header is set on success

- **GIVEN** a valid `POST /counters/test` request
- **WHEN** the server responds
- **THEN** the `Content-Type` response header is `application/json` (or includes `charset=utf-8`)

#### Scenario: Content-Type header is set on error

- **GIVEN** a request with an invalid counter name
- **WHEN** the server responds with `400`
- **THEN** the `Content-Type` response header is `application/json`

---

### Requirement: Unknown routes return 404

The system SHALL return `404 Not Found` for any route not defined in the API.

#### Scenario: Request to undefined route

- **GIVEN** a client sends `GET /undefined-path`
- **WHEN** the server processes the request
- **THEN** the response status is `404 Not Found`

---

### Requirement: Health endpoint

The system SHALL expose a `GET /health` endpoint that returns `200 OK` with
`{ "status": "ok" }` when the service is running normally. This endpoint SHALL NOT be
subject to rate limiting.

#### Scenario: Health check succeeds

- **GIVEN** the service is running
- **WHEN** a client sends `GET /health`
- **THEN** the response status is `200 OK`
- **AND** the response body is `{ "status": "ok" }`

---

### Requirement: CORS support

The system SHOULD respond with appropriate CORS headers to allow the `frontend` SPA to
call the API from a browser. The allowed origin SHALL be configurable via environment
variable (`CORS_ORIGIN`); when unset, the service SHOULD default to `*` in development
and restrict access in production.

#### Scenario: Cross-origin request receives CORS headers

- **GIVEN** a browser-based client at `http://localhost:5173`
- **WHEN** it sends a `GET /counters/test` request with `Origin: http://localhost:5173`
- **THEN** the response includes `Access-Control-Allow-Origin: http://localhost:5173`
  (or `*` if wildcard is configured)

---

### Requirement: Non-functional — performance

The system SHALL respond to `GET /counters/:name` and `POST /counters/:name` within
**50 ms p99** under a sustained load of 100 requests/second on a single instance.

#### Scenario: Response time under load

- **GIVEN** the service is running with default configuration
- **WHEN** a load-test client sends 100 req/s for 60 seconds
- **THEN** the p99 latency measured at the service is ≤ 50 ms
- **AND** the error rate is < 0.1%

---

### Requirement: Non-functional — availability

The service SHALL respond to `GET /health` with `200 OK` during normal operation.
Kubernetes liveness and readiness probes SHALL use this endpoint.

#### Scenario: Liveness probe succeeds while healthy

- **GIVEN** the container is running and the Node.js process is up
- **WHEN** Kubernetes sends `GET /health`
- **THEN** the HTTP response status is `200 OK` within 1 second
