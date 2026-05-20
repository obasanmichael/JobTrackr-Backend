import { createHash } from 'node:crypto';

export type ExternalJobContentHashInput = {
  title: string;
  company: string;
  location?: string | null;
  applicationUrl?: string | null;
};

/** Collapse whitespace and lowercase for stable cross-sync comparison. */
export function normalizeContentHashText(
  value: string | null | undefined,
): string {
  if (!value?.trim()) {
    return '';
  }
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Normalize apply URLs so trailing slashes / hash fragments do not change the hash. */
export function normalizeContentHashApplicationUrl(
  url: string | null | undefined,
): string {
  if (!url?.trim()) {
    return '';
  }

  try {
    const parsed = new URL(url.trim());
    parsed.hash = '';
    let normalized = parsed.toString().toLowerCase();
    if (normalized.endsWith('/')) {
      normalized = normalized.slice(0, -1);
    }
    return normalized;
  } catch {
    return url.trim().toLowerCase();
  }
}

/** SHA-256 over normalized title, company, location, and application URL. */
export function computeExternalJobContentHash(
  input: ExternalJobContentHashInput,
): string {
  const payload = [
    normalizeContentHashText(input.title),
    normalizeContentHashText(input.company),
    normalizeContentHashText(input.location),
    normalizeContentHashApplicationUrl(input.applicationUrl),
  ].join('|');

  return createHash('sha256').update(payload).digest('hex');
}
