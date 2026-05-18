import { extractCandidateProfileDraft } from './candidate-profile-heuristic.extractor';

describe('extractCandidateProfileDraft', () => {
  it('returns pipeline marker and handles empty input', () => {
    const draft = extractCandidateProfileDraft('');
    expect(draft.extractionPipeline).toBe('heuristic:v1');
    expect(draft.skills).toEqual([]);
    expect(draft.rawExtractedData).toMatchObject({ reason: 'empty_parsed_text' });
  });

  it('pulls skills section and years hint', () => {
    const text = `
Jane Doe

Professional Summary
Backend engineer shipping APIs.

Skills
JavaScript, TypeScript, Docker, PostgreSQL

Experience
Senior Engineer — Acme Corp
Built NestJS services.

5+ years experience.
`;

    const draft = extractCandidateProfileDraft(text);
    expect(draft.skills.map((s) => s.toLowerCase())).toEqual(
      expect.arrayContaining(['javascript', 'typescript']),
    );
    expect(draft.yearsOfExperience).toBe(5);
    expect(draft.summary?.toLowerCase()).toContain('backend engineer');
    expect(draft.tools.map((t) => t.toLowerCase())).toEqual(
      expect.arrayContaining(['docker', 'postgresql']),
    );
  });

  it('detects remote work mode keyword', () => {
    const draft = extractCandidateProfileDraft(
      'Skills\nReact\n\nFully remote engineer.',
    );
    expect(draft.workModes).toContain('REMOTE');
  });
});
