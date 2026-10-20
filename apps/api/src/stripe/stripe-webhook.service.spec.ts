import type Stripe from 'stripe';
import { beforeEach, describe, expect, it } from 'vitest';
import { createFakePrisma } from '../../test/fake-prisma.js';
import type { PrismaService } from '../prisma/prisma.service.js';
import { StripeWebhookService } from './stripe-webhook.service.js';

const NOW = new Date('2026-10-20T09:00:00Z');

function checkoutEvent(
  type: Stripe.Event['type'],
  session: Partial<Stripe.Checkout.Session>,
  id = 'evt_1',
): Stripe.Event {
  return {
    id,
    type,
    data: {
      object: {
        id: 'cs_test_1',
        payment_status: 'paid',
        amount_total: 16_910,
        currency: 'eur',
        payment_intent: 'pi_1',
        metadata: { subscriptionId: 'sub_1' },
        ...session,
      },
    },
  } as unknown as Stripe.Event;
}

describe('StripeWebhookService', () => {
  let prisma: ReturnType<typeof createFakePrisma>;
  let service: StripeWebhookService;

  beforeEach(() => {
    prisma = createFakePrisma({
      subscriptions: [{ id: 'sub_1', status: 'PENDING', period: 'MONTHLY', amountCents: 16_910, currency: 'eur' }],
    });
    service = new StripeWebhookService(prisma as unknown as PrismaService);
  });

  it('activates a pending subscription when checkout completes', async () => {
    const outcome = await service.handle(checkoutEvent('checkout.session.completed', {}), NOW);

    expect(outcome).toBe('activated');
    const sub = prisma.subs.get('sub_1')!;
    expect(sub.status).toBe('ACTIVE');
    expect(sub.stripePaymentIntentId).toBe('pi_1');
    expect((sub.currentPeriodStart as Date).toISOString()).toBe('2026-10-20T09:00:00.000Z');
    expect((sub.currentPeriodEnd as Date).toISOString()).toBe('2026-11-20T09:00:00.000Z');
  });

  it('is idempotent when Stripe retries the same event', async () => {
    const event = checkoutEvent('checkout.session.completed', {});
    await service.handle(event, NOW);
    expect(await service.handle(event, new Date('2026-10-21T00:00:00Z'))).toBe('duplicate');
    expect((prisma.subs.get('sub_1')!.currentPeriodStart as Date).toISOString()).toBe('2026-10-20T09:00:00.000Z');
  });

  it('waits for delayed payment methods', async () => {
    const outcome = await service.handle(checkoutEvent('checkout.session.completed', { payment_status: 'unpaid' }), NOW);
    expect(outcome).toBe('ignored');
    expect(prisma.subs.get('sub_1')!.status).toBe('PENDING');

    const later = checkoutEvent('checkout.session.async_payment_succeeded', {}, 'evt_2');
    expect(await service.handle(later, NOW)).toBe('activated');
  });

  it('refuses to activate when the charged amount does not match the priced amount', async () => {
    const outcome = await service.handle(checkoutEvent('checkout.session.completed', { amount_total: 100 }), NOW);
    expect(outcome).toBe('ignored');
    expect(prisma.subs.get('sub_1')!.status).toBe('PENDING');
  });

  it('cancels the pending subscription when the session expires', async () => {
    const outcome = await service.handle(checkoutEvent('checkout.session.expired', { payment_status: 'unpaid' }), NOW);
    expect(outcome).toBe('expired');
    expect(prisma.subs.get('sub_1')!.status).toBe('CANCELED');
  });

  it('does not touch subscriptions that are already active', async () => {
    prisma.subs.get('sub_1')!.status = 'ACTIVE';
    expect(await service.handle(checkoutEvent('checkout.session.expired', {}), NOW)).toBe('ignored');
    expect(prisma.subs.get('sub_1')!.status).toBe('ACTIVE');
  });

  it('ignores unrelated events and sessions without our metadata', async () => {
    expect(await service.handle({ id: 'evt_x', type: 'customer.created', data: { object: {} } } as Stripe.Event, NOW)).toBe(
      'ignored',
    );
    expect(await service.handle(checkoutEvent('checkout.session.completed', { metadata: {} }, 'evt_y'), NOW)).toBe('ignored');
  });
});
