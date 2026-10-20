import 'reflect-metadata';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { NestFactory } from '@nestjs/core';
import type { Express } from 'express';
import { AppModule } from './app.module.js';
import { configureApp } from './setup.js';

/**
 * Serverless entry (Vercel). Boots Nest once per warm instance and hands each
 * request to the underlying Express app; main.ts stays the long-running entry
 * for Docker and local dev.
 */
let server: Promise<Express> | undefined;

function bootstrap(): Promise<Express> {
  server ??= (async () => {
    const app = configureApp(await NestFactory.create(AppModule, { rawBody: true }));
    await app.init();
    return app.getHttpAdapter().getInstance() as Express;
  })();
  return server;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const app = await bootstrap();
  app(req as never, res as never);
}
