'use client';

import { useTranslations } from 'next-intl';
import { useState, useTransition, type FormEvent } from 'react';
import { useRouter } from '@/i18n/navigation';
import { clientApi } from '@/lib/api-client';
import type { Bus, Trip, TripDirection } from '@/lib/types';

type Tab = 'buses' | 'trips';
type Editing = { kind: Tab; id: string | 'new' } | null;

/**
 * Client component: inline editing needs local state and instant feedback.
 * Mutations go straight to the API with the user's token, then
 * router.refresh() re-runs the Server Components so stats stay in sync.
 */
export function FleetManager({ buses, trips }: { buses: Bus[]; trips: Trip[] }) {
  const t = useTranslations('operator.fleet');
  const tc = useTranslations('common');
  const td = useTranslations('enums.direction');
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('buses');
  const [editing, setEditing] = useState<Editing>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const run = (fn: () => Promise<unknown>) =>
    startTransition(async () => {
      setError(null);
      try {
        await fn();
        setEditing(null);
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    });

  const remove = (kind: Tab, id: string) => {
    if (confirm(tc('confirmDelete'))) run(() => clientApi(`/${kind}/${id}`, { method: 'DELETE' }));
  };

  const saveBus = (e: FormEvent<HTMLFormElement>, id: string | 'new') => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      plateNumber: String(f.get('plateNumber')),
      capacity: Number(f.get('capacity')),
      driverName: String(f.get('driverName')),
      active: f.get('active') === 'on',
    };
    run(() =>
      clientApi(id === 'new' ? '/buses' : `/buses/${id}`, {
        method: id === 'new' ? 'POST' : 'PATCH',
        body: JSON.stringify(body),
      }),
    );
  };

  const saveTrip = (e: FormEvent<HTMLFormElement>, id: string | 'new') => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const body = {
      name: String(f.get('name')),
      direction: String(f.get('direction')) as TripDirection,
      departureTime: String(f.get('departureTime')),
      busId: String(f.get('busId')),
    };
    run(() =>
      clientApi(id === 'new' ? '/trips' : `/trips/${id}`, {
        method: id === 'new' ? 'POST' : 'PATCH',
        body: JSON.stringify(body),
      }),
    );
  };

  const isEditing = (kind: Tab, id: string) => editing?.kind === kind && editing.id === id;
  const actions = (kind: Tab, id: string) => (
    <td className="td whitespace-nowrap text-end">
      <button type="button" className="btn-ghost px-2 py-1" onClick={() => setEditing({ kind, id })} disabled={pending}>
        {tc('edit')}
      </button>
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-rose-600"
        onClick={() => remove(kind, id)}
        disabled={pending}
      >
        {tc('delete')}
      </button>
    </td>
  );
  const busForm = (bus?: Bus) => {
    const id = bus?.id ?? 'new';
    const formId = `bus-${id}`;
    return (
      <tr key={formId} className="bg-brand-50">
        <td className="td">
          <form id={formId} onSubmit={(e) => saveBus(e, id)} />
          <input form={formId} name="plateNumber" defaultValue={bus?.plateNumber} required className="input ltr-nums" aria-label={t('plate')} />
        </td>
        <td className="td">
          <input form={formId} name="capacity" type="number" min={4} max={80} defaultValue={bus?.capacity ?? 24} required className="input" aria-label={t('capacity')} />
        </td>
        <td className="td">
          <input form={formId} name="driverName" defaultValue={bus?.driverName} required minLength={2} className="input" aria-label={t('driver')} />
        </td>
        <td className="td">
          <input form={formId} name="active" type="checkbox" defaultChecked={bus?.active ?? true} className="size-4 accent-brand-500" aria-label={t('active')} />
        </td>
        <td className="td" />
        {formButtonsFor(formId)}
      </tr>
    );
  };

  const tripForm = (trip?: Trip) => {
    const id = trip?.id ?? 'new';
    const formId = `trip-${id}`;
    return (
      <tr key={formId} className="bg-brand-50">
        <td className="td">
          <form id={formId} onSubmit={(e) => saveTrip(e, id)} />
          <input form={formId} name="name" defaultValue={trip?.name} required minLength={2} className="input" aria-label={t('name')} />
        </td>
        <td className="td">
          <select form={formId} name="direction" defaultValue={trip?.direction ?? 'MORNING'} className="input" aria-label={t('direction')}>
            <option value="MORNING">{td('MORNING')}</option>
            <option value="AFTERNOON">{td('AFTERNOON')}</option>
          </select>
        </td>
        <td className="td">
          <input form={formId} name="departureTime" type="time" defaultValue={trip?.departureTime ?? '07:00'} required className="input" aria-label={t('departure')} />
        </td>
        <td className="td">
          <select form={formId} name="busId" defaultValue={trip?.busId ?? buses[0]?.id} required className="input" aria-label={t('bus')}>
            {buses.map((b) => (
              <option key={b.id} value={b.id}>
                {b.plateNumber}
              </option>
            ))}
          </select>
        </td>
        {formButtonsFor(formId)}
      </tr>
    );
  };

  // Rows can't contain <form>, so inputs attach to a hidden form via the `form` attribute.
  function formButtonsFor(formId: string) {
    return (
      <td className="td whitespace-nowrap text-end">
        <button type="submit" form={formId} className="btn-primary px-3 py-1" disabled={pending}>
          {tc('save')}
        </button>
        <button type="button" className="btn-ghost px-2 py-1" onClick={() => setEditing(null)}>
          {tc('cancel')}
        </button>
      </td>
    );
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-100 p-4">
        <div role="tablist" className="flex gap-1 rounded-lg bg-stone-100 p-1">
          {(['buses', 'trips'] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => {
                setTab(key);
                setEditing(null);
              }}
              className={`rounded-md px-3 py-1 text-sm ${tab === key ? 'bg-white shadow-sm' : 'text-stone-500'}`}
            >
              {t(key)}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="btn-brand"
          disabled={pending || editing?.id === 'new'}
          onClick={() => setEditing({ kind: tab, id: 'new' })}
        >
          + {tab === 'buses' ? t('newBus') : t('newTrip')}
        </button>
      </div>

      {error && (
        <p role="alert" className="border-b border-rose-100 bg-rose-50 px-4 py-2 text-sm text-rose-700">
          {error}
        </p>
      )}

      <div className="overflow-x-auto">
        {tab === 'buses' ? (
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="th">{t('plate')}</th>
                <th className="th">{t('capacity')}</th>
                <th className="th">{t('driver')}</th>
                <th className="th">{t('active')}</th>
                <th className="th">{t('trips')}</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {editing?.kind === 'buses' && editing.id === 'new' && busForm()}
              {buses.map((bus) =>
                isEditing('buses', bus.id) ? (
                  busForm(bus)
                ) : (
                  <tr key={bus.id}>
                    <td className="td font-medium">
                      <span className="ltr-nums">{bus.plateNumber}</span>
                    </td>
                    <td className="td">{bus.capacity}</td>
                    <td className="td">{bus.driverName}</td>
                    <td className="td">{bus.active ? t('yes') : t('no')}</td>
                    <td className="td">{bus._count?.trips ?? 0}</td>
                    {actions('buses', bus.id)}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        ) : (
          <table className="w-full">
            <thead className="bg-stone-50">
              <tr>
                <th className="th">{t('name')}</th>
                <th className="th">{t('direction')}</th>
                <th className="th">{t('departure')}</th>
                <th className="th">{t('bus')}</th>
                <th className="th" />
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {editing?.kind === 'trips' && editing.id === 'new' && tripForm()}
              {trips.map((trip) =>
                isEditing('trips', trip.id) ? (
                  tripForm(trip)
                ) : (
                  <tr key={trip.id}>
                    <td className="td font-medium">{trip.name}</td>
                    <td className="td">{td(trip.direction)}</td>
                    <td className="td">
                      <span className="ltr-nums">{trip.departureTime}</span>
                    </td>
                    <td className="td">
                      <span className="ltr-nums">{trip.bus?.plateNumber}</span>
                    </td>
                    {actions('trips', trip.id)}
                  </tr>
                ),
              )}
            </tbody>
          </table>
        )}
      </div>
    </section>
  );
}
