/**
 * Pricing rules for school-bus subscriptions. Pure functions, no I/O: the API
 * computes every amount here and Stripe only ever receives the result.
 *
 * All money is integer cents to avoid floating point drift.
 */

export type BillingPeriod = 'MONTHLY' | 'TERM';

export const CURRENCY = 'eur';
export const MAX_CHILDREN = 6;

export const PLANS: Record<BillingPeriod, { months: number; unitAmountCents: number }> = {
  MONTHLY: { months: 1, unitAmountCents: 8_900 },
  // A term is 4 months, priced at roughly 10% below 4 monthly payments.
  TERM: { months: 4, unitAmountCents: 32_000 },
};

/** Discount by child position (1-based): first child full price, second 10%, third and later 15%. */
export function siblingDiscountPercent(position: number): number {
  if (!Number.isInteger(position) || position < 1) {
    throw new RangeError(`Invalid child position: ${position}`);
  }
  if (position === 1) return 0;
  if (position === 2) return 10;
  return 15;
}

export interface QuoteLine {
  position: number;
  unitAmountCents: number;
  discountPercent: number;
  amountCents: number;
}

export interface Quote {
  period: BillingPeriod;
  currency: typeof CURRENCY;
  months: number;
  childrenCount: number;
  lines: QuoteLine[];
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

/** Takes `percentOff` percent off `valueCents`, rounding half-up, in integer arithmetic. */
export function applyPercentOff(valueCents: number, percentOff: number): number {
  return Math.floor((valueCents * (100 - percentOff) + 50) / 100);
}

export function quote(period: BillingPeriod, childrenCount: number): Quote {
  const plan = PLANS[period];
  if (!plan) throw new RangeError(`Unknown billing period: ${String(period)}`);
  if (!Number.isInteger(childrenCount) || childrenCount < 1 || childrenCount > MAX_CHILDREN) {
    throw new RangeError(`childrenCount must be an integer between 1 and ${MAX_CHILDREN}`);
  }

  const lines: QuoteLine[] = [];
  for (let position = 1; position <= childrenCount; position++) {
    const discountPercent = siblingDiscountPercent(position);
    lines.push({
      position,
      unitAmountCents: plan.unitAmountCents,
      discountPercent,
      amountCents: applyPercentOff(plan.unitAmountCents, discountPercent),
    });
  }

  const subtotalCents = plan.unitAmountCents * childrenCount;
  const totalCents = lines.reduce((sum, line) => sum + line.amountCents, 0);
  return {
    period,
    currency: CURRENCY,
    months: plan.months,
    childrenCount,
    lines,
    subtotalCents,
    discountCents: subtotalCents - totalCents,
    totalCents,
  };
}

/** Adds calendar months in UTC, clamping to the last day of the target month (Jan 31 + 1 → Feb 28/29). */
export function addMonthsUtc(date: Date, months: number): Date {
  const target = new Date(date.getTime());
  const day = target.getUTCDate();
  target.setUTCDate(1);
  target.setUTCMonth(target.getUTCMonth() + months);
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate();
  target.setUTCDate(Math.min(day, lastDay));
  return target;
}

export function periodEnd(start: Date, period: BillingPeriod): Date {
  return addMonthsUtc(start, PLANS[period].months);
}

/** Normalises an amount to a per-month figure (for MRR). */
export function monthlyEquivalentCents(totalCents: number, period: BillingPeriod): number {
  return Math.round(totalCents / PLANS[period].months);
}
