// Response shapes of the NestJS API (kept by hand; the API is small).

export type Role = 'OPERATOR' | 'PARENT';
export type BillingPeriod = 'MONTHLY' | 'TERM';
export type SubscriptionStatus = 'PENDING' | 'ACTIVE' | 'EXPIRED' | 'CANCELED';
export type TripDirection = 'MORNING' | 'AFTERNOON';

export interface Me {
  id: string;
  email: string;
  role: Role;
}

export interface Bus {
  id: string;
  plateNumber: string;
  capacity: number;
  driverName: string;
  active: boolean;
  _count?: { trips: number };
}

export interface Trip {
  id: string;
  name: string;
  direction: TripDirection;
  departureTime: string;
  busId: string;
  bus?: { id: string; plateNumber: string; capacity: number };
}

export interface Child {
  id: string;
  name: string;
  grade: number;
}

export interface Subscription {
  id: string;
  status: SubscriptionStatus;
  period: BillingPeriod;
  childrenCount: number;
  amountCents: number;
  currency: string;
  currentPeriodStart: string | null;
  currentPeriodEnd: string | null;
  createdAt: string;
  parent?: { fullName: string; email: string };
  trip?: { name: string; direction: TripDirection; departureTime?: string } | null;
}

export interface Stats {
  activeBuses: number;
  subscriptions: { active: number; pending: number; expired: number };
  mrrCents: number;
  ridersActive: number;
  tripUtilization: {
    tripId: string;
    name: string;
    direction: TripDirection;
    departureTime: string;
    plateNumber: string;
    capacity: number;
    seatsTaken: number;
    utilization: number;
  }[];
}

export interface Plans {
  currency: string;
  maxChildren: number;
  siblingDiscounts: { position: number; percent: number }[];
  plans: { period: BillingPeriod; months: number; unitAmountCents: number }[];
}
