import type { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SignJWT } from 'jose';
import Stripe from 'stripe';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { configureApp } from '../src/setup.js';
import { createFakePrisma } from './fake-prisma.js';

/**
 * HTTP-level tests for the guard/role/validation/webhook pipeline. Prisma is
 * replaced by an in-memory fake and JWTs are signed with a test HS256 secret,
 * so this runs in CI without Supabase or a database.
 */
const SUPABASE_URL = 'https://test-project.supabase.co';
const JWT_SECRET = 'test-jwt-secret-at-least-32-characters-long';
const WEBHOOK_SECRET = 'whsec_test_secret';
const OPERATOR_ID = '00000000-0000-4000-8000-000000000001';
const PARENT_ID = '00000000-0000-4000-8000-000000000002';

Object.assign(process.env, {
  SUPABASE_URL,
  SUPABASE_JWT_SECRET: JWT_SECRET,
  DATABASE_URL: 'postgresql://user:pass@localhost:5432/unused',
  STRIPE_SECRET_KEY: 'sk_test_unused',
  STRIPE_WEBHOOK_SECRET: WEBHOOK_SECRET,
  WEB_URL: 'http://localhost:3000',
});

function token(sub: string, secret = JWT_SECRET) {
  return new SignJWT({ email: `${sub}@example.com`, role: 'authenticated' })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(sub)
    .setIssuer(`${SUPABASE_URL}/auth/v1`)
    .setAudience('authenticated')
    .setExpirationTime('5m')
    .sign(new TextEncoder().encode(secret));
}

describe('API (e2e)', () => {
  let app: INestApplication;
  const prisma = createFakePrisma({
    roles: { [OPERATOR_ID]: 'OPERATOR', [PARENT_ID]: 'PARENT' },
    subscriptions: [{ id: 'sub_1', status: 'PENDING', period: 'TERM', amountCents: 32_000, currency: 'eur' }],
  });

  beforeAll(async () => {
    // Imported here so the env above is set before ConfigModule.forRoot() runs.
    const { AppModule } = await import('../src/app.module.js');
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = configureApp(moduleRef.createNestApplication({ rawBody: true }));
    await app.init();
  });

  afterAll(() => app?.close());

  it('serves health and pricing without a token', async () => {
    await request(app.getHttpServer()).get('/health').expect(200, { status: 'ok' });
    const res = await request(app.getHttpServer()).get('/plans/quote?period=MONTHLY&children=2').expect(200);
    expect(res.body.totalCents).toBe(16_910);
  });

  it('rejects requests without a bearer token', async () => {
    await request(app.getHttpServer()).get('/buses').expect(401);
  });

  it('rejects tokens signed with the wrong key', async () => {
    const forged = await token(OPERATOR_ID, 'some-other-secret-that-is-long-enough!!');
    await request(app.getHttpServer()).get('/buses').set('Authorization', `Bearer ${forged}`).expect(401);
  });

  it('forbids parents from operator routes', async () => {
    const auth = `Bearer ${await token(PARENT_ID)}`;
    await request(app.getHttpServer()).get('/buses').set('Authorization', auth).expect(403);
    await request(app.getHttpServer()).get('/stats').set('Authorization', auth).expect(403);
  });

  it('lets operators manage buses and validates the body', async () => {
    const auth = `Bearer ${await token(OPERATOR_ID)}`;
    await request(app.getHttpServer()).get('/buses').set('Authorization', auth).expect(200, []);
    await request(app.getHttpServer())
      .post('/buses')
      .set('Authorization', auth)
      .send({ plateNumber: 'x', capacity: 500, driverName: 'A', hacked: true })
      .expect(400);
    const created = await request(app.getHttpServer())
      .post('/buses')
      .set('Authorization', auth)
      .send({ plateNumber: 'fb-777', capacity: 20, driverName: 'Test Driver' })
      .expect(201);
    expect(created.body.plateNumber).toBe('FB-777');
  });

  it('returns the profile from /me', async () => {
    const res = await request(app.getHttpServer())
      .get('/me')
      .set('Authorization', `Bearer ${await token(OPERATOR_ID)}`)
      .expect(200);
    expect(res.body).toMatchObject({ id: OPERATOR_ID, role: 'OPERATOR' });
  });

  describe('Stripe webhook', () => {
    const payload = JSON.stringify({
      id: 'evt_e2e_1',
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_test_e2e',
          object: 'checkout.session',
          payment_status: 'paid',
          amount_total: 32_000,
          currency: 'eur',
          payment_intent: 'pi_e2e',
          metadata: { subscriptionId: 'sub_1' },
        },
      },
    });

    it('rejects unsigned and badly signed payloads', async () => {
      await request(app.getHttpServer()).post('/stripe/webhook').set('Content-Type', 'application/json').send(payload).expect(400);
      await request(app.getHttpServer())
        .post('/stripe/webhook')
        .set('Content-Type', 'application/json')
        .set('Stripe-Signature', 't=1,v1=deadbeef')
        .send(payload)
        .expect(400);
    });

    it('activates the subscription for a correctly signed event, once', async () => {
      const signature = Stripe.webhooks.generateTestHeaderString({ payload, secret: WEBHOOK_SECRET });
      const send = () =>
        request(app.getHttpServer())
          .post('/stripe/webhook')
          .set('Content-Type', 'application/json')
          .set('Stripe-Signature', signature)
          .send(payload)
          .expect(200);

      expect((await send()).body.outcome).toBe('activated');
      expect(prisma.subs.get('sub_1')!.status).toBe('ACTIVE');
      expect((await send()).body.outcome).toBe('duplicate');
    });
  });
});
