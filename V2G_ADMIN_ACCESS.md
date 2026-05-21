# Phase V2G — Admin access (G1–G4 foundations)

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
