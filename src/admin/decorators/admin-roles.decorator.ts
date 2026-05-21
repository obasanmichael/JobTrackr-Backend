import { SetMetadata } from '@nestjs/common';
import type { AdminRole } from '@prisma/client';

export const ADMIN_ROLES_KEY = 'adminRoles';

/** Requires an ACTIVE `admin_memberships` row whose `role` is one of the listed values. Use after `AdminGuard`. */
export const AdminRoles = (...roles: AdminRole[]) =>
  SetMetadata(ADMIN_ROLES_KEY, roles);
