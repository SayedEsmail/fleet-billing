import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { configureApp } from './setup.js';

async function bootstrap() {
  // rawBody keeps the exact bytes Stripe signed, for webhook verification.
  const app = configureApp(await NestFactory.create(AppModule, { rawBody: true }));
  await app.listen(Number(process.env.PORT ?? 4000), '0.0.0.0');
}

void bootstrap();
