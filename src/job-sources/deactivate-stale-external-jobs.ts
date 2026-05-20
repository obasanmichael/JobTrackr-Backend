import type { Prisma } from '@prisma/client';

/** Build Prisma where clause to soft-deactivate jobs missing from the latest snapshot. */
export function buildStaleExternalJobWhere(
  sourceId: string,
  seenExternalJobIds: string[],
): Prisma.ExternalJobWhereInput {
  const base: Prisma.ExternalJobWhereInput = {
    sourceId,
    isActive: true,
  };

  if (seenExternalJobIds.length === 0) {
    return base;
  }

  return {
    ...base,
    externalJobId: { notIn: seenExternalJobIds },
  };
}
