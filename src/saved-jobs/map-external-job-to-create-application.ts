import {
  ApplicationSource,
  ApplicationStatus,
  ExternalJobRemoteType,
  WorkMode,
} from '@prisma/client';
import type { CreateApplicationDto } from '../applications/dto/create-application.dto';

function safeHttpsUrl(raw: string | null | undefined): string | undefined {
  if (!raw?.trim()) {
    return undefined;
  }
  try {
    const u = new URL(raw.trim());
    if (u.protocol === 'http:' || u.protocol === 'https:') {
      return u.toString();
    }
  } catch {
    /* fall through */
  }
  return undefined;
}

/** Map `ExternalJob` → `CreateApplicationDto` subset for conversions (V2D). */
export function mapExternalListingToCreateApplicationDto(
  listing: {
    title: string;
    company: string;
    applicationUrl: string | null;
    location: string | null;
    remoteType: ExternalJobRemoteType;
    salaryMin: number | null;
    salaryMax: number | null;
    currency: string | null;
    sourceName?: string | null;
  },
  options: { notesAppend?: string; savedNotes?: string | null } = {},
): CreateApplicationDto {
  const workMode =
    listing.remoteType === ExternalJobRemoteType.REMOTE
      ? WorkMode.REMOTE
      : listing.remoteType === ExternalJobRemoteType.HYBRID
        ? WorkMode.HYBRID
        : listing.remoteType === ExternalJobRemoteType.ONSITE
          ? WorkMode.ONSITE
          : WorkMode.UNSPECIFIED;

  const chunks = [
    options.savedNotes?.trim(),
    options.notesAppend?.trim(),
  ].filter((s): s is string => !!s?.length);
  let notes = chunks.join('\n\n').trim();
  notes = notes.length > 5000 ? notes.slice(0, 5000) : notes;

  return {
    jobTitle: listing.title,
    companyName: listing.company,
    jobUrl: safeHttpsUrl(listing.applicationUrl),
    location: listing.location ?? undefined,
    workMode,
    salaryMin: listing.salaryMin ?? undefined,
    salaryMax: listing.salaryMax ?? undefined,
    currency: listing.currency ?? undefined,
    status: ApplicationStatus.SAVED,
    source: ApplicationSource.COMPANY_WEBSITE,
    notes: notes.length ? notes : undefined,
  };
}
