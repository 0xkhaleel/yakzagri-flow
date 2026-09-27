# Admin Endpoints

Every endpoint on this page requires a bearer token whose wallet address
appears in the `ADMIN_STELLAR_PUBKEYS` environment variable (a
comma-separated allowlist of Stellar public keys). This is enforced by
`adminMiddleware`, stacked after the usual `authMiddleware`:

1. No/invalid token -> `401 Unauthorized`
2. Valid token, wallet not on the allowlist -> `403 { "error": "Forbidden: admin access required" }`
3. Valid token, wallet on the allowlist -> request proceeds

The server also requires `ADMIN_SECRET_KEY` to be set since admin routes are
always mounted - startup fails fast with a fatal log if it's missing (see
[`.env.example`](../../backend/.env.example)).

### Request timeouts

Admin routes that build a Soroban transaction (contract maintenance below)
are wrapped in a hard wall-clock timeout so a stalled RPC call can't hang
the request indefinitely. If the timeout elapses before a response is sent,
the caller gets `504`:

```json
{ "code": "ADMIN_OPERATION_TIMEOUT", "error": "Admin operation timed out" }
```

Configured via `ADMIN_ROUTE_TIMEOUT_MS` (default `15000`).

Admin sessions can additionally be **device-bound** (opt-in) — see
[admin-session-device-binding.md](../admin-session-device-binding.md) for
`POST /api/admin/auth/step-up`, `GET /api/admin/sessions`, per-device revoke,
and the `ADMIN_SESSION_BINDING_ENABLED` / `ADMIN_SESSION_BINDING_ENFORCE` env
switches.

