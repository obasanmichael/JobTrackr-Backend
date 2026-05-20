import type { Prisma } from '@prisma/client';

/** Rows inactive longer than cutoff may be purged when purge is enabled (Phase J.4). */
export function buildInactiveExternalJobPurgeWhere(
  cutoff: Date,
): Prisma.ExternalJobWhereInput {
  return {
    isActive: false,
    updatedAt: { lt: cutoff },
  };
}
