import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { ExternalJobQualityService } from '../src/job-sources/external-job-quality.service';
import { PrismaService } from '../src/prisma/prisma.service';

function parseArgs(argv: string[]): { dryRun: boolean } {
  let dryRun = false;

  for (const arg of argv) {
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { dryRun };
}

function printHelp(): void {
  console.log(`Usage: npm run quality:purge-inactive-external-jobs [-- --dry-run]

Deletes inactive external jobs older than EXTERNAL_JOB_INACTIVE_RETENTION_DAYS
when EXTERNAL_JOB_PURGE_ENABLED=true. Use --dry-run to count only.
`);
}

async function main(): Promise<void> {
  const { dryRun } = parseArgs(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const service = new ExternalJobQualityService(
      prisma as unknown as PrismaService,
    );
    service.assertPurgeEnabledOrDryRun(dryRun);
    const result = await service.purgeInactiveExternalJobs({ dryRun });
    console.log(JSON.stringify(result, null, 2));
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
