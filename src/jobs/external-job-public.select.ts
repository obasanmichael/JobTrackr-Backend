import type { Prisma } from '@prisma/client';

/** Relation slice joined for public job list/detail DTOs (source name + type). */
export const externalJobPublicInclude = {
  source: {
    select: {
      name: true,
      type: true,
    },
  },
} satisfies Prisma.ExternalJobInclude;
