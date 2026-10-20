import { describe, expect, it } from 'vitest';
import {
  addMonthsUtc,
  applyPercentOff,
  MAX_CHILDREN,
  monthlyEquivalentCents,
  periodEnd,
  PLANS,
  quote,
  siblingDiscountPercent,
} from './pricing.js';

describe('siblingDiscountPercent', () => {
  it('charges the first child full price', () => {
    expect(siblingDiscountPercent(1)).toBe(0);
  });

  it('gives 10% to the second child and 15% from the third on', () => {
    expect(siblingDiscountPercent(2)).toBe(10);
    expect(siblingDiscountPercent(3)).toBe(15);
    expect(siblingDiscountPercent(6)).toBe(15);
  });

  it.each([0, -1, 1.5, Number.NaN])('rejects invalid position %s', (position) => {
    expect(() => siblingDiscountPercent(position)).toThrow(RangeError);
  });
});

describe('applyPercentOff', () => {
  it('rounds half-up to whole cents', () => {
    expect(applyPercentOff(8_905, 10)).toBe(8_015); // 8014.5 → 8015
    expect(applyPercentOff(8_903, 15)).toBe(7_568); // 7567.55 → 7568
    expect(applyPercentOff(8_901, 15)).toBe(7_566); // 7565.85 → 7566
    expect(applyPercentOff(1_001, 15)).toBe(851); // 850.85 → 851
    expect(applyPercentOff(1_003, 15)).toBe(853); // 852.55 → 853
  });

  it('is the identity at 0%', () => {
    expect(applyPercentOff(8_900, 0)).toBe(8_900);
  });
});

describe('quote', () => {
  it('prices one child on the monthly plan at the base rate', () => {
    const q = quote('MONTHLY', 1);
    expect(q.totalCents).toBe(8_900);
    expect(q.discountCents).toBe(0);
    expect(q.months).toBe(1);
    expect(q.currency).toBe('eur');
  });

  it('applies sibling discounts per child position', () => {
    const q = quote('MONTHLY', 3);
    expect(q.lines.map((l) => l.amountCents)).toEqual([8_900, 8_010, 7_565]);
    expect(q.subtotalCents).toBe(26_700);
    expect(q.totalCents).toBe(24_475);
    expect(q.discountCents).toBe(2_225);
  });

  it('prices the term plan below four monthly payments', () => {
    const term = quote('TERM', 1);
    expect(term.totalCents).toBe(32_000);
    expect(term.months).toBe(4);
    expect(term.totalCents).toBeLessThan(quote('MONTHLY', 1).totalCents * 4);
  });

  it('combines the term plan with sibling discounts', () => {
    // 32000 + 28800 (−10%) + 27200 (−15%)
    expect(quote('TERM', 3).totalCents).toBe(88_000);
  });

  it('keeps total = subtotal − discount for every plan and size', () => {
    for (const period of ['MONTHLY', 'TERM'] as const) {
      for (let n = 1; n <= MAX_CHILDREN; n++) {
        const q = quote(period, n);
        expect(q.subtotalCents - q.discountCents).toBe(q.totalCents);
        expect(q.lines).toHaveLength(n);
      }
    }
  });

  it.each([0, -2, 1.5, MAX_CHILDREN + 1])('rejects childrenCount %s', (n) => {
    expect(() => quote('MONTHLY', n)).toThrow(RangeError);
  });

  it('rejects unknown periods', () => {
    expect(() => quote('YEARLY' as never, 1)).toThrow(RangeError);
  });
});

describe('billing periods', () => {
  it('adds a calendar month', () => {
    const start = new Date('2026-10-20T08:00:00Z');
    expect(periodEnd(start, 'MONTHLY').toISOString()).toBe('2026-11-20T08:00:00.000Z');
  });

  it('adds four months for a term, across a year boundary', () => {
    const start = new Date('2026-09-01T00:00:00Z');
    expect(periodEnd(start, 'TERM').toISOString()).toBe('2027-01-01T00:00:00.000Z');
  });

  it('clamps to the end of shorter months, including leap years', () => {
    expect(addMonthsUtc(new Date('2026-01-31T00:00:00Z'), 1).toISOString()).toBe('2026-02-28T00:00:00.000Z');
    expect(addMonthsUtc(new Date('2028-01-31T00:00:00Z'), 1).toISOString()).toBe('2028-02-29T00:00:00.000Z');
    expect(addMonthsUtc(new Date('2026-10-31T00:00:00Z'), 4).toISOString()).toBe('2027-02-28T00:00:00.000Z');
  });

  it('does not mutate its input', () => {
    const start = new Date('2026-10-20T00:00:00Z');
    addMonthsUtc(start, 3);
    expect(start.toISOString()).toBe('2026-10-20T00:00:00.000Z');
  });

  it('normalises term revenue to a monthly figure', () => {
    expect(monthlyEquivalentCents(PLANS.TERM.unitAmountCents, 'TERM')).toBe(8_000);
    expect(monthlyEquivalentCents(8_900, 'MONTHLY')).toBe(8_900);
  });
});
