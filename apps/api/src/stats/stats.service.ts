import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { monthlyEquivalentCents } from '../pricing/pricing.js';

@Injectable()
export class StatsService {
  constructor(private readonly prisma: PrismaService) {}

  async overview() {
    const [activeBuses, statusCounts, active, trips] = await Promise.all([
      this.prisma.bus.count({ where: { active: true } }),
      this.prisma.subscription.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        select: { tripId: true, period: true, amountCents: true, childrenCount: true },
      }),
      this.prisma.trip.findMany({
        select: { id: true, name: true, direction: true, departureTime: true, bus: { select: { plateNumber: true, capacity: true } } },
        orderBy: [{ direction: 'asc' }, { departureTime: 'asc' }],
      }),
    ]);

    const countFor = (status: string) => statusCounts.find((s) => s.status === status)?._count._all ?? 0;

    const seatsByTrip = new Map<string, number>();
    for (const s of active) seatsByTrip.set(s.tripId, (seatsByTrip.get(s.tripId) ?? 0) + s.childrenCount);

    return {
      activeBuses,
      subscriptions: {
        active: countFor('ACTIVE'),
        pending: countFor('PENDING'),
        expired: countFor('EXPIRED'),
      },
      mrrCents: active.reduce((sum, s) => sum + monthlyEquivalentCents(s.amountCents, s.period), 0),
      ridersActive: active.reduce((sum, s) => sum + s.childrenCount, 0),
      tripUtilization: trips.map((t) => {
        const seatsTaken = seatsByTrip.get(t.id) ?? 0;
        return {
          tripId: t.id,
          name: t.name,
          direction: t.direction,
          departureTime: t.departureTime,
          plateNumber: t.bus.plateNumber,
          capacity: t.bus.capacity,
          seatsTaken,
          utilization: t.bus.capacity > 0 ? Math.round((seatsTaken / t.bus.capacity) * 100) / 100 : 0,
        };
      }),
    };
  }
}
