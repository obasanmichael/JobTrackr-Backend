import { ExternalExperienceLevel, ExternalJobRemoteType } from '@prisma/client';

export type MatchProfileInput = {
  headline: string | null;
  roles: string[];
  skills: string[];
  tools: string[];
  locations: string[];
  workModes: string[];
  yearsOfExperience: number | null;
};

export type MatchJobInput = {
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  remoteType: ExternalJobRemoteType;
  experienceLevel: ExternalExperienceLevel;
  postedAt: Date | null;
};

export type JobMatchScoreBreakdown = {
  overallScore: number;
  titleScore: number;
  skillScore: number;
  experienceScore: number;
  locationScore: number;
  recencyScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  matchReason: string;
};

const WEIGHTS = {
  title: 0.25,
  skill: 0.35,
  experience: 0.15,
  location: 0.15,
  recency: 0.1,
} as const;

export function parseProfileStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .filter((item): item is string => typeof item === 'string')
    .map((item) => item.trim())
    .filter(Boolean);
}

export function normalizeMatchText(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function buildJobMatchCorpus(job: MatchJobInput): string {
  return normalizeMatchText(
    [job.title, job.description ?? '', job.requirements ?? ''].join(' '),
  );
}

export function scoreTitleMatch(
  profile: MatchProfileInput,
  job: MatchJobInput,
): number {
  const title = normalizeMatchText(job.title);
  if (!title) {
    return 0;
  }

  // The resume headline (e.g. "Senior Software Engineer") is usually the
  // strongest target-role signal; extractor-derived roles are often empty.
  const roleHints = [
    ...(profile.headline?.trim() ? [profile.headline] : []),
    ...profile.roles,
    ...profile.skills.slice(0, 5),
  ];
  if (roleHints.length === 0) {
    return 40;
  }

  let best = 0;
  for (const role of roleHints) {
    const normalized = normalizeMatchText(role);
    if (!normalized) {
      continue;
    }
    if (title.includes(normalized)) {
      best = Math.max(best, normalized.split(' ').length >= 2 ? 100 : 85);
      continue;
    }
    const tokens = normalized.split(' ').filter((t) => t.length > 2);
    const hits = tokens.filter((token) => title.includes(token)).length;
    if (tokens.length > 0) {
      best = Math.max(best, Math.round((hits / tokens.length) * 80));
    }
  }

  return Math.min(100, best);
}

export function scoreSkillMatch(
  profile: MatchProfileInput,
  job: MatchJobInput,
): Pick<
  JobMatchScoreBreakdown,
  'skillScore' | 'matchedSkills' | 'missingSkills'
> {
  const corpus = buildJobMatchCorpus(job);
  const candidates = [...new Set([...profile.skills, ...profile.tools])];

  if (candidates.length === 0) {
    return { skillScore: 35, matchedSkills: [], missingSkills: [] };
  }

  const matchedSkills: string[] = [];
  for (const skill of candidates) {
    const normalized = normalizeMatchText(skill);
    if (normalized.length > 1 && corpus.includes(normalized)) {
      matchedSkills.push(skill);
    }
  }

  const skillScore = Math.round(
    (matchedSkills.length / candidates.length) * 100,
  );

  const missingSkills = extractMissingSkills(corpus, candidates, matchedSkills);

  return {
    skillScore: Math.min(100, skillScore),
    matchedSkills: matchedSkills.slice(0, 8),
    missingSkills: missingSkills.slice(0, 5),
  };
}

function extractMissingSkills(
  corpus: string,
  profileSkills: string[],
  matchedSkills: string[],
): string[] {
  const matchedSet = new Set(matchedSkills.map(normalizeMatchText));
  const commonJobSkills = [
    'react',
    'typescript',
    'javascript',
    'node',
    'python',
    'java',
    'aws',
    'sql',
    'postgresql',
    'docker',
    'kubernetes',
    'graphql',
    'product management',
    'figma',
    'analytics',
    'machine learning',
  ];

  const missing: string[] = [];
  for (const token of commonJobSkills) {
    if (!corpus.includes(token)) {
      continue;
    }
    const inProfile = profileSkills.some((skill) =>
      normalizeMatchText(skill).includes(token),
    );
    if (!inProfile && !matchedSet.has(token)) {
      missing.push(token);
    }
  }
  return missing;
}

export function scoreExperienceMatch(
  yearsOfExperience: number | null,
  experienceLevel: ExternalExperienceLevel,
): number {
  if (experienceLevel === ExternalExperienceLevel.UNSPECIFIED) {
    return yearsOfExperience == null ? 60 : 70;
  }

  const expectedRange = experienceLevelToYearsRange(experienceLevel);
  if (yearsOfExperience == null) {
    return 55;
  }

  if (
    yearsOfExperience >= expectedRange.min &&
    yearsOfExperience <= expectedRange.max
  ) {
    return 100;
  }

  const distance =
    yearsOfExperience < expectedRange.min
      ? expectedRange.min - yearsOfExperience
      : yearsOfExperience - expectedRange.max;

  return Math.max(25, 100 - distance * 12);
}

function experienceLevelToYearsRange(level: ExternalExperienceLevel): {
  min: number;
  max: number;
} {
  switch (level) {
    case ExternalExperienceLevel.ENTRY:
      return { min: 0, max: 2 };
    case ExternalExperienceLevel.MID:
      return { min: 3, max: 5 };
    case ExternalExperienceLevel.SENIOR:
      return { min: 6, max: 10 };
    case ExternalExperienceLevel.LEAD:
    case ExternalExperienceLevel.EXECUTIVE:
      return { min: 10, max: 40 };
    default:
      return { min: 0, max: 40 };
  }
}

export function scoreLocationMatch(
  profile: MatchProfileInput,
  job: MatchJobInput,
): number {
  let score = 50;

  const jobLocation = job.location ? normalizeMatchText(job.location) : '';
  if (jobLocation && profile.locations.length > 0) {
    const locationHit = profile.locations.some((loc) => {
      const normalized = normalizeMatchText(loc);
      return (
        normalized.length > 0 &&
        (jobLocation.includes(normalized) || normalized.includes(jobLocation))
      );
    });
    if (locationHit) {
      score = Math.max(score, 90);
    }
  }

  if (
    profile.workModes.length > 0 &&
    job.remoteType !== ExternalJobRemoteType.UNSPECIFIED
  ) {
    const remoteToken = job.remoteType.toLowerCase();
    const modeHit = profile.workModes.some(
      (mode) => normalizeMatchText(mode) === remoteToken,
    );
    if (modeHit) {
      score = Math.max(score, 95);
    }
  } else if (job.remoteType === ExternalJobRemoteType.REMOTE) {
    score = Math.max(score, 75);
  }

  return Math.min(100, score);
}

export function scoreRecency(postedAt: Date | null, now = new Date()): number {
  if (!postedAt) {
    return 50;
  }
  const ageDays = Math.max(
    0,
    Math.floor((now.getTime() - postedAt.getTime()) / (1000 * 60 * 60 * 24)),
  );
  if (ageDays <= 7) {
    return 100;
  }
  if (ageDays <= 30) {
    return 85;
  }
  if (ageDays <= 90) {
    return 65;
  }
  return 40;
}

export function buildMatchReason(
  breakdown: Omit<JobMatchScoreBreakdown, 'overallScore' | 'matchReason'>,
): string {
  const reasons: string[] = [];

  if (breakdown.matchedSkills.length >= 2) {
    reasons.push(
      `Strong skill overlap in ${breakdown.matchedSkills.slice(0, 3).join(', ')}`,
    );
  } else if (breakdown.matchedSkills.length === 1) {
    reasons.push(`Skill match: ${breakdown.matchedSkills[0]}`);
  }

  if (breakdown.titleScore >= 80) {
    reasons.push('Title aligns with your target roles');
  }

  if (breakdown.locationScore >= 85) {
    reasons.push('Location or remote preference fit');
  }

  if (breakdown.experienceScore >= 85) {
    reasons.push('Experience level looks like a good fit');
  }

  if (reasons.length === 0) {
    return 'Moderate overall fit based on your profile';
  }

  return reasons.slice(0, 2).join(' · ');
}

export function scoreJobMatch(
  profile: MatchProfileInput,
  job: MatchJobInput,
  now = new Date(),
): JobMatchScoreBreakdown {
  const titleScore = scoreTitleMatch(profile, job);
  const skill = scoreSkillMatch(profile, job);
  const experienceScore = scoreExperienceMatch(
    profile.yearsOfExperience,
    job.experienceLevel,
  );
  const locationScore = scoreLocationMatch(profile, job);
  const recencyScore = scoreRecency(job.postedAt, now);

  const overallScore = Math.round(
    titleScore * WEIGHTS.title +
      skill.skillScore * WEIGHTS.skill +
      experienceScore * WEIGHTS.experience +
      locationScore * WEIGHTS.location +
      recencyScore * WEIGHTS.recency,
  );

  const partial = {
    titleScore,
    skillScore: skill.skillScore,
    experienceScore,
    locationScore,
    recencyScore,
    matchedSkills: skill.matchedSkills,
    missingSkills: skill.missingSkills,
  };

  return {
    overallScore: Math.min(100, Math.max(0, overallScore)),
    matchReason: buildMatchReason(partial),
    ...partial,
  };
}

export function profileInputFromRecord(input: {
  headline?: string | null;
  skills: unknown;
  tools: unknown;
  roles: unknown;
  locations: unknown;
  workModes: unknown;
  yearsOfExperience: number | null;
}): MatchProfileInput {
  return {
    headline:
      typeof input.headline === 'string' && input.headline.trim()
        ? input.headline.trim()
        : null,
    skills: parseProfileStringArray(input.skills),
    tools: parseProfileStringArray(input.tools),
    roles: parseProfileStringArray(input.roles),
    locations: parseProfileStringArray(input.locations),
    workModes: parseProfileStringArray(input.workModes),
    yearsOfExperience: input.yearsOfExperience,
  };
}

export function jobInputFromExternalJob(job: {
  title: string;
  description: string | null;
  requirements: string | null;
  location: string | null;
  remoteType: ExternalJobRemoteType;
  experienceLevel: ExternalExperienceLevel;
  postedAt: Date | null;
}): MatchJobInput {
  return {
    title: job.title,
    description: job.description,
    requirements: job.requirements,
    location: job.location,
    remoteType: job.remoteType,
    experienceLevel: job.experienceLevel,
    postedAt: job.postedAt,
  };
}
