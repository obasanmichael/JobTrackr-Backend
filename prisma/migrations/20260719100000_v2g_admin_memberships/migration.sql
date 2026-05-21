-- V2G (G1): admin_memberships — DB-backed internal admin; use JwtAuthGuard + AdminGuard together.

CREATE TYPE "AdminRole" AS ENUM ('OWNER', 'ADMIN', 'SUPPORT', 'ANALYST');

CREATE TYPE "AdminMembershipStatus" AS ENUM ('ACTIVE', 'REVOKED');

CREATE TABLE "admin_memberships" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "AdminRole" NOT NULL DEFAULT 'ADMIN',
    "invitedById" TEXT,
    "status" "AdminMembershipStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "admin_memberships_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "admin_memberships_userId_key" ON "admin_memberships"("userId");

CREATE INDEX "admin_memberships_invitedById_idx" ON "admin_memberships"("invitedById");

ALTER TABLE "admin_memberships"
  ADD CONSTRAINT "admin_memberships_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "admin_memberships"
  ADD CONSTRAINT "admin_memberships_invitedById_fkey"
  FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
