export type DetectedAtsType = 'GREENHOUSE' | 'LEVER' | 'ASHBY';

export type AtsCareersUrlDetection = {
  detectedAtsType: DetectedAtsType | null;
  detectedSlug: string | null;
};

/** Normalize careers URLs for dedupe (strip query/hash, trim trailing slash). */
export function normalizeCareersUrl(raw: string): string {
  const url = new URL(raw.trim());
  url.hash = '';
  url.search = '';
  if (url.pathname.endsWith('/') && url.pathname.length > 1) {
    url.pathname = url.pathname.slice(0, -1);
  }
  return url.toString();
}

/**
 * Parse supported ATS hosts from a careers page URL (Phase I.2).
 * Greenhouse, Lever, and Ashby slugs are extracted from the first path segment.
 */
export function parseAtsCareersUrl(raw: string): AtsCareersUrlDetection {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return { detectedAtsType: null, detectedSlug: null };
  }

  const host = url.hostname.toLowerCase();
  const segments = url.pathname.split('/').filter(Boolean);
  const slug = segments[0]?.trim() ?? null;

  if (host === 'boards.greenhouse.io' || host === 'job-boards.greenhouse.io') {
    return {
      detectedAtsType: slug ? 'GREENHOUSE' : null,
      detectedSlug: slug,
    };
  }

  if (host === 'jobs.lever.co') {
    return {
      detectedAtsType: slug ? 'LEVER' : null,
      detectedSlug: slug,
    };
  }

  if (host === 'jobs.ashbyhq.com') {
    return {
      detectedAtsType: slug ? 'ASHBY' : null,
      detectedSlug: slug,
    };
  }

  return { detectedAtsType: null, detectedSlug: null };
}
