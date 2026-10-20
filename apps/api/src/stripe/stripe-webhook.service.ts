import { Injectable, Logger } from '@nestjs/common';
import type Stripe from 'stripe';
import { Prisma } from '../generated/prisma/client.js';
import { PrismaService, type Tx } from '../prisma/prisma.service.js';
import { periodEnd } from '../pricing/pricing.js';

export type WebhookOutcome = 'activated' | 'expired' | 'duplicate' | 'ignored';

/**
 * Applies Stripe events to subscriptions. Each event is recorded in
 * `stripe_events` inside the same transaction as its effect, so a retried
 * delivery is a no-op instead of a double activation.
 */
@Injectable()
export class StripeWebhookService {
  private readonly logger = new Logger(StripeWebhookService.name);

  constructor(private readonly prisma: PrismaService) {}

  async handle(event: Stripe.Event, now = new Date()): Promise<WebhookOutcome> {
    try {
      return await this.prisma.$transaction(async (tx) => {
        await tx.stripeEvent.create({ data: { id: event.id, type: event.type } });
        return this.apply(tx, event, now);
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') return 'duplicate';
      throw e;
    }
  }

  private async apply(tx: Tx, event: Stripe.Event, now: Date): Promise<WebhookOutcome> {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object;
        // Delayed payment methods complete the session before the money arrives.
        if (session.payment_status !== 'paid') return 'ignored';
        return this.activate(tx, session, now);
      }
      case 'checkout.session.expired':
      case 'checkout.session.async_payment_failed': {
        const id = event.data.object.metadata?.subscriptionId;
        if (!id) return 'ignored';
        const { count } = await tx.subscription.updateMany({
          where: { id, status: 'PENDING' },
          data: { status: 'CANCELED' },
        });
        return count ? 'expired' : 'ignored';
      }
      default:
        return 'ignored';
    }
  }

  private async activate(tx: Tx, session: Stripe.Checkout.Session, now: Date): Promise<WebhookOutcome> {
    const id = session.metadata?.subscriptionId;
    if (!id) return 'ignored';

    const sub = await tx.subscription.findUnique({ where: { id } });
    if (!sub || sub.status !== 'PENDING') return 'ignored';

    // Defence in depth: the amount charged must match what we priced.
    if (session.amount_total !== sub.amountCents || session.currency !== sub.currency) {
      this.logger.error(
        `Amount mismatch for subscription ${id}: charged ${session.amount_total} ${session.currency}, expected ${sub.amountCents} ${sub.currency}`,
      );
      return 'ignored';
    }

    await tx.subscription.update({
      where: { id },
      data: {
        status: 'ACTIVE',
        stripeCheckoutSessionId: session.id,
        stripePaymentIntentId: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id,
        currentPeriodStart: now,
        currentPeriodEnd: periodEnd(now, sub.period),
      },
    });
    return 'activated';
  }
}
