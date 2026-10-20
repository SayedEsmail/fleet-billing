import { Injectable } from '@nestjs/common';
import type { SubscriptionStatus } from '../generated/prisma/enums.js';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class SubscriptionsService {
  constructor(private readonly prisma: PrismaService) {}

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
}
