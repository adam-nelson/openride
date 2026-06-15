import { formatDurationS } from '@openride/ui';

import { getSupabaseServer } from '@/lib/supabase-server';

function inDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

export default async function CompliancePage() {
  const supabase = await getSupabaseServer();
  const soon = inDays(30);
  const today = inDays(0);

  const [driverDocs, vehicleDocs, lockedDrivers, openSessions, inspections, overrides, cap] =
    await Promise.all([
      supabase
        .from('driver_documents')
        .select('driver_id, doc_type, status, expires_on')
        .not('expires_on', 'is', null)
        .lte('expires_on', soon)
        .order('expires_on'),
      supabase
        .from('vehicle_documents')
        .select('vehicle_id, doc_type, status, expires_on')
        .not('expires_on', 'is', null)
        .lte('expires_on', soon)
        .order('expires_on'),
      supabase
        .from('driver_profiles')
        .select('user_id, fatigue_locked_until')
        .gt('fatigue_locked_until', new Date().toISOString()),
      supabase
        .from('fatigue_sessions')
        .select('driver_id, drive_time_s, started_at')
        .is('ended_at', null),
      supabase
        .from('vehicle_inspections')
        .select('vehicle_id, inspection_type, result, next_due_on')
        .not('next_due_on', 'is', null)
        .lte('next_due_on', soon)
        .order('next_due_on'),
      supabase
        .from('manual_overrides')
        .select('override_kind, reason, created_at, actor_id')
        .order('created_at', { ascending: false })
        .limit(15),
      supabase.from('app_config').select('value').eq('key', 'fatigue.max_drive_time_s').maybeSingle(),
    ]);

  // Resolve names / regos.
  const driverIds = new Set<string>();
  (driverDocs.data ?? []).forEach((d: any) => driverIds.add(d.driver_id));
  (lockedDrivers.data ?? []).forEach((d: any) => driverIds.add(d.user_id));
  (openSessions.data ?? []).forEach((s: any) => driverIds.add(s.driver_id));
  (overrides.data ?? []).forEach((o: any) => o.actor_id && driverIds.add(o.actor_id));
  const vehicleIds = new Set<string>();
  (vehicleDocs.data ?? []).forEach((d: any) => vehicleIds.add(d.vehicle_id));
  (inspections.data ?? []).forEach((i: any) => vehicleIds.add(i.vehicle_id));

  const [{ data: users }, { data: vehicles }] = await Promise.all([
    driverIds.size
      ? supabase.from('users').select('id, display_name').in('id', [...driverIds])
      : Promise.resolve({ data: [] }),
    vehicleIds.size
      ? supabase.from('vehicles').select('id, rego').in('id', [...vehicleIds])
      : Promise.resolve({ data: [] }),
  ]);
  const name = (id: string) =>
    (users as any[])?.find((u) => u.id === id)?.display_name ?? id.slice(0, 8);
  const rego = (id: string) => (vehicles as any[])?.find((v) => v.id === id)?.rego ?? id.slice(0, 8);

  const capS = Number((cap.data as any)?.value ?? 43200);
  const expired = (d: string | null) => Boolean(d && d < today);

  return (
    <div className="space-y-8 max-w-4xl">
      <h1 className="text-2xl font-semibold">Compliance</h1>

      <Section title={`Expiring / expired documents`}>
        <Table head={['Subject', 'Document', 'Status', 'Expires']}>
          {[
            ...(driverDocs.data ?? []).map((d: any) => ({
              subject: name(d.driver_id),
              doc: `driver · ${d.doc_type}`,
              status: d.status,
              exp: d.expires_on,
            })),
            ...(vehicleDocs.data ?? []).map((d: any) => ({
              subject: rego(d.vehicle_id),
              doc: `vehicle · ${d.doc_type}`,
              status: d.status,
              exp: d.expires_on,
            })),
          ]
            .sort((a, b) => (a.exp < b.exp ? -1 : 1))
            .map((r, i) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5">{r.subject}</td>
                <td className="px-3 py-1.5">{r.doc}</td>
                <td className="px-3 py-1.5">{r.status}</td>
                <td className={`px-3 py-1.5 ${expired(r.exp) ? 'text-red-600 font-medium' : ''}`}>
                  {r.exp}
                  {expired(r.exp) ? ' (expired)' : ''}
                </td>
              </tr>
            ))}
        </Table>
      </Section>

      <Section title="Fatigue">
        {(lockedDrivers.data ?? []).length === 0 && (openSessions.data ?? []).length === 0 ? (
          <Empty>No active shifts.</Empty>
        ) : (
          <Table head={['Driver', 'Drive time (rolling)', 'State']}>
            {(openSessions.data ?? []).map((s: any, i: number) => {
              const locked = (lockedDrivers.data ?? []).some((l: any) => l.user_id === s.driver_id);
              const pct = Math.round((s.drive_time_s / capS) * 100);
              return (
                <tr key={i} className="border-t">
                  <td className="px-3 py-1.5">{name(s.driver_id)}</td>
                  <td className="px-3 py-1.5">
                    {formatDurationS(s.drive_time_s)} / {formatDurationS(capS)} ({pct}%)
                  </td>
                  <td className={`px-3 py-1.5 ${locked ? 'text-red-600 font-medium' : pct >= 80 ? 'text-amber-600' : ''}`}>
                    {locked ? 'locked out' : pct >= 80 ? 'near cap' : 'ok'}
                  </td>
                </tr>
              );
            })}
            {(lockedDrivers.data ?? [])
              .filter((l: any) => !(openSessions.data ?? []).some((s: any) => s.driver_id === l.user_id))
              .map((l: any, i: number) => (
                <tr key={`l${i}`} className="border-t">
                  <td className="px-3 py-1.5">{name(l.user_id)}</td>
                  <td className="px-3 py-1.5 text-gray-500">—</td>
                  <td className="px-3 py-1.5 text-red-600 font-medium">
                    locked until {new Date(l.fatigue_locked_until).toLocaleString()}
                  </td>
                </tr>
              ))}
          </Table>
        )}
      </Section>

      <Section title="Inspections due">
        {(inspections.data ?? []).length === 0 ? (
          <Empty>Nothing due in the next 30 days.</Empty>
        ) : (
          <Table head={['Vehicle', 'Type', 'Last result', 'Due']}>
            {(inspections.data ?? []).map((i: any, idx: number) => (
              <tr key={idx} className="border-t">
                <td className="px-3 py-1.5">{rego(i.vehicle_id)}</td>
                <td className="px-3 py-1.5">{i.inspection_type}</td>
                <td className="px-3 py-1.5">{i.result}</td>
                <td className={`px-3 py-1.5 ${expired(i.next_due_on) ? 'text-red-600 font-medium' : ''}`}>
                  {i.next_due_on}
                </td>
              </tr>
            ))}
          </Table>
        )}
      </Section>

      <Section title="Recent manual overrides">
        {(overrides.data ?? []).length === 0 ? (
          <Empty>None.</Empty>
        ) : (
          <Table head={['When', 'Actor', 'Kind', 'Reason']}>
            {(overrides.data ?? []).map((o: any, i: number) => (
              <tr key={i} className="border-t">
                <td className="px-3 py-1.5 text-gray-500 whitespace-nowrap">
                  {new Date(o.created_at).toLocaleString()}
                </td>
                <td className="px-3 py-1.5">{o.actor_id ? name(o.actor_id) : '—'}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{o.override_kind}</td>
                <td className="px-3 py-1.5">{o.reason}</td>
              </tr>
            ))}
          </Table>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </section>
  );
}

function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  return (
    <table className="min-w-full bg-white border rounded-lg overflow-hidden text-sm">
      <thead className="bg-gray-50 text-left text-gray-500">
        <tr>
          {head.map((h) => (
            <th key={h} className="px-3 py-1.5 font-medium">
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>{children}</tbody>
    </table>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-gray-500">{children}</p>;
}
