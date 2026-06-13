import Link from 'next/link';

import { DriverStatusControl } from '@/components/DriverStatusControl';
import { getSupabaseServer } from '@/lib/supabase-server';

export default async function DriverDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await getSupabaseServer();

  const [{ data: profile }, { data: user }, { data: docs }, { data: vehicles }] = await Promise.all([
    supabase.from('driver_profiles').select('*').eq('user_id', id).maybeSingle(),
    supabase.from('users').select('display_name, phone, email').eq('id', id).maybeSingle(),
    supabase
      .from('driver_documents')
      .select('doc_type, status, expires_on')
      .eq('driver_id', id)
      .order('doc_type'),
    supabase.from('vehicles').select('id, rego, make, model, status').eq('default_driver_id', id),
  ]);

  if (!profile) {
    return (
      <div>
        <BackLink />
        <p className="text-red-600">Driver not found.</p>
      </div>
    );
  }

  const p = profile as Record<string, unknown>;
  const u = user as { display_name?: string; phone?: string; email?: string } | null;

  return (
    <div className="max-w-3xl">
      <BackLink />
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-2xl font-semibold">{u?.display_name ?? id.slice(0, 8)}</h1>
          <p className="text-gray-500 text-sm">
            {u?.phone ?? '—'} · status <span className="font-medium">{String(p.status)}</span>
          </p>
        </div>
        <DriverStatusControl driverId={id} status={String(p.status)} />
      </div>

      <Section title="Authorisation">
        <Field label="Licence" value={`${p.licence_number ?? '—'} (exp ${p.licence_expiry ?? '—'})`} />
        <Field label="Authority" value={`${p.authority_number ?? '—'} (exp ${p.authority_expiry ?? '—'})`} />
        <Field label="Stripe account" value={String(p.stripe_account_status ?? 'not connected')} />
      </Section>

      <Section title="Documents">
        {(docs ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No documents uploaded.</p>
        ) : (
          <table className="min-w-full text-sm">
            <thead className="text-left text-gray-500">
              <tr>
                <th className="py-1 pr-4">Type</th>
                <th className="py-1 pr-4">Status</th>
                <th className="py-1">Expires</th>
              </tr>
            </thead>
            <tbody>
              {(docs as { doc_type: string; status: string; expires_on: string | null }[]).map((d, i) => (
                <tr key={i} className="border-t">
                  <td className="py-1 pr-4">{d.doc_type}</td>
                  <td className="py-1 pr-4">{d.status}</td>
                  <td className="py-1">{d.expires_on ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Vehicles">
        {(vehicles ?? []).length === 0 ? (
          <p className="text-sm text-gray-500">No vehicles assigned.</p>
        ) : (
          (vehicles as { id: string; rego: string; make: string; model: string; status: string }[]).map((v) => (
            <div key={v.id} className="text-sm">
              {v.rego} — {v.make} {v.model} ({v.status})
            </div>
          ))
        )}
      </Section>
    </div>
  );
}

function BackLink() {
  return (
    <Link href="/drivers" className="text-sm text-brand hover:underline">
      ← Drivers
    </Link>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border rounded-lg p-4 mb-4">
      <h2 className="font-semibold mb-2">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex text-sm py-0.5">
      <span className="w-40 text-gray-500">{label}</span>
      <span>{value}</span>
    </div>
  );
}
