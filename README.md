# counter-service

REST microservice — tracks named in-memory counters via `POST`/`GET /counters/:name`.

## Overview

`counter-service` provides a lightweight, named in-memory counter store. Any client can
create, increment, and read counters identified by an arbitrary name string. Counters live
only in process memory and reset on restart.

## API

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/counters/:name` | Increment a named counter (creates if not exists) |
| `GET` | `/counters/:name` | Read the current value of a named counter |
| `GET` | `/health` | Liveness/readiness probe |
| `GET` | `/openapi.json` | OpenAPI 3.1 schema |

### Increment a counter

```bash
curl -X POST http://localhost:3001/counters/visits
# {"name":"visits","value":1}
```

### Read a counter

```bash
curl http://localhost:3001/counters/visits
# {"name":"visits","value":1}
```

### Health check

```bash
curl http://localhost:3001/health
# {"status":"ok"}
```

## Running locally

```bash
# With devbox (recommended)
devbox shell
npm install
devbox run test     # run tests
devbox run lint     # lint

# Start the service
node src/server.js

# Or with Docker Compose
docker compose up
```

## Environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | HTTP port to listen on |
| `HOST` | `0.0.0.0` | Host to bind to |
| `CORS_ORIGIN` | `*` | Allowed CORS origin |
| `LOG_LEVEL` | `info` | Fastify log level |

## Counter name rules

Counter names must match `[a-zA-Z0-9_-]`, minimum 1 character, maximum 100 characters.

## Tech stack

- **Runtime:** Node.js 22 (ESM)
- **Framework:** Fastify 5
- **Test runner:** `node --test` (built-in)
- **Linter:** ESLint 9 (flat config)
- **Container:** Docker (multi-stage, non-root)
