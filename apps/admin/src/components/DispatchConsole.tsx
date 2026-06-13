'use client';

import { formatMoney } from '@openride/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { getApi } from '@/lib/api-browser';
import { getSupabaseBrowser } from '@/lib/supabase-browser';

interface TripRow {
  id: string;
  status: string;
  pickup_address: string;
  dropoff_address: string;
  rider_id: string;
  driver_id: string | null;
  estimated_fare_cents: number | null;
  requested_at: string;
}

interface OnlineDriver {
  driver_id: string;
  vehicle_id: string | null;
  name: string;
  rego: string | null;
  lastSeen: string | null;
}

const QUEUE_STATUSES = [
  'requested',
  'requires_manual_dispatch',
  'assigned',
  'driver_en_route',
  'arrived_at_pickup',
  'in_progress',
] as const;
const ASSIGNABLE = new Set(['requested', 'requires_manual_dispatch']);

const STATUS_STYLE: Record<string, string> = {
  requested: 'bg-blue-100 text-blue-800',
  requires_manual_dispatch: 'bg-red-100 text-red-800',
  assigned: 'bg-amber-100 text-amber-800',
  driver_en_route: 'bg-amber-100 text-amber-800',
  arrived_at_pickup: 'bg-amber-100 text-amber-800',
  in_progress: 'bg-green-100 text-green-800',
};

