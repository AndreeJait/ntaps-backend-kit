# Library recommendations

These recommendations target a new Node.js 22 service. Upgrade existing services incrementally and read each dependency's migration guide before changing a major version.

| Current library | Decision | Recommendation and reason |
|---|---|---|
| `@bull-board/api`, `@bull-board/express` | Keep | They are adapters, not the queue engine. Mount only on an internal route and protect it with stronger SSO or network policy in production. |
| `bull` | Replace | Use `bullmq`. It is the actively documented successor and exposes worker shutdown with `worker.close()`. Jobs must still be idempotent because delivery is at least once. |
| `connect-redis` | Keep conditionally | Good when browser sessions are actually required. Current releases include TypeScript types. Do not use in a token-only machine API. |
| `cookie-parser` | Remove by default | `express-session` handles its own session cookie. Add cookie parsing only when application routes read other cookies. |
| `cors` | Keep | Use an explicit origin allowlist. CORS is a browser policy, not authentication. |
| `express-basic-auth` | Restrict | Acceptable for an internal Bull Board behind TLS and network controls. Replace with company SSO/OIDC for meaningful administration access; never use it as customer authentication. |
| `express-rate-limit`, `rate-limit-redis` | Keep | This is a sound combination for distributed HTTP rate limits. Configure Express `trust proxy` to the exact deployment topology or client IP limits will be wrong. |
| `express-session` | Keep conditionally | Use for browser/BFF flows needing server-side revocation. Prefer short-lived access tokens for service-to-service APIs, but do not replace sessions with JWTs merely for fashion. |
| `express-useragent` | Remove by default | User-agent parsing is often unused and the header is untrusted. Parse it only at the feature boundary when a real product requirement exists. |
| `get-port` | Remove from production | Bind configured ports in deployed services. Dynamic ports are useful only in local integration tests. |
| `helmet` | Keep | Low-cost secure response-header defaults; review CSP when serving HTML. |
| `request-ip` | Replace | Use Express `request.ip` plus an exact `trust proxy` setting. A second IP interpretation library makes proxy mistakes harder to see. |
| `routing-controllers` | Replace for this template | Direct Express routers plus Zod remove decorator metadata, global discovery, and framework coupling. Keep it in a stable existing service if the team values decorators—the replacement is architectural, not because the package is abandoned. |

## Storage guidance

- Give every store a named responsibility. Avoid saving the same authoritative record in MySQL and MongoDB.
- Use MySQL for transactional relational state, MongoDB for aggregate-shaped documents, Elasticsearch as a rebuildable search projection, and Redis for ephemeral/cache/session/queue concerns.
- Update Elasticsearch asynchronously from a transactional outbox. Do not dual-write the database and search index in one request.
- Use separate Redis connections for request traffic and BullMQ workers. A blocking or retry-heavy queue connection should not hold up sessions or rate limits.
