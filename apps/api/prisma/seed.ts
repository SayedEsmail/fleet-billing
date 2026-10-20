/**
 * Seeds fully synthetic demo data. Every name, plate and amount is invented.
 *
 * With SUPABASE_SECRET_KEY + DEMO_PASSWORD set, it also creates (or reuses)
 * two Supabase Auth users so the demo can be logged into:
 *   operator.demo@example.com (OPERATOR) and parent.demo@example.com (PARENT).
 * Without them (e.g. plain docker Postgres) only database rows are created.
 *
 * Re-running is safe: it clears the demo tables first.
 */
import { randomUUID } from 'node:crypto';
import { config } from 'dotenv';
import { PrismaPg } from '@prisma/adapter-pg';
import { createClient } from '@supabase/supabase-js';
import { PrismaClient, type BillingPeriod, type SubscriptionStatus } from '../src/generated/prisma/client.js';
import { addMonthsUtc, periodEnd, quote } from '../src/pricing/pricing.js';

config({ path: ['.env.local', '.env', '../../.env.local', '../../.env'], quiet: true });

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL! }),
});

// Deterministic PRNG so every seed produces the same dataset.
let state = 20261020;
function rand() {
  state = (state * 1664525 + 1013904223) % 2 ** 32;
  return state / 2 ** 32;
}
const pick = <T>(items: readonly T[]) => items[Math.floor(rand() * items.length)];

const FIRST_NAMES = ['Lina', 'Omar', 'Yara', 'Karim', 'Nour', 'Adam', 'Salma', 'Ziad', 'Hana', 'Yusuf', 'Mira', 'Tarek', 'Laila', 'Sami'];
const LAST_NAMES = ['Haddad', 'Mansour', 'Khalil', 'Nasser', 'Saleh', 'Farid', 'Rahman', 'Aziz', 'Habib', 'Qasim'];

const BUSES = [
  { plateNumber: 'FB-101', capacity: 24, driverName: 'Rami Nasser' },
  { plateNumber: 'FB-102', capacity: 24, driverName: 'Huda Saleh' },
  { plateNumber: 'FB-201', capacity: 32, driverName: 'Fadi Aziz' },
  { plateNumber: 'FB-202', capacity: 32, driverName: 'Samir Habib' },
  { plateNumber: 'FB-301', capacity: 14, driverName: 'Dina Farid', active: false },
];

const TRIPS = [
  { name: 'North Hills', direction: 'MORNING', departureTime: '06:50', bus: 'FB-101' },
  { name: 'North Hills', direction: 'AFTERNOON', departureTime: '14:30', bus: 'FB-101' },
  { name: 'Riverside', direction: 'MORNING', departureTime: '07:05', bus: 'FB-102' },
  { name: 'Riverside', direction: 'AFTERNOON', departureTime: '14:40', bus: 'FB-102' },
  { name: 'Old Town', direction: 'MORNING', departureTime: '06:40', bus: 'FB-201' },
  { name: 'Old Town', direction: 'AFTERNOON', departureTime: '14:45', bus: 'FB-201' },
  { name: 'Lakeside', direction: 'MORNING', departureTime: '07:10', bus: 'FB-202' },
] as const;

async function ensureAuthUser(email: string, fullName: string): Promise<string | null> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const password = process.env.DEMO_PASSWORD;
  if (!url || !secret || !password) return null;

  const admin = createClient(url, secret, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin;
  const { data: list, error: listError } = await admin.listUsers({ perPage: 1000 });
  if (listError) throw listError;
  const existing = list.users.find((u) => u.email === email);
  if (existing) {
    await admin.updateUserById(existing.id, { password });
    return existing.id;
  }
  const { data, error } = await admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });
  if (error) throw error;
  return data.user.id;
}

async function main() {
  await prisma.$transaction([
    prisma.stripeEvent.deleteMany(),
    prisma.subscription.deleteMany(),
    prisma.child.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.bus.deleteMany(),
    prisma.profile.deleteMany(),
  ]);

  const operatorAuthId = await ensureAuthUser('operator.demo@example.com', 'Demo Operator');
  const parentAuthId = await ensureAuthUser('parent.demo@example.com', 'Demo Parent');
  const authUsers = operatorAuthId ? 'with Supabase Auth users' : 'database rows only';
  const operatorId = operatorAuthId ?? randomUUID();
  const demoParentId = parentAuthId ?? randomUUID();

  await prisma.profile.createMany({
    data: [
      { id: operatorId, email: 'operator.demo@example.com', fullName: 'Demo Operator', role: 'OPERATOR' },
      { id: demoParentId, email: 'parent.demo@example.com', fullName: 'Demo Parent', role: 'PARENT' },
    ],
  });

  const buses = new Map<string, { id: string; capacity: number }>();
  for (const bus of BUSES) {
    const row = await prisma.bus.create({ data: bus });
    buses.set(bus.plateNumber, row);
  }
  const trips = [];
  for (const { bus, ...trip } of TRIPS) {
    trips.push(await prisma.trip.create({ data: { ...trip, busId: buses.get(bus)!.id } }));
  }

  // The demo parent has two children and no subscription yet, so the checkout flow can be tried.
  await prisma.child.createMany({
    data: [
      { parentId: demoParentId, name: 'Lina Demo', grade: 3 },
      { parentId: demoParentId, name: 'Omar Demo', grade: 6 },
    ],
  });

  // Synthetic parents (no login) with a mix of subscription states for the operator dashboard.
  const now = new Date();
  let subscriptions = 0;
  for (let i = 0; i < 18; i++) {
    const lastName = pick(LAST_NAMES);
    const parent = await prisma.profile.create({
      data: {
        id: randomUUID(),
        email: `parent${i + 1}@example.com`,
        fullName: `${pick(FIRST_NAMES)} ${lastName}`,
        role: 'PARENT',
      },
    });
    const childCount = 1 + Math.floor(rand() * 3);
    const children = [];
    for (let c = 0; c < childCount; c++) {
      children.push(
        await prisma.child.create({
          data: { parentId: parent.id, name: `${pick(FIRST_NAMES)} ${lastName}`, grade: 1 + Math.floor(rand() * 12) },
        }),
      );
    }

    const period: BillingPeriod = rand() < 0.6 ? 'MONTHLY' : 'TERM';
    const roll = rand();
    const status: SubscriptionStatus = roll < 0.7 ? 'ACTIVE' : roll < 0.85 ? 'PENDING' : 'EXPIRED';
    const daysAgo = Math.floor(rand() * 25);
    const start = status === 'EXPIRED' ? addMonthsUtc(now, -5) : new Date(now.getTime() - daysAgo * 86_400_000);
    const { totalCents } = quote(period, childCount);

    await prisma.subscription.create({
      data: {
        parentId: parent.id,
        tripId: pick(trips).id,
        period,
        childrenCount: childCount,
        amountCents: totalCents,
        status,
        children: { connect: children.map((c) => ({ id: c.id })) },
        currentPeriodStart: status === 'PENDING' ? null : start,
        currentPeriodEnd: status === 'PENDING' ? null : periodEnd(start, period),
      },
    });
    subscriptions++;
  }

  console.log(`Seeded ${BUSES.length} buses, ${trips.length} trips, ${subscriptions} subscriptions (${authUsers}).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
