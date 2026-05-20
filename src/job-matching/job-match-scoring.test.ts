import { ExternalExperienceLevel, ExternalJobRemoteType } from '@prisma/client';
import {
  buildMatchReason,
  jobInputFromExternalJob,
  profileInputFromRecord,
  scoreExperienceMatch,
  scoreJobMatch,
  scoreLocationMatch,
  scoreRecency,
  scoreSkillMatch,
  scoreTitleMatch,
} from './job-match-scoring';

describe('job-match-scoring', () => {
  const profile = {
    skills: ['React', 'TypeScript', 'Node.js'],
    tools: ['PostgreSQL'],
    roles: ['Software Engineer'],
    locations: ['London, UK'],
    workModes: ['REMOTE'],
    yearsOfExperience: 5,
  };

  const job = {
    title: 'Senior Software Engineer',
    description: 'Build APIs with React, TypeScript, and Node.js on AWS.',
    requirements: '5+ years experience required.',
    location: 'Remote, UK',
    remoteType: ExternalJobRemoteType.REMOTE,
    experienceLevel: ExternalExperienceLevel.SENIOR,
    postedAt: new Date('2026-05-18T00:00:00.000Z'),
  };

  it('scores a strong profile/job fit highly', () => {
    const result = scoreJobMatch(
      profile,
      job,
      new Date('2026-05-20T00:00:00.000Z'),
    );

    expect(result.overallScore).toBeGreaterThanOrEqual(70);
    expect(result.matchedSkills).toEqual(
      expect.arrayContaining(['React', 'TypeScript']),
    );
    expect(result.matchReason.length).toBeGreaterThan(0);
  });

  it('scores title overlap from target roles', () => {
    expect(scoreTitleMatch(profile, job)).toBeGreaterThanOrEqual(70);
  });

  it('detects skill overlap and missing skills', () => {
    const skill = scoreSkillMatch(profile, job);
    expect(skill.matchedSkills).toContain('React');
    expect(skill.skillScore).toBeGreaterThan(0);
  });

  it('scores experience level fit from years', () => {
    expect(
      scoreExperienceMatch(5, ExternalExperienceLevel.SENIOR),
    ).toBeGreaterThanOrEqual(70);
  });

  it('scores location and remote fit', () => {
    expect(scoreLocationMatch(profile, job)).toBeGreaterThanOrEqual(85);
  });

  it('decays recency for older postings', () => {
    expect(
      scoreRecency(
        new Date('2026-05-18T00:00:00.000Z'),
        new Date('2026-05-20T00:00:00.000Z'),
      ),
    ).toBe(100);
    expect(
      scoreRecency(
        new Date('2026-01-01T00:00:00.000Z'),
        new Date('2026-05-20T00:00:00.000Z'),
      ),
    ).toBeLessThan(70);
  });

  it('maps prisma records into scoring inputs', () => {
    const mappedProfile = profileInputFromRecord({
      skills: ['React'],
      tools: null,
      roles: ['Engineer'],
      locations: ['US'],
      workModes: ['HYBRID'],
      yearsOfExperience: 3,
    });
    expect(mappedProfile.skills).toEqual(['React']);

    const mappedJob = jobInputFromExternalJob({
      title: 'Engineer',
      description: null,
      requirements: null,
      location: 'NY',
      remoteType: ExternalJobRemoteType.HYBRID,
      experienceLevel: ExternalExperienceLevel.MID,
      postedAt: null,
    });
    expect(mappedJob.title).toBe('Engineer');
  });

  it('builds readable match reasons', () => {
    const reason = buildMatchReason({
      titleScore: 90,
      skillScore: 88,
      experienceScore: 80,
      locationScore: 85,
      recencyScore: 70,
      matchedSkills: ['React', 'Node.js'],
      missingSkills: ['kubernetes'],
    });
    expect(reason).toContain('Strong skill overlap');
  });
});
