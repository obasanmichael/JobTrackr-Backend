/**
 * Deterministic draft extraction from parsed resume text (V2A — Option A).
 * Intended to be replaced or augmented by LLM extraction later without changing consumers.
 */

export type CandidateProfileDraftJson = {
  headline: string | null;
  summary: string | null;
  skills: string[];
  tools: string[];
  roles: string[];
  industries: string[];
  yearsOfExperience: number | null;
  locations: string[];
  workModes: string[];
  education: unknown[];
  certifications: unknown[];
  projects: unknown[];
  experience: unknown[];
  rawExtractedData: Record<string, unknown>;
  extractionPipeline: string;
};

const EXTRACTION_PIPELINE = 'heuristic:v1';

const SECTION_LABELS: Record<string, RegExp> = {
  summary:
    /^(professional\s+)?summary|profile|objective|about\s+me|highlights?\s*$/i,
  skills:
    /^(technical\s+)?skills|core\s+competencies|technologies|tech\s+stack$/i,
  experience:
    /^(work\s+)?experience|employment(\s+history)?|professional\s+experience$/i,
  education: /^education(\s+history)?|academic\s+background$/i,
  certifications: /^certifications?|licenses$/i,
  projects: /^projects?$/i,
};

const YEARS_PATTERNS = [
  /\b(\d{1,2})\s*\+\s*years?\b/i,
  /\b(\d{1,2})\s*years?\s+(?:of\s+)?experience\b/i,
  /\byears?\s+of\s+experience\D{0,24}(\d{1,2})\b/i,
];

const WORK_MODE_KEYS = [
  ['REMOTE', /\bremote\b/i],
  ['HYBRID', /\bhybrid\b/i],
  ['ONSITE', /\bonsite\b|\bon-site\b|\bin[\s-]office\b/i],
] as const;

const KNOWN_TOOLS: ReadonlyArray<[string, RegExp]> = [
  ['TypeScript', /\btypescript\b/i],
  ['JavaScript', /\bjavascript\b/i],
  ['Node.js', /\bnode(?:\.js)?\b/i],
  ['React', /\breact\b(?!\s+native)/i],
  ['NestJS', /\bnest(?:js)?\b/i],
  ['PostgreSQL', /\bpostgres(?:ql)?\b/i],
  ['MongoDB', /\bmongodb\b/i],
  ['Redis', /\bredis\b/i],
  ['Docker', /\bdocker\b/i],
  ['Kubernetes', /\bkubernetes\b|\bk8s\b/i],
  ['AWS', /\baws\b|\bamazon\s+web\s+services\b/i],
  ['GCP', /\bgcp\b|\bgoogle\s+cloud\b/i],
  ['Azure', /\bazure\b/i],
  ['GraphQL', /\bgraphql\b/i],
  ['Terraform', /\bterraform\b/i],
  ['Kafka', /\bkafka\b/i],
  ['RabbitMQ', /\brabbitmq\b/i],
  ['Git', /\bgit\b/i],
];

export function extractCandidateProfileDraft(
  parsedText: string,
): CandidateProfileDraftJson {
  const normalized = parsedText.replace(/\r\n/g, '\n').trim();

  if (!normalized) {
    return emptyDraft({ reason: 'empty_parsed_text' });
  }

  const sections = splitIntoSections(normalized);
  const preamble =
    sections.get('__preamble__')?.join('\n').trim() ?? normalized.slice(0, 400);

  const summaryBlock =
    summaryFromSections(sections) ??
    preamble.split(/\n\s*\n/)[0]?.trim()?.slice(0, 1200) ??
    null;

  const skillsSection =
    sections.get('skills')?.join('\n') ?? extractSkillsFallback(normalized);

  const skills = dedupeStrings(splitSkillTokens(skillsSection));
  const tools = dedupeStrings(findMentionedTools(normalized));

  const expLines =
    sections.get('experience') ?? sections.get('__preamble__') ?? [];
  const experiencePayload = structureExperience(expLines.join('\n'));

  const eduLines = sections.get('education') ?? [];
  const education =
    eduLines.length > 0
      ? eduLines.map((line) => ({ raw: line }))
      : ([] as unknown[]);

  const certLines = sections.get('certifications') ?? [];
  const certifications =
    certLines.length > 0
      ? certLines.map((line) => ({ raw: line }))
      : ([] as unknown[]);

  const projLines = sections.get('projects') ?? [];
  const projects =
    projLines.length > 0
      ? projLines.map((line) => ({ raw: line }))
      : ([] as unknown[]);

  const yearsOfExperience = extractYears(normalized);
  const workModes = extractWorkModes(normalized);

  const headline =
    firstHeadlineCandidate(normalized, summaryBlock) ??
    summaryBlock?.split('\n')[0]?.slice(0, 140)?.trim() ??
    null;

  return {
    headline,
    summary: summaryBlock,
    skills,
    tools,
    roles: [],
    industries: [],
    yearsOfExperience,
    locations: [],
    workModes,
    education,
    certifications,
    projects,
    experience: experiencePayload,
    rawExtractedData: {
      sectionKeys: [...sections.keys()],
      preambleSnippet: preamble.slice(0, 500),
    },
    extractionPipeline: EXTRACTION_PIPELINE,
  };
}

