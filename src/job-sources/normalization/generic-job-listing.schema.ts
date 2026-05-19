import {
  ExternalExperienceLevel,
  ExternalJobEmploymentType,
  ExternalJobRemoteType,
} from '@prisma/client';
import { z } from 'zod';

/** Canonical listing shape adapters should emit before DB mapping (Phase C maps ATS → here). */
export const genericJobListingSchema = z.object({
  externalJobId: z.string().trim().min(1).max(512),
  title: z.string().trim().min(1).max(900),
  company: z.string().trim().min(1).max(400),
  applicationUrl: z.string().trim().url().nullable().optional(),
  location: z.string().trim().max(500).nullable().optional(),
  country: z.string().trim().max(120).nullable().optional(),
  remoteType: z.nativeEnum(ExternalJobRemoteType).optional(),
  salaryMin: z.number().int().nonnegative().nullable().optional(),
  salaryMax: z.number().int().nonnegative().nullable().optional(),
  currency: z.string().trim().min(3).max(8).nullable().optional(),
  description: z.string().max(250_000).nullable().optional(),
  requirements: z.string().max(50_000).nullable().optional(),
  employmentType: z.nativeEnum(ExternalJobEmploymentType).optional(),
  experienceLevel: z.nativeEnum(ExternalExperienceLevel).optional(),
  postedAt: z.coerce.date().nullable().optional(),
  expiresAt: z.coerce.date().nullable().optional(),
  isActive: z.boolean().optional(),
});

export type GenericJobListingDto = z.infer<typeof genericJobListingSchema>;

export function parseGenericJobListing(
  raw: unknown,
): { ok: true; value: GenericJobListingDto } | { ok: false } {
  const parsed = genericJobListingSchema.safeParse(raw);
  if (!parsed.success) {
    return { ok: false };
  }
  return { ok: true, value: parsed.data };
}