There is no separate "admin login" - the same challenge/verify flow in
[overview.md](./overview.md#authentication) applies; admin status is purely
a function of which wallet signed in.

## Admin Audit Trail

Every privileged admin action is recorded in the application logs with an
`audit: true` marker for structured log querying. Each audit entry includes:

| Field | Description |
|---|---|
| `audit` | Always `true` for audit events — filter with `audit=true` in your log aggregator |
| `eventType` | Machine-readable event name (e.g., `FEATURE_FLAG_UPDATED`, `BATCH_TRADE_STATUS_UPDATE`, `TREASURY_WITHDRAWAL`) |
| `actionName` | Dot-separated action identifier (e.g., `admin.features.update`, `admin.treasury.withdraw`) for filtering and alerting |
| `adminAddress` | Stellar public key of the admin who performed the action (normalized) |
| `traceId` | OpenTelemetry trace ID linking the audit log entry to the distributed trace span |
| `spanId` | OpenTelemetry span ID for the specific admin request span |
| `timestamp` | ISO-8601 timestamp of when the action was performed |

### How admin identity flows through the system

1. `authMiddleware` validates the JWT token and attaches the decoded payload
   (including `walletAddress` and `sub`) to `req.user`.
2. `adminMiddleware` checks the wallet address against the
   `ADMIN_STELLAR_PUBKEYS` allowlist. If allowed, it sets
   `req.user.isAdmin = true` on the request context.
3. Downstream route handlers and controllers read `req.user.walletAddress`
   (and the `isAdmin` flag) to record the invoking admin's identity in audit
   log entries.

### Audited admin actions

| Action | Event Type | Route |
|---|---|---|
| Modify a feature flag | `FEATURE_FLAG_UPDATED` | `PATCH /admin/features/:name` |
| Batch trade status update | `BATCH_TRADE_STATUS_UPDATE` | `POST /admin/trades/batch/status` |
| Treasury withdrawal | `TREASURY_WITHDRAWAL` | `POST /treasury/withdraw` |

### Example audit log entry

```json
{
  "audit": true,
  "eventType": "FEATURE_FLAG_UPDATED",
  "actionName": "admin.features.update",
  "featureName": "new-checkout",
  "enabled": true,
  "rolloutPercentage": 25,
  "adminAddress": "gadmin...",
  "traceId": "00000000000000000000000000000001",
  "spanId": "0000000000000002",
  "timestamp": "2026-07-27T10:30:00.000Z"
}
```

Operators can query for all admin actions in a time window and trace every
privileged change back to the specific admin who performed it.

### Distributed tracing integration

Every admin request is automatically instrumented with OpenTelemetry. The
`adminMiddleware` annotates the active request span with:

| Span Attribute | Value |
|---|---|
| `admin.action` | `"privileged"` |
| `admin.address` | The admin's wallet address |
| `admin.verdict` | `"granted"` or `"denied"` |
| `is_admin` | `true` |

These span attributes allow observability platforms (Jaeger, Zipkin, etc.)
to filter and alert on all admin-level activity. The `traceId` and `spanId`
in each audit log entry link the log back to the corresponding trace span
for end-to-end distributed tracing.

## Auth diagnostics

`GET /api/admin/auth/claims` - returns the sanitized JWT claims the backend
parsed from the caller's bearer token, so an admin can verify exactly what
the server sees (wallet address, token id, issuer/audience, issued/expiry
times) without decoding the token by hand. Protected by the standard admin
auth rules above (`401`/`403`). Raw JWT fields not meaningful to display
(`sub`, `nbf`) are omitted - this is a diagnostic view, not a raw token dump.

```json
{
  "walletAddress": "GADMIN...",
  "tokenId": "9f2c...",
  "issuedAt": "2026-07-29T12:00:00.000Z",
  "expiresAt": "2026-07-30T12:00:00.000Z",
  "issuer": "amana",
  "audience": "amana-api"
}
```

Note this endpoint lives at `/api/admin/auth/claims` rather than
`/admin/auth/claims` like the other admin routes on this page - intentional,
per the ticket that introduced it.

## Admin audit log

`GET /api/admin/audit` - paginated, filterable view of the persisted
`AdminActionAudit` records (the same rows written by the audited actions
above). Unlike the structured log stream, this reads from the database and is
intended for ops/legal review and export.

Query parameters:

| Param | Type | Description |
|---|---|---|
| `actionName` | string | Filter by dot-separated action id (e.g. `admin.treasury.withdraw`) |
| `adminAddress` | string | Filter by the admin's Stellar public key |
| `from` | ISO-8601 | Only records at/after this timestamp |
| `to` | ISO-8601 | Only records at/before this timestamp |
| `limit` | number | Page size (default `50`, max `200`) |
| `cursor` | string | Opaque cursor from a previous response for the next page |

```json
{
  "items": [
    {
      "id": "aud_01H...",
      "actionName": "admin.treasury.withdraw",
      "adminAddress": "GADMIN...",
      "note": "Reclaiming funds from expired escrow per ticket OPS-42",
      "metadata": { "destination": "GBBB...C4", "amount": "1000.0000000" },
      "createdAt": "2026-07-29T12:05:00.000Z"
    }
  ],
  "nextCursor": "eyJpZCI6ImF1ZF8wMUgifQ=="
}
```

`nextCursor` is `null` when there are no further pages. Protected by the
standard admin auth rules above (`401`/`403`).

## Streams

`GET /api/admin/streams` - lists active payment streams with their current
status, so admins can inspect and act on stalled or disputed streams.

```json
{
  "items": [
    {
      "id": "str_01H...",
      "sender": "GAAA...",
      "recipient": "GBBB...",
      "asset": "USDC",
      "ratePerSecond": "0.0000116",
      "status": "active",
      "startedAt": "2026-07-01T00:00:00.000Z"
    }
  ]
}
```

`POST /api/admin/streams/:id/clawback/preview` - builds a **preview** of a
clawback against a stream without submitting anything. Returns the amount
that would be reclaimed, the destination, and the unsigned transaction XDR
so an admin can review it before signing. This is a read-only dry run: no
state is mutated and no audit record is written.

```json
{
  "streamId": "str_01H...",
  "clawbackAmount": "250.0000000",
  "asset": "USDC",
  "destination": "GAAA...",
  "unsignedXdr": "AAAAAgAAAAB..."
}
```

As with the treasury withdrawal, the caller still signs and submits the
returned XDR themselves - the backend never holds a signing key. Protected by
the standard admin auth rules above (`401`/`403`).

## Treasury

The treasury holds funds swept from resolved/expired escrow contracts.

`GET /treasury/balance` - current balance of the escrow contract treasury.

```json
{ "balance": "50000.0000000", "asset": "USDC", "contractId": "CA..." }
```

`GET /treasury/config` - the treasury's contract id, network, and settlement
asset.

```json
{ "contractId": "CA...", "network": "testnet", "asset": "USDC" }
```

`POST /treasury/withdraw` - builds an unsigned withdrawal transaction moving
funds out of the treasury (e.g. a clawback of funds swept from an
expired/resolved escrow).

```json
{
  "destination": "GBBB...C4",
  "amount": "1000.0000000",
  "note": "Reclaiming funds from expired escrow per ticket OPS-42"
}
```

`note` is optional but strongly recommended for compliance: it's a free-text
reason/justification (max 2000 chars) captured alongside the caller's wallet
address in the `AdminActionAudit` table for every withdrawal, so ops/legal can
later answer "why was this clawback performed." Omitting it still succeeds,
but leaves the audit record's `note` column empty.

Response: `{ "unsignedXdr": "..." }`. As with trade transactions, the caller
still signs and submits this themselves - the backend never holds a signing
key for the treasury.

### Quota

`POST /treasury/withdraw` is quota-limited per admin identity (the caller's
wallet address, or the `x-api-key` header when present instead of a wallet)
to guard against accidentally submitting a large number of clawbacks.
Requests over the limit get `429`:

```json
{
  "code": "ADMIN_QUOTA_EXCEEDED",
  "message": "Treasury withdrawal (clawback) quota exceeded for this admin, try again later.",
  "details": { "operation": "treasury.withdraw", "limit": 10, "windowMs": 3600000, "retryAfterSeconds": 1800 }
}
```

Configured via `ADMIN_QUOTA_CLAWBACK_WINDOW_MS` (default `3600000`, i.e. 1
hour) and `ADMIN_QUOTA_CLAWBACK_MAX` (default `10`) - see
[`.env.example`](../../backend/.env.example). The window resets automatically
once `windowMs` elapses since the admin's first request in the window.

`POST /admin/trades/batch/status` (below) is quota-limited the same way via
`ADMIN_QUOTA_TRADE_BATCH_WINDOW_MS` / `ADMIN_QUOTA_TRADE_BATCH_MAX` (defaults:
1 hour / 20 requests).

### Retry policy

Admin Soroban transaction submission automatically retries transient RPC
failures (timeouts, connection errors, rate limiting/`TRY_AGAIN_LATER`) with
fixed-step backoff, up to `SOROBAN_SUBMIT_MAX_RETRIES` (default `3`)
attempts using `SOROBAN_SUBMIT_BACKOFF_MS` (default `1000,2000,4000,8000`ms).
Persistent failures (invalid XDR, contract panics, definitive RPC rejections)
are never retried.
