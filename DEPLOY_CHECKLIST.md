Stage 7 Deploy Checklist (MVP)

Pre-deploy
- Ensure production values are set for:
  - DATABASE_URL
  - JWT_ACCESS_SECRET
  - JWT_ACCESS_EXPIRES_IN
  - JWT_ISSUER (recommended)
  - JWT_AUDIENCE (recommended)
  - PORT
  - CORS_ORIGIN
  - THROTTLE_TTL_SECONDS
  - THROTTLE_LIMIT
  - AUTH_THROTTLE_LIMIT
- Generate Prisma client:
  - npx prisma generate
- Apply migrations in target environment:
  - npx prisma migrate deploy

Build + verification
- Build:
  - npm run build
- Unit tests:
  - npm run test -- --runInBand
- E2E tests:
  - npm run test:e2e -- --runInBand

Runtime checks after deploy
- Health:
  - GET /api/v1/health returns 200
- Auth:
  - POST /api/v1/auth/register works
  - POST /api/v1/auth/login works
- Protected routes:
  - GET /api/v1/users/me returns 401 without token
  - GET /api/v1/users/me returns 200 with valid token
- Ownership boundary smoke:
  - A user cannot read/update another user's application data
- Dashboard:
  - GET /api/v1/dashboard/summary returns stable payload

API documentation
- Swagger UI:
  - /api/docs
- Swagger JSON:
  - /api/docs-json
