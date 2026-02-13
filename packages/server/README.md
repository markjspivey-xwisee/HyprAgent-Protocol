# @hyprcat/server

HyprCAT Gateway Server - serves HyprCAT-compliant resources with governance, payments, federation, and provenance.

## Quick Start

```bash
# Development
pnpm dev:server

# Production
pnpm build:server
pnpm start:server
```

## Configuration

All configuration via environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3001` | Server port |
| `HOST` | `0.0.0.0` | Bind address |
| `BASE_URL` | `http://localhost:3001` | Public URL for resource IRIs |
| `CORS_ORIGINS` | `*` | Comma-separated origins |
| `STORAGE_BACKEND` | `memory` | `memory` or `file` |
| `STORAGE_DIR` | `./data` | Directory for file storage |
| `JWT_SECRET` | (auto-generated) | JWT signing secret |
| `PAYMENT_SECRET` | (auto-generated) | Payment proof signing secret |
| `RATE_LIMIT_MAX` | `100` | Max requests per window |
| `ENABLE_LOGGING` | `true` | Request logging |
| `ENABLE_HELMET` | `true` | Security headers |

## API Endpoints

### Discovery
- `GET /.well-known/hyprcat` - Service description
- `GET /catalog` - Resource catalog with search (`?q=`, `?type=`, `?domain=`)
- `GET /prompts` - Agent prompt templates

### Resources
- `GET /nodes/:type` - Fetch resource by type (retail, analytics, lrs)
- `POST /nodes` - Register new data product

### Operations
- `POST /operations/checkout` - Purchase with x402 payment
- `POST /operations/query` - Federated SQL query
- `GET /operations/lrs/export` - Export xAPI statements
- `POST /operations/token/mint` - Mint governance tokens
- `DELETE /operations/token/burn` - Burn tokens for refund

### Identity
- `POST /auth/challenge` - Get DID-Auth challenge
- `POST /auth/verify` - Verify signature, get JWT
- `GET /auth/profile` - Agent profile (authenticated)
- `GET /wallet` - Wallet state (authenticated)

### Health
- `GET /health` - Liveness check
- `GET /ready` - Readiness check
- `GET /stats` - Storage statistics

## Storage Backends

### Memory (default)
In-memory storage, data lost on restart. Best for development.

### File
Persistent JSON file storage in a configurable directory:
```bash
STORAGE_BACKEND=file STORAGE_DIR=./data pnpm start:server
```

## Authentication

The server supports JWT-based authentication via DID-Auth:

```bash
# 1. Get challenge
curl -X POST http://localhost:3001/auth/challenge

# 2. Sign and verify (get JWT)
curl -X POST http://localhost:3001/auth/verify \
  -H "Content-Type: application/json" \
  -d '{"did":"did:key:z6Mk...","signature":"...","nonce":"..."}'

# 3. Use JWT
curl http://localhost:3001/auth/profile \
  -H "Authorization: Bearer <token>"
```

## License

Apache-2.0
