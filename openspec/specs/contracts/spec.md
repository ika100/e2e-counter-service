# API Contract Specification

## Purpose

Documents the public HTTP API contract of `counter-service` for consumption by other
services in the `e2e-platform` — specifically the `frontend` SPA
(`ika100/e2e-frontend`). This spec is the single source of truth for cross-service
integration.

---

## Base URL

| Environment | Base URL |
|-------------|----------|
| Local dev | `http://localhost:3001` |
| Kubernetes (in-cluster) | `http://counter-service:3001` |
| Kubernetes (ingress) | `https://counter.<cluster-domain>` |

Port is configurable via `PORT` environment variable (default: `3001`).

---

## Endpoints

### POST /counters/:name

Increment a named counter by 1. Creates the counter at value `1` if it does not exist.

**Path parameter**

| Parameter | Type | Constraints |
|-----------|------|-------------|
| `name` | string | `[a-zA-Z0-9_-]`, 1–100 characters |

**Request body:** none (or empty JSON `{}`)

**Response — 200 OK**

```json
{
  "name": "string",
  "value": 42
}
```

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | The counter name (echoed from the path) |
| `value` | number (integer) | The new counter value after incrementing |

**Response — 400 Bad Request** (invalid name)

```json
{
  "error": "Invalid counter name"
}
```

**Response — 429 Too Many Requests** (rate limit exceeded)

```json
{
  "error": "Too many requests"
}
```

Headers: `Retry-After: <seconds>`

---

### GET /counters/:name

Read the current value of a named counter without modifying it.

**Path parameter**

| Parameter | Type | Constraints |
|-----------|------|-------------|
| `name` | string | `[a-zA-Z0-9_-]`, 1–100 characters |

**Response — 200 OK**

```json
{
  "name": "string",
  "value": 42
}
```

**Response — 404 Not Found** (counter never incremented)

```json
{
  "error": "Counter not found",
  "name": "string"
}
```

**Response — 400 Bad Request** (invalid name)

```json
{
  "error": "Invalid counter name"
}
```

---

### GET /health

Liveness/readiness probe. No authentication required.

**Response — 200 OK**

```json
{
  "status": "ok"
}
```

---

## Headers

| Header | All responses |
|--------|--------------|
| `Content-Type` | `application/json; charset=utf-8` |
| `Access-Control-Allow-Origin` | Configured via `CORS_ORIGIN` env var (default `*`) |

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port the service listens on |
| `CORS_ORIGIN` | `*` | Allowed CORS origin(s) |
| `LOG_LEVEL` | `info` | Pino log level (`trace`, `debug`, `info`, `warn`, `error`) |
| `RATE_LIMIT_MAX` | `200` | Max requests per IP per minute |

---

## Requirements

### Requirement: API contract stability

The system SHALL not change the shape of success response bodies (field names, types) in a
backward-incompatible way without a major version bump.

#### Scenario: `value` field is always a number

- **GIVEN** any successful response from `GET` or `POST /counters/:name`
- **WHEN** the response body is parsed
- **THEN** `value` is a JSON number (integer ≥ 0)
- **AND** `name` is a non-empty JSON string

### Requirement: OpenAPI / schema availability (SHOULD)

The service SHOULD expose its OpenAPI 3.1 schema at `GET /openapi.json` so that consumer
services can validate integration at development time.

#### Scenario: OpenAPI schema is reachable

- **GIVEN** the service is running
- **WHEN** a client sends `GET /openapi.json`
- **THEN** the response is `200 OK` with a valid OpenAPI 3.1 JSON document
- **AND** it describes all endpoints defined in this contract