export function DispatchConsole() {
  const supabase = useMemo(() => getSupabaseBrowser(), []);
  const [trips, setTrips] = useState<TripRow[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [drivers, setDrivers] = useState<OnlineDriver[]>([]);
  const [busyTrip, setBusyTrip] = useState<string | null>(null);
  const reloadTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(async () => {
    const sinceIso = new Date(Date.now() - 60_000).toISOString();
    const [tripRes, statusRes] = await Promise.all([
      supabase
        .from('trips')
        .select('id, status, pickup_address, dropoff_address, rider_id, driver_id, estimated_fare_cents, requested_at')
        .in('status', QUEUE_STATUSES)
        .order('requested_at', { ascending: true }),
      supabase
        .from('driver_status')
        .select('driver_id, vehicle_id')
        .is('ended_at', null)
        .neq('status', 'offline'),
    ]);

    const tripRows = (tripRes.data as TripRow[]) ?? [];
    setTrips(tripRows);

    const statusRows = (statusRes.data as { driver_id: string; vehicle_id: string | null }[]) ?? [];
    const driverIds = statusRows.map((s) => s.driver_id);
    const riderIds = tripRows.map((t) => t.rider_id);
    const tripDriverIds = tripRows.map((t) => t.driver_id).filter((x): x is string => Boolean(x));
    const vehicleIds = statusRows.map((s) => s.vehicle_id).filter((x): x is string => Boolean(x));

    const userIds = Array.from(new Set([...driverIds, ...riderIds, ...tripDriverIds]));
    const [usersRes, vehRes, locRes] = await Promise.all([
      userIds.length
        ? supabase.from('users').select('id, display_name').in('id', userIds)
        : Promise.resolve({ data: [] }),
      vehicleIds.length
        ? supabase.from('vehicles').select('id, rego').in('id', vehicleIds)
        : Promise.resolve({ data: [] }),
      driverIds.length
        ? supabase.from('driver_location_latest').select('driver_id, recorded_at').in('driver_id', driverIds)
        : Promise.resolve({ data: [] }),
    ]);

    const nameMap: Record<string, string> = {};
    for (const u of (usersRes.data as { id: string; display_name: string | null }[]) ?? []) {
      nameMap[u.id] = u.display_name ?? u.id.slice(0, 8);
    }
    setNames(nameMap);

    const regoMap: Record<string, string> = {};
    for (const v of (vehRes.data as { id: string; rego: string }[]) ?? []) regoMap[v.id] = v.rego;
    const seenMap: Record<string, string> = {};
    for (const l of (locRes.data as { driver_id: string; recorded_at: string }[]) ?? []) {
      seenMap[l.driver_id] = l.recorded_at;
    }

    setDrivers(
      statusRows.map((s) => ({
        driver_id: s.driver_id,
        vehicle_id: s.vehicle_id,
        name: nameMap[s.driver_id] ?? s.driver_id.slice(0, 8),
        rego: s.vehicle_id ? (regoMap[s.vehicle_id] ?? null) : null,
        lastSeen: seenMap[s.driver_id] ?? null,
      })),
    );
  }, [supabase]);

  // Initial load + realtime: reload (debounced) on any relevant change.
  useEffect(() => {
    // Async load on mount — setState happens post-await, not synchronously.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
    const scheduleReload = () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      reloadTimer.current = setTimeout(() => void load(), 400);
    };
    const channel = supabase.channel('admin:dispatch');
    for (const table of ['trips', 'driver_status', 'driver_location_latest', 'trip_offers']) {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, scheduleReload);
    }
    channel.subscribe();
    return () => {
      if (reloadTimer.current) clearTimeout(reloadTimer.current);
      void supabase.removeChannel(channel);
    };
  }, [supabase, load]);

  const assign = useCallback(
    async (tripId: string, driverId: string) => {
      setBusyTrip(tripId);
      try {
        await getApi().manualAssign(tripId, driverId, 'manual dispatch from ops console');
        await load();
      } catch (e) {
        alert(`Assign failed: ${(e as Error).message}`);
      } finally {
        setBusyTrip(null);
      }
    },
    [load],
  );

  return (
    <div className="grid grid-cols-3 gap-6">
      <div className="col-span-2">
        <h2 className="font-semibold mb-3">Booking queue ({trips.length})</h2>
        {trips.length === 0 ? (
          <p className="text-sm text-gray-500">No active trips.</p>
        ) : (
          <div className="space-y-2">
            {trips.map((t) => (
              <div key={t.id} className="bg-white border rounded-lg p-3 text-sm">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLE[t.status] ?? 'bg-gray-100 text-gray-700'}`}>
                      {t.status.replace(/_/g, ' ')}
                    </span>
                    <div className="mt-1 font-medium">
                      {t.pickup_address} → {t.dropoff_address}
                    </div>
                    <div className="text-gray-500">
                      {names[t.rider_id] ?? 'rider'}
                      {t.driver_id ? ` · driver ${names[t.driver_id] ?? t.driver_id.slice(0, 8)}` : ''}
                      {t.estimated_fare_cents != null ? ` · ${formatMoney(t.estimated_fare_cents)}` : ''}
                      {` · ${ago(t.requested_at)}`}
                    </div>
                  </div>
                  {ASSIGNABLE.has(t.status) ? (
                    <AssignControl
                      drivers={drivers}
                      disabled={busyTrip === t.id}
                      onAssign={(driverId) => assign(t.id, driverId)}
                    />
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h2 className="font-semibold mb-3">Online drivers ({drivers.length})</h2>
        {drivers.length === 0 ? (
          <p className="text-sm text-gray-500">No drivers online.</p>
        ) : (
          <div className="space-y-2">
            {drivers.map((d) => (
              <div key={d.driver_id} className="bg-white border rounded-lg p-3 text-sm">
                <div className="font-medium">{d.name}</div>
                <div className="text-gray-500">
                  {d.rego ?? 'no vehicle'} · {d.lastSeen ? `seen ${ago(d.lastSeen)}` : 'no location'}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function AssignControl({
  drivers,
  disabled,
  onAssign,
}: {
  drivers: OnlineDriver[];
  disabled: boolean;
  onAssign: (driverId: string) => void;
}) {
  const [value, setValue] = useState('');
  if (drivers.length === 0) return <span className="text-xs text-gray-400">no drivers</span>;
  return (
    <select
      className="border rounded px-2 py-1 text-xs"
      value={value}
      disabled={disabled}
      onChange={(e) => {
        const id = e.target.value;
        setValue('');
        if (id) onAssign(id);
      }}
    >
      <option value="">{disabled ? 'Assigning…' : 'Assign…'}</option>
      {drivers.map((d) => (
        <option key={d.driver_id} value={d.driver_id}>
          {d.name} ({d.rego ?? '—'})
        </option>
      ))}
    </select>
  );
}

function ago(iso: string): string {
  const s = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return `${Math.round(s / 3600)}h ago`;
}
