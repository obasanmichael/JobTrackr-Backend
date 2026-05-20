import type { Prisma } from '@prisma/client';
import {
  ExternalExperienceLevel,
  ExternalJobEmploymentType,
  ExternalJobRemoteType,
} from '@prisma/client';
import { computeExternalJobContentHash } from './external-job-content-hash';
import type { GenericJobListingDto } from './generic-job-listing.schema';

/** Build Prisma upsert payloads for normalized generic listings (+ raw preserved). */
export function buildExternalJobUpsertArgs(
  sourceId: string,
  sourceName: string,
  listing: GenericJobListingDto,
  rawPayload: Prisma.InputJsonValue,
): Pick<Prisma.ExternalJobUpsertArgs, 'where' | 'create' | 'update'> {
  const create: Prisma.ExternalJobUncheckedCreateInput = {
    sourceId,
    sourceName,
    externalJobId: listing.externalJobId,
    rawPayload,
    title: listing.title,
    company: listing.company,
    applicationUrl: listing.applicationUrl ?? null,
    location: listing.location ?? null,
    country: listing.country ?? null,
    salaryMin: listing.salaryMin ?? null,
    salaryMax: listing.salaryMax ?? null,
    description: listing.description ?? null,
    requirements: listing.requirements ?? null,
    postedAt: listing.postedAt ?? null,
    expiresAt: listing.expiresAt ?? null,
    contentHash: computeExternalJobContentHash({
      title: listing.title,
      company: listing.company,
      location: listing.location,
      applicationUrl: listing.applicationUrl,
    }),
    currency: listing.currency ?? 'USD',
    remoteType: listing.remoteType ?? ExternalJobRemoteType.UNSPECIFIED,
    employmentType:
      listing.employmentType ?? ExternalJobEmploymentType.UNSPECIFIED,
    experienceLevel:
      listing.experienceLevel ?? ExternalExperienceLevel.UNSPECIFIED,
    isActive: listing.isActive ?? true,
  };

  const update = omitImmutableExternalJobKeys(create);

  return {
    where: {
      sourceId_externalJobId: {
        sourceId,
        externalJobId: listing.externalJobId,
      },
    },
    create,
    update,
  };
}

/** Strip keys Prisma forbids touching on ExternalJob upsert updates. */
function omitImmutableExternalJobKeys(
  create: Prisma.ExternalJobUncheckedCreateInput,
): Prisma.ExternalJobUpdateInput {
  return {
    sourceName: create.sourceName,
    rawPayload: create.rawPayload,
    title: create.title,
    company: create.company,
    applicationUrl: create.applicationUrl,
    location: create.location,
    country: create.country,
    salaryMin: create.salaryMin,
    salaryMax: create.salaryMax,
    description: create.description,
    requirements: create.requirements,
    postedAt: create.postedAt,
    expiresAt: create.expiresAt,
    contentHash: create.contentHash,
    currency: create.currency,
    remoteType: create.remoteType,
    employmentType: create.employmentType,
    experienceLevel: create.experienceLevel,
    isActive: create.isActive ?? true,
  };
}
