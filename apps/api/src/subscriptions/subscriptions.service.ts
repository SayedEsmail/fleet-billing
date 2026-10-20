import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AuthUser } from '../auth/decorators.js';
import type { SubscriptionStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { PLANS, quote } from '../pricing/pricing.js';
import { StripeService } from '../stripe/stripe.service.js';
import type { CheckoutDto } from './subscriptions.dto.js';

const PLAN_LABEL = { MONTHLY: 'Monthly school bus plan', TERM: 'Term school bus plan (4 months)' } as const;

@Injectable()
export class SubscriptionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stripe: StripeService,
    private readonly config: ConfigService,
  ) {}

  /** Operator view: every subscription, newest first. */
  findAll(status?: SubscriptionStatus) {
    return this.prisma.subscription.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: 'desc' },
      take: 200,
      include: {
        parent: { select: { fullName: true, email: true } },
        trip: { select: { name: true, direction: true } },
      },
    });
  }

  /**
   * Parent view. Deliberately has no `where parentId = …`: the query runs as
   * the `authenticated` Postgres role and the RLS policy returns only the
   * caller's rows.
   */
  async findMine(user: AuthUser) {
    const rows = await this.prisma.asUser(user.id, user.role, (tx) =>
      tx.subscription.findMany({ orderBy: { createdAt: 'desc' } }),
    );
    const trips = await this.prisma.trip.findMany({
      where: { id: { in: [...new Set(rows.map((r) => r.tripId))] } },
      select: { id: true, name: true, direction: true, departureTime: true },
    });
    const tripById = new Map(trips.map((t) => [t.id, t]));
    return rows.map(({ stripeCheckoutSessionId: _s, stripePaymentIntentId: _p, ...row }) => ({
      ...row,
      trip: tripById.get(row.tripId) ?? null,
    }));
  }

  /** Creates a PENDING subscription and a Stripe Checkout session for it. The webhook activates it. */
  async startCheckout(user: AuthUser, dto: CheckoutDto): Promise<{ url: string }> {
    const childIds = [...new Set(dto.childIds)];
    const [children, trip] = await Promise.all([
      this.prisma.child.findMany({ where: { id: { in: childIds }, parentId: user.id }, select: { id: true, name: true } }),
      this.prisma.trip.findUnique({ where: { id: dto.tripId }, select: { id: true, name: true } }),
    ]);
    if (!trip) throw new NotFoundException('Trip not found');
    if (children.length !== childIds.length) throw new BadRequestException('Unknown child');

    const alreadyCovered = await this.prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        currentPeriodEnd: { gt: new Date() },
        children: { some: { id: { in: childIds } } },
      },
    });
    if (alreadyCovered) throw new ConflictException('A selected child already has an active subscription');

    const q = quote(dto.period, children.length);
    const sub = await this.prisma.subscription.create({
      data: {
        parentId: user.id,
        tripId: trip.id,
        period: dto.period,
        childrenCount: q.childrenCount,
        amountCents: q.totalCents,
        currency: q.currency,
        children: { connect: children.map((c) => ({ id: c.id })) },
      },
    });

    const webUrl = this.config.getOrThrow<string>('WEB_URL').split(',')[0];
    const locale = dto.locale ?? 'en';
    const session = await this.stripe.client.checkout.sessions.create(
      {
        mode: 'payment',
        customer_email: user.email || undefined,
        client_reference_id: sub.id,
        metadata: { subscriptionId: sub.id },
        payment_intent_data: { metadata: { subscriptionId: sub.id } },
        line_items: q.lines.map((line, i) => ({
          quantity: 1,
          price_data: {
            currency: q.currency,
            unit_amount: line.amountCents,
            product_data: {
              name: `${PLAN_LABEL[dto.period]} — ${children[i].name}`,
              description: `${trip.name} · ${PLANS[dto.period].months} month(s)${line.discountPercent ? ` · sibling discount ${line.discountPercent}%` : ''}`,
            },
          },
        })),
        success_url: `${webUrl}/${locale}/parent?checkout=success`,
        cancel_url: `${webUrl}/${locale}/parent?checkout=canceled`,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
      },
      { idempotencyKey: `checkout-${sub.id}` },
    );

    await this.prisma.subscription.update({ where: { id: sub.id }, data: { stripeCheckoutSessionId: session.id } });
    if (!session.url) throw new Error('Stripe did not return a checkout URL');
    return { url: session.url };
  }
}
