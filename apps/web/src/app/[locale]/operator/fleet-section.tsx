import { apiFetch } from '@/lib/api';
import type { Bus, Trip } from '@/lib/types';
import { FleetManager } from './fleet-manager';

/** Server fetches the initial lists; the interactive editor is a client component. */
export async function FleetSection() {
  const [buses, trips] = await Promise.all([apiFetch<Bus[]>('/buses'), apiFetch<Trip[]>('/trips')]);
  return <FleetManager buses={buses} trips={trips} />;
}
