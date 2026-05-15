Stage 7 Hardening Test Matrix

Security hardening
- Auth endpoints are throttled (`/auth/register`, `/auth/login`) and return 429 when limit is exceeded.
- Global throttling guard is enabled for API abuse protection.
- Standardized error payload returned via global exception filter:
  - statusCode
  - message
  - error
  - timestamp
  - path
  - details (validation arrays)

Contract/documentation
- Swagger contract available at:
  - /api/docs
  - /api/docs-json
- Controllers tagged for grouped API docs.
- Protected endpoints declare bearer auth in docs.

Critical e2e coverage
- Auth:
  - register success
  - register duplicate conflict
  - login success
  - login invalid credentials generic message
  - /auth/me with/without token
  - auth throttle behavior
- Users:
  - /users/me with/without token
  - response excludes passwordHash
- Ownership isolation:
  - applications cross-user get/update/delete blocked
  - application events cross-user read/delete blocked
  - reminders/interviews cross-user mutate blocked
  - dashboard summary user scoping enforced

Ship gate
- `npm run build` passes
- `npm run test -- --runInBand` passes
- `npm run test:e2e -- --runInBand` passes
