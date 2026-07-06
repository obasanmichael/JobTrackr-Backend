import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL is required to initialize PrismaClient.');
    }

    super({
      adapter: new PrismaPg({ connectionString }),
      transactionOptions: {
        // Remote Postgres (Neon) round-trip latency makes 50-statement
        // ingest batches exceed the 5s default.
        maxWait: 10_000,
        timeout: 30_000,
      },
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
