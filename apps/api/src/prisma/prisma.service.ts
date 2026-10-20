import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { Prisma, PrismaClient } from '../generated/prisma/client.js';

export type Tx = Prisma.TransactionClient;

/**
 * Prisma connects lazily on the first query, so the app (and its e2e tests)
 * can boot without a database.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor(config: ConfigService) {
    super({ adapter: new PrismaPg({ connectionString: config.getOrThrow<string>('DATABASE_URL') }) });
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Runs `fn` as the Postgres `authenticated` role with the caller's JWT claims,
   * so Row Level Security policies apply exactly as they would for a direct
   * Supabase client. Used for reads where the database, not the API, should
   * enforce ownership.
   */
  asUser<T>(userId: string, role: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
    const claims = JSON.stringify({ sub: userId, role: 'authenticated', app_role: role });
    return this.$transaction(async (tx) => {
      await tx.$executeRaw`select set_config('request.jwt.claims', ${claims}, true)`;
      await tx.$executeRawUnsafe('set local role authenticated');
      return fn(tx);
    });
  }
}
