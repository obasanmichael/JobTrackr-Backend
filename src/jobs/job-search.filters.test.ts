import {
  ExternalExperienceLevel,
  ExternalJobRemoteType,
  WorkMode,
} from '@prisma/client';
import {
  buildJobExcerpt,
  buildJobSearchWhere,
  remoteTypeToWorkMode,
  workModeToRemoteType,
} from './job-search.filters';

describe('job-search.filters', () => {
  it('maps work mode to remote type', () => {
    expect(workModeToRemoteType(WorkMode.REMOTE)).toBe(
      ExternalJobRemoteType.REMOTE,
    );
    expect(remoteTypeToWorkMode(ExternalJobRemoteType.HYBRID)).toBe(
      WorkMode.HYBRID,
    );
  });

  it('builds active-only keyword search', () => {
    const where = buildJobSearchWhere({ q: 'engineer' });

    expect(where.isActive).toBe(true);
    expect(where.isSuspicious).toBe(false);
    expect(where.OR).toEqual([
      { title: { contains: 'engineer', mode: 'insensitive' } },
      { company: { contains: 'engineer', mode: 'insensitive' } },
      { description: { contains: 'engineer', mode: 'insensitive' } },
    ]);
  });

  it('combines location, work mode, experience, source, and salary filters', () => {
    const where = buildJobSearchWhere({
      location: 'London',
      workMode: WorkMode.REMOTE,
      experienceLevel: ExternalExperienceLevel.SENIOR,
      source: 'Stripe',
      salaryMin: 100000,
    });

    expect(where.location).toEqual({
      contains: 'London',
      mode: 'insensitive',
    });
    expect(where.remoteType).toBe(ExternalJobRemoteType.REMOTE);
    expect(where.experienceLevel).toBe(ExternalExperienceLevel.SENIOR);
    expect(where.sourceName).toEqual({
      contains: 'Stripe',
      mode: 'insensitive',
    });
    expect(where.AND).toEqual([
      {
        OR: [{ salaryMax: { gte: 100000 } }, { salaryMin: { gte: 100000 } }],
      },
    ]);
  });

  it('builds postedWithin cutoff', () => {
    const where = buildJobSearchWhere({ postedWithin: 7 });
    expect(where.postedAt?.gte).toBeInstanceOf(Date);
  });

  it('truncates long descriptions for excerpts', () => {
    const excerpt = buildJobExcerpt(` ${'a'.repeat(300)} `);
    expect(excerpt).toHaveLength(240);
    expect(excerpt?.endsWith('...')).toBe(true);
  });
});
