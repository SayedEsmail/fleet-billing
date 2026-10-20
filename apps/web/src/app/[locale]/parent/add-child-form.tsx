'use client';

import { useTranslations } from 'next-intl';
import { useRef, useState, useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { clientApi } from '@/lib/api-client';

export function AddChildForm() {
  const t = useTranslations('parent.children');
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        startTransition(async () => {
          setError(null);
          try {
            await clientApi('/children', {
              method: 'POST',
              body: JSON.stringify({ name: String(f.get('name')), grade: Number(f.get('grade')) }),
            });
            formRef.current?.reset();
            router.refresh();
          } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
          }
        });
      }}
    >
      <div className="min-w-32 flex-1">
        <label htmlFor="child-name" className="label">
          {t('name')}
        </label>
        <input id="child-name" name="name" required minLength={2} maxLength={60} className="input" />
      </div>
      <div className="w-20">
        <label htmlFor="child-grade" className="label">
          {t('grade')}
        </label>
        <input id="child-grade" name="grade" type="number" min={1} max={12} defaultValue={1} required className="input" />
      </div>
      <button type="submit" className="btn-primary" disabled={pending}>
        {t('add')}
      </button>
      {error && (
        <p role="alert" className="w-full text-sm text-rose-600">
          {error}
        </p>
      )}
    </form>
  );
}
