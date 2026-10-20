import { config } from 'dotenv';
import { defineConfig } from 'prisma/config';

// Both apps share the root .env.local.
config({ path: ['.env.local', '.env', '../../.env.local', '../../.env'], quiet: true });

// Migrations need a direct (non-pooled) connection; the app itself uses DATABASE_URL.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
});