function emptyDraft(extra: Record<string, unknown>): CandidateProfileDraftJson {
  return {
    headline: null,
    summary: null,
    skills: [],
    tools: [],
    roles: [],
    industries: [],
    yearsOfExperience: null,
    locations: [],
    workModes: [],
    education: [],
    certifications: [],
    projects: [],
    experience: [],
    rawExtractedData: { ...extra },
    extractionPipeline: EXTRACTION_PIPELINE,
  };
}

function splitIntoSections(text: string): Map<string, string[]> {
  const lines = text.split('\n').map((l) => l.trim());
  const sections = new Map<string, string[]>();
  let currentKey = '__preamble__';

  function pushLine(line: string): void {
    if (!sections.has(currentKey)) {
      sections.set(currentKey, []);
    }
    sections.get(currentKey)!.push(line);
  }

  for (const rawLine of lines) {
    if (!rawLine) {
      continue;
    }

    const headerKey = matchSectionHeader(rawLine);
    if (headerKey) {
      currentKey = headerKey;
      if (!sections.has(currentKey)) {
        sections.set(currentKey, []);
      }
      continue;
    }

    pushLine(rawLine);
  }

  return sections;
}

function matchSectionHeader(line: string): string | null {
  const stripped = line.replace(/[:-]+$/, '').trim();
  if (stripped.length > 72) {
    return null;
  }

  for (const [key, pattern] of Object.entries(SECTION_LABELS)) {
    if (pattern.test(stripped)) {
      return key;
    }
  }

  return null;
}

function summaryFromSections(
  sections: Map<string, string[]>,
): string | null {
  const lines = sections.get('summary');
  if (!lines?.length) {
    return null;
  }
  const body = lines.join('\n').trim();
  return body.length > 0 ? body.slice(0, 2000) : null;
}

function splitSkillTokens(block: string): string[] {
  if (!block.trim()) {
    return [];
  }

  const pieces = block
    .split(/[,•·|;/]|(?:\s{2,})|\n+/g)
    .map((s) =>
      s
        .replace(/^[\s\-–]+|[\s\-–]+$/g, '')
        .replace(/^[\[(<{]+\s*|\s*[\])>}]+$/g, '')
        .trim(),
    )
    .filter(Boolean);

  return pieces.filter((s) => s.length <= 80 && !/^[−\-•]+$/.test(s));
}

function dedupeStrings(items: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      out.push(item);
    }
  }
  return out;
}

function extractSkillsFallback(fullText: string): string {
  const skillLine = fullText.split('\n').find((line) => {
    const lower = line.toLowerCase();
    return (
      lower.includes('skill') &&
      (lower.includes(',') || lower.includes('|') || lower.includes('•'))
    );
  });
  return skillLine ?? '';
}

function findMentionedTools(text: string): string[] {
  const hits: string[] = [];
  for (const [label, pattern] of KNOWN_TOOLS) {
    if (pattern.test(text)) {
      hits.push(label);
    }
  }
  return dedupeStrings(hits);
}

function extractYears(text: string): number | null {
  for (const pattern of YEARS_PATTERNS) {
    const match = text.match(pattern);
    if (!match?.[1]) {
      continue;
    }
    const value = Number(match[1]);
    if (Number.isFinite(value) && value >= 0 && value <= 60) {
      return value;
    }
  }
  return null;
}

function extractWorkModes(text: string): string[] {
  const modes: string[] = [];
  for (const [label, pattern] of WORK_MODE_KEYS) {
    if (pattern.test(text)) {
      modes.push(label);
    }
  }
  return dedupeStrings(modes);
}

function firstHeadlineCandidate(
  fullText: string,
  summary: string | null,
): string | null {
  const lines = fullText.split('\n').map((l) => l.trim()).filter(Boolean);
  for (const line of lines) {
    if (line.length > 140 || line.includes('@')) {
      continue;
    }
    if (/^\d{4}\s*[-–]\s*/.test(line)) {
      continue;
    }
    if (SECTION_LABELS.summary.test(line)) {
      continue;
    }
    if (/^[+|=*_\-]{3,}$/.test(line)) {
      continue;
    }
    if (
      /^skills\b|^experience\b|^education\b|^projects\b|^certifications\b/i.test(
        line,
      )
    ) {
      continue;
    }
    const score =
      /engineer|developer|scientist|manager|lead|architect|designer|analyst/i.test(
        line,
      )
        ? 2
        : 1;
    if (score >= 2 || (!summary && line.length <= 90)) {
      return line.slice(0, 140);
    }
  }
  return null;
}

function structureExperience(block: string): unknown[] {
  if (!block.trim()) {
    return [];
  }

  const chunks = block
    .split(/\n\s*\n/)
    .map((c) => c.trim())
    .filter(Boolean);

  if (chunks.length <= 1) {
    return [{ raw: block.trim() }];
  }

  return chunks.slice(0, 25).map((raw) => ({ raw }));
}
