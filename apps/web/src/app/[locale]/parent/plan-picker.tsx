'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { useActionState, useEffect, useState } from 'react';
import type { BillingPeriod, Child, Plans, Trip } from '@/lib/types';
import { startCheckout, type CheckoutState } from './actions';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

interface Quote {
  subtotalCents: number;
  discountCents: number;
  totalCents: number;
}

/**
 * Client component for the live price preview. The preview comes from the
 * API's public /plans/quote, so the browser never re-implements pricing; the
 * submit goes through the startCheckout Server Action.
 */
export function PlanPicker({ plans, trips, kids }: { plans: Plans; trips: Trip[]; kids: Child[] }) {
  const t = useTranslations('parent.plan');
  const te = useTranslations('enums');
  const format = useFormatter();
  const [state, action, pending] = useActionState<CheckoutState, FormData>(startCheckout, {});
  const [period, setPeriod] = useState<BillingPeriod>('MONTHLY');
  const [selected, setSelected] = useState<string[]>(kids.map((k) => k.id));
  const [quote, setQuote] = useState<Quote | null>(null);

  const money = (cents: number) => format.number(cents / 100, { style: 'currency', currency: plans.currency.toUpperCase() });

  useEffect(() => {
    if (selected.length === 0) return;
    const ctrl = new AbortController();
    fetch(`${API_URL}/plans/quote?period=${period}&children=${selected.length}`, { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then(setQuote)
      .catch(() => {});
    return () => ctrl.abort();
  }, [period, selected.length]);

  const shownQuote = selected.length > 0 ? quote : null;
  const errorText = state.error === 'pickChild' ? t('pickChild') : state.error;

  return (
    <form action={action} className="space-y-5">
      <fieldset>
        <legend className="label">{t('period')}</legend>
        <div className="grid grid-cols-2 gap-3">
          {plans.plans.map((p) => (
            <label
              key={p.period}
              className={`cursor-pointer rounded-xl border p-3 transition ${
                period === p.period ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-100' : 'border-stone-200 hover:border-stone-300'
              }`}
            >
              <input
                type="radio"
                name="period"
                value={p.period}
                checked={period === p.period}
                onChange={() => setPeriod(p.period)}
                className="sr-only"
              />
              <span className="block font-medium">{te(`period.${p.period}`)}</span>
              <span className="text-sm text-stone-500">{t('perChild', { amount: money(p.unitAmountCents) })}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <div>
        <label htmlFor="tripId" className="label">
          {t('trip')}
        </label>
        <select id="tripId" name="tripId" required className="input">
          {trips.map((trip) => (
            <option key={trip.id} value={trip.id}>
              {trip.name} · {te(`direction.${trip.direction}`)} · {trip.departureTime}
            </option>
          ))}
        </select>
      </div>

      <fieldset>
        <legend className="label">{t('whichChildren')}</legend>
        <div className="flex flex-wrap gap-2">
          {kids.map((kid) => (
            <label key={kid.id} className="flex cursor-pointer items-center gap-2 rounded-lg border border-stone-200 px-3 py-2 text-sm">
              <input
                type="checkbox"
                name="childIds"
                value={kid.id}
                checked={selected.includes(kid.id)}
                onChange={(e) =>
                  setSelected((prev) => (e.target.checked ? [...prev, kid.id] : prev.filter((id) => id !== kid.id)))
                }
                className="size-4 accent-brand-500"
              />
              {kid.name}
            </label>
          ))}
        </div>
        <p className="mt-2 text-xs text-stone-500">{t('siblingNote')}</p>
      </fieldset>

      {shownQuote && (
        <dl className="space-y-1 rounded-xl bg-stone-50 p-4 text-sm" aria-live="polite">
          <div className="flex justify-between">
            <dt>{t('subtotal')}</dt>
            <dd>{money(shownQuote.subtotalCents)}</dd>
          </div>
          {shownQuote.discountCents > 0 && (
            <div className="flex justify-between text-emerald-700">
              <dt>{t('discount')}</dt>
              <dd>−{money(shownQuote.discountCents)}</dd>
            </div>
          )}
          <div className="flex justify-between border-t border-stone-200 pt-2 text-base font-semibold">
            <dt>{t('total')}</dt>
            <dd data-testid="quote-total">{money(shownQuote.totalCents)}</dd>
          </div>
        </dl>
      )}

      {errorText && (
        <p role="alert" className="text-sm text-rose-600">
          {errorText}
        </p>
      )}

      <button type="submit" className="btn-brand w-full py-3" disabled={pending || kids.length === 0 || selected.length === 0}>
        {pending ? t('redirecting') : t('pay')}
      </button>
    </form>
  );
}
