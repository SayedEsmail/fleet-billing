import path from 'node:path';
import { config } from 'dotenv';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

// Both apps share the root .env.local in development.
config({ path: ['.env.local', '../../.env.local'], quiet: true });

const nextConfig: NextConfig = {
  // Self-contained server bundle, only for the Docker image (Vercel and `next start` don't need it).
  output: process.env.BUILD_STANDALONE === '1' ? 'standalone' : undefined,
  outputFileTracingRoot: path.join(import.meta.dirname, '../..'),
};

export default createNextIntlPlugin('./src/i18n/request.ts')(nextConfig);
