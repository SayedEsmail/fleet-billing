import { Prisma } from '../src/generated/prisma/client.js';

type Sub = {
  id: string;
  status: string;
  period: 'MONTHLY' | 'TERM';
  amountCents: number;
  currency: string;
  [key: string]: unknown;
};

/**
 * Minimal in-memory stand-in for the parts of PrismaService the tests touch.
 * Enough to exercise guards and webhook logic without a database.
 */
export function createFakePrisma(opts: { roles?: Record<string, 'OPERATOR' | 'PARENT'>; subscriptions?: Sub[] } = {}) {
  const events = new Set<string>();
  const subs = new Map((opts.subscriptions ?? []).map((s) => [s.id, { ...s }]));

  const fake = {
    subs,
    events,
    profile: {
      upsert: async ({ where, create }: { where: { id: string }; create: { email: string } }) => ({
        id: where.id,
        email: create.email,
        role: opts.roles?.[where.id] ?? 'PARENT',
      }),
    },
    bus: {
      findMany: async () => [],
      create: async ({ data }: { data: object }) => ({ id: 'bus-1', ...data }),
    },
    stripeEvent: {
      create: async ({ data }: { data: { id: string } }) => {
        if (events.has(data.id)) {
          throw new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
            code: 'P2002',
            clientVersion: 'test',
          });
        }
        events.add(data.id);
        return data;
      },
    },
    subscription: {
      findUnique: async ({ where }: { where: { id: string } }) => subs.get(where.id) ?? null,
      update: async ({ where, data }: { where: { id: string }; data: object }) => {
        const next = { ...subs.get(where.id)!, ...data };
        subs.set(where.id, next);
        return next;
      },
      updateMany: async ({ where, data }: { where: { id: string; status: string }; data: object }) => {
        const sub = subs.get(where.id);
        if (!sub || sub.status !== where.status) return { count: 0 };
        subs.set(where.id, { ...sub, ...data });
        return { count: 1 };
      },
    },
    // Not a real rollback, but the tests only check committed outcomes.
    $transaction: async <T>(fn: (tx: unknown) => Promise<T>) => fn(fake),
    $disconnect: async () => {},
  };
  return fake;
}
