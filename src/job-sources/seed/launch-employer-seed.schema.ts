import { z } from 'zod';

export const launchMarketSchema = z.enum(['NG', 'GB', 'US']);

export const atsTypeSchema = z.enum(['GREENHOUSE', 'LEVER']);

export const sourceStatusSchema = z.enum([
  'CANDIDATE',
  'ACTIVE',
  'PAUSED',
  'REJECTED',
]);

export const roleFamilySchema = z.enum([
  'Software Engineering',
  'Product Management',
  'Product Design',
  'Data',
]);

export const launchEmployerSchema = z
  .object({
    seedKey: z.string().min(1).max(120),
    companyName: z.string().min(1).max(200),
    careersUrl: z.string().url().max(2048),
    atsType: atsTypeSchema,
    boardToken: z.string().min(1).max(200).optional(),
    site: z.string().min(1).max(200).optional(),
    launchMarkets: z.array(launchMarketSchema).min(1),
    roleFamilies: z.array(roleFamilySchema).min(1),
    sourceStatus: sourceStatusSchema.default('CANDIDATE'),
    priority: z.number().int().min(1).max(10).default(5),
    notes: z.string().max(2000).optional(),
  })
  .superRefine((row, ctx) => {
    if (row.atsType === 'GREENHOUSE' && !row.boardToken?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'boardToken is required when atsType is GREENHOUSE',
        path: ['boardToken'],
      });
    }
    if (row.atsType === 'LEVER' && !row.site?.trim()) {
      ctx.addIssue({
        code: 'custom',
        message: 'site is required when atsType is LEVER',
        path: ['site'],
      });
    }
    if (row.sourceStatus === 'REJECTED') {
      ctx.addIssue({
        code: 'custom',
        message: 'REJECTED employers must be removed from the seed file',
        path: ['sourceStatus'],
      });
    }
  });

export const launchEmployersSeedFileSchema = z.object({
  version: z.literal(1),
  employers: z.array(launchEmployerSchema).min(1),
});

export type LaunchEmployerSeedRow = z.infer<typeof launchEmployerSchema>;
export type LaunchEmployersSeedFile = z.infer<
  typeof launchEmployersSeedFileSchema
>;

export function parseLaunchEmployersSeedFile(
  raw: unknown,
): { ok: true; value: LaunchEmployersSeedFile } | { ok: false; error: string } {
  const parsed = launchEmployersSeedFileSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues.map((i) => i.message).join('; '),
    };
  }
  return { ok: true, value: parsed.data };
}
