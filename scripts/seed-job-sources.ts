import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import {
  parseLaunchEmployersSeedFile,
  type LaunchEmployerSeedRow,
} from '../src/job-sources/seed/launch-employer-seed.schema';
import {
  planJobSourceSeed,
  summarizeSeedResults,
  type JobSourceSeedResult,
} from '../src/job-sources/seed/job-source-seeder';

const DEFAULT_SEED_PATH = resolve(
  process.cwd(),
  'data/launch-employers.seed.json',
);

function parseArgs(argv: string[]): {
  filePath: string;
  dryRun: boolean;
  statuses: LaunchEmployerSeedRow['sourceStatus'][];
} {
  let filePath = DEFAULT_SEED_PATH;
  let dryRun = false;
  let statuses: LaunchEmployerSeedRow['sourceStatus'][] = [
    'ACTIVE',
    'CANDIDATE',
    'PAUSED',
  ];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (arg === '--file') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--file requires a path');
      }
      filePath = resolve(process.cwd(), next);
      i++;
      continue;
    }
    if (arg === '--status') {
      const next = argv[i + 1];
      if (!next) {
        throw new Error('--status requires ACTIVE,CANDIDATE,PAUSED');
      }
      statuses = next.split(',').map((s) => s.trim()) as LaunchEmployerSeedRow['sourceStatus'][];
      i++;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${arg}`);
  }

  return { filePath, dryRun, statuses };
}

function printHelp(): void {
  console.log(`Usage: npm run seed:job-sources [-- options]

Options:
  --file <path>     Seed JSON path (default: data/launch-employers.seed.json)
  --dry-run         Validate and print plan without writing to the database
  --status <list>   Comma-separated sourceStatus filter (default: ACTIVE,CANDIDATE,PAUSED)
  --help            Show this message
`);
}

async function main(): Promise<void> {
  const { filePath, dryRun, statuses } = parseArgs(process.argv.slice(2));
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is required.');
  }

  const rawJson: unknown = JSON.parse(readFileSync(filePath, 'utf8'));
  const parsed = parseLaunchEmployersSeedFile(rawJson);
  if (!parsed.ok) {
    throw new Error(`Invalid seed file: ${parsed.error}`);
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString }),
  });

  try {
    const existingRows = await prisma.jobSource.findMany();
    const plans = planJobSourceSeed(parsed.value, existingRows, {
      includeStatuses: statuses,
    });

    if (dryRun) {
      console.log(
        JSON.stringify(
          {
            dryRun: true,
            filePath,
            planned: plans.length,
            employers: plans.map((plan) => ({
              seedKey: plan.employer.seedKey,
              companyName: plan.employer.companyName,
              action: plan.existing ? 'update' : 'create',
              isActive: plan.upsert.isActive,
            })),
          },
          null,
          2,
        ),
      );
      return;
    }

    const results: JobSourceSeedResult[] = [];

    for (const plan of plans) {
      if (plan.existing) {
        const row = await prisma.jobSource.update({
          where: { id: plan.existing.id },
          data: {
            name: plan.upsert.name,
            type: plan.upsert.type,
            baseUrl: plan.upsert.baseUrl,
            isActive: plan.upsert.isActive,
            config: plan.upsert.config,
          },
        });
        results.push({
          seedKey: plan.employer.seedKey,
          companyName: plan.employer.companyName,
          action: 'updated',
          jobSourceId: row.id,
        });
        continue;
      }

      const row = await prisma.jobSource.create({
        data: plan.upsert,
      });
      results.push({
        seedKey: plan.employer.seedKey,
        companyName: plan.employer.companyName,
        action: 'created',
        jobSourceId: row.id,
      });
    }

    const summary = summarizeSeedResults(results);
    console.log(
      JSON.stringify(
        {
          filePath,
          ...summary,
        },
        null,
        2,
      ),
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
