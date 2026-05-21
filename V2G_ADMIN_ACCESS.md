# Phase V2G — Admin access (G1–G7 foundations)

## Database

Run migrations (local or deploy):

```bash
npx prisma migrate deploy
```

Migrations add `admin_memberships` and `audit_logs`.

## Granting admin (DB)

After a user exists in `User`, insert one row (`id` must be unique text; use any UUID):

```sql
INSERT INTO "admin_memberships" ("id", "userId", "role", "status", "updatedAt")
VALUES ('b0000000-0000-4000-8000-000000000004', '<USER_UUID>', 'ADMIN', 'ACTIVE', CURRENT_TIMESTAMP);
```

Roles: `OWNER`, `ADMIN`, `SUPPORT`, `ANALYST` (prefer `ADMIN` until you need `OWNER` semantics).

## Legacy env

`ADMIN_USER_IDS` still grants access **without** a DB row — useful until everyone is migrated. `AdminGuard` checks env first, then `admin_memberships`.

## Guards

Public admin APIs must remain behind **`JwtAuthGuard` immediately followed by `AdminGuard`**. Do not mount admin controllers with JWT only.

## G3 — Audit log

Privileged writes should call `AuditLogService.record()` (exported from `AdminModule`) with actor, optional target, action, resource type/id, JSON `metadata`, and client `ipAddress` / `userAgent` when available. `PATCH /admin/users/:id` records `user.update_display_name`.

## G4 — User admin HTTP API

All require a valid access token and pass `AdminGuard`:

- **`GET /api/v1/admin/users`** — query: `page`, `limit`, optional `search` (email or name, case-insensitive).
- **`GET /api/v1/admin/users/:id`** — profile + subscription snapshot (plan code/name when present).
- **`PATCH /api/v1/admin/users/:id`** — body `{ "name": "..." }`; writes an audit row with previous and new name.

## G5 — Subscription admin API

- **`GET /api/v1/admin/subscriptions`** — paginated list with subscriber email/name and plan; query `page`, `limit`, optional `search`.
- **`PATCH /api/v1/admin/subscriptions/:userId`** — body `{ "planCode"?: string, "status"?: SubscriptionStatus }` (at least one field). If the user has no subscription row yet, **`planCode` is required** to create one. Audited as `subscription.override`.

## G6 — Audit on job-source admin mutations

`JobSourcesModule` imports `AdminModule` for `AuditLogService`. Mutating admin routes (job-source create/update/sync, bulk sync-active, job-quality scan/purge, submission approve/reject/spam) append **audit log** entries with summarized metadata.

## G7 — Admin team API

- **`GET /api/v1/admin/team`** — list all `admin_memberships` with user email/name (any active admin via `AdminGuard`).
- **`POST /api/v1/admin/team`** — body `{ "userId", "role" }`; **`AdminRolesGuard`** allows only **`OWNER`** and **`ADMIN`**. Only **`OWNER`** may assign **`OWNER`**.
- **`PATCH /api/v1/admin/team/:id`** — update membership `role` and/or `status` (e.g. set `REVOKED`); same role gate; audited.
