'use client';

import { useTransition } from 'react';
import { useRouter } from '@/i18n/navigation';
import { createClient } from '@/lib/supabase/client';

export function SignOutButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      className="btn-ghost"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await createClient().auth.signOut();
          router.replace('/');
          router.refresh();
        })
      }
    >
      {label}
    </button>
  );
}
