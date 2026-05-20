import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { ExternalJobQualityService } from '../src/job-sources/external-job-quality.service';
import { PrismaService } from '../src/prisma/prisma.service';

function printHelp(): void {
  console.log(`Usage: npm run quality:scan-external-jobs

Runs the Phase J.1 quality scan over all active external jobs.
`);
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    printHelp();
    process.exit(0);
  }

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
    const result = await service.runQualityScan();
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
