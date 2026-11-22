# Implementation notes and known integration points

## Important implementation scope
- PostgreSQL schema and all core marketplace workflows are represented.
- Acceptance and approval use Prisma interactive transactions at Serializable isolation, with conditional state updates to reduce race conditions.
- Refresh-token hashes are stored, not raw refresh tokens.
- Public registration cannot create an administrator.
- Uploads are stored on local disk in `uploads/`. For production, use private object storage and signed download URLs.
- Categories currently use a process-local 60-second cache. In a horizontally scaled deployment, use Redis cache invalidation.
- Socket.IO gateway is present as a gateway scaffold. Before private user events are enabled, add authenticated socket middleware and join connections to `user:{id}` rooms.
- Mail service is configurable, but no event-driven mail queue is enabled in this baseline.
- Wallet top-up is intentionally simulated; never treat it as a production payment flow.
- Before a real public launch, add a payment provider, idempotency keys, file scanning, audit/admin logs, account verification and recovery flows, and full E2E tests.

## Local first-run note
Run `npx prisma migrate dev --name init` to generate the initial migration from `schema.prisma`. Commit the generated `prisma/migrations` directory to source control before using the Docker production startup command.
