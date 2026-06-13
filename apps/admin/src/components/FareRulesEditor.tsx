'use client';

import { useState } from 'react';

import type { Database } from '@openride/db/types';

import { getSupabaseBrowser } from '@/lib/supabase-browser';

type VehicleType = Database['public']['Enums']['vehicle_type'];

export interface FareRule {
  id: string;
  name: string;
  vehicle_type: VehicleType;
  base_cents: number;
  per_km_cents: number;
  per_min_cents: number;
  minimum_cents: number;
  is_active: boolean;
}

const FIELDS: { key: keyof FareRule; label: string }[] = [
  { key: 'base_cents', label: 'Base' },
  { key: 'per_km_cents', label: 'Per km' },
  { key: 'per_min_cents', label: 'Per min' },
  { key: 'minimum_cents', label: 'Minimum' },
];

export function FareRulesEditor({ initial }: { initial: FareRule[] }) {
  const [rules, setRules] = useState<FareRule[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const supabase = getSupabaseBrowser();

  function edit(id: string, key: keyof FareRule, cents: number) {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [key]: cents } : r)));
  }

  async function save(rule: FareRule) {
    setBusy(rule.id);
    try {
      const { error } = await supabase
        .from('fare_rules')
        .update({
          base_cents: rule.base_cents,
          per_km_cents: rule.per_km_cents,
          per_min_cents: rule.per_min_cents,
          minimum_cents: rule.minimum_cents,
        })
        .eq('id', rule.id);
      if (error) throw error;
    } catch (e) {
      alert(`Save failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  async function activate(rule: FareRule) {
    setBusy(rule.id);
    try {
      // Only one active rule per vehicle type (enforced by a partial unique
      // index), so deactivate the current active one first.
      await supabase
        .from('fare_rules')
        .update({ is_active: false })
        .eq('vehicle_type', rule.vehicle_type)
        .eq('is_active', true);
      const { error } = await supabase.from('fare_rules').update({ is_active: true }).eq('id', rule.id);
      if (error) throw error;
      setRules((rs) =>
        rs.map((r) =>
          r.vehicle_type === rule.vehicle_type ? { ...r, is_active: r.id === rule.id } : r,
        ),
      );
    } catch (e) {
      alert(`Activate failed: ${(e as Error).message}`);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="space-y-3">
      {rules.map((r) => (
        <div key={r.id} className="bg-white border rounded-lg p-4">
          <div className="flex justify-between items-center mb-3">
            <div>
              <span className="font-medium">{r.name}</span>
              <span className="text-gray-500 text-sm"> · {r.vehicle_type}</span>
              {r.is_active ? (
                <span className="ml-2 text-xs bg-green-100 text-green-800 rounded px-2 py-0.5">active</span>
              ) : null}
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy === r.id}
                onClick={() => save(r)}
                className="text-sm border rounded px-3 py-1 disabled:opacity-60"
              >
                Save rates
              </button>
              {!r.is_active ? (
                <button
                  type="button"
                  disabled={busy === r.id}
                  onClick={() => activate(r)}
                  className="text-sm bg-brand text-white rounded px-3 py-1 disabled:opacity-60"
                >
                  Activate
                </button>
              ) : null}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {FIELDS.map((f) => (
              <label key={String(f.key)} className="text-sm">
                <span className="block text-gray-500 mb-1">{f.label} ($)</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={((r[f.key] as number) / 100).toFixed(2)}
                  onChange={(e) =>
                    edit(r.id, f.key, Math.round(parseFloat(e.target.value || '0') * 100))
                  }
                  className="w-full border rounded px-2 py-1"
                />
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
