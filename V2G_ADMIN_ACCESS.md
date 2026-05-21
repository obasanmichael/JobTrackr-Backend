# Phase V2G — G1 & G2 (admin persistence + guard)

## Database

Run migrations (local or deploy):

```bash
npx prisma migrate deploy
```

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
