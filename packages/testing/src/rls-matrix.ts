/**
 * RLS test matrix. Each table × each role × each operation has an expected
 * outcome. The runner under `tests/rls-matrix.test.ts` (added in Phase 8)
 * authenticates as each demo user and checks every cell.
 *
 * Keep this file in sync with infra/supabase/migrations/*_rls.sql.
 */

export type Role = 'rider' | 'driver' | 'dispatcher' | 'admin' | 'operator_owner' | 'support' | 'anon';
export type Op = 'select' | 'insert' | 'update' | 'delete';
export type Outcome = 'allow' | 'deny' | 'own-only';

export interface RlsCell {
  table: string;
  role: Role;
  op: Op;
  outcome: Outcome;
}

const allRoles: Role[] = ['rider', 'driver', 'dispatcher', 'admin', 'operator_owner', 'support', 'anon'];

// Helper to expand a single rule across multiple ops.
const cells = (table: string, role: Role, ops: Op[], outcome: Outcome): RlsCell[] =>
  ops.map((op) => ({ table, role, op, outcome }));

export const rlsMatrix: RlsCell[] = [
  // trips
  ...cells('trips', 'rider', ['select'], 'own-only'),
  ...cells('trips', 'rider', ['insert', 'update', 'delete'], 'deny'),
  ...cells('trips', 'driver', ['select'], 'own-only'),
  ...cells('trips', 'driver', ['insert', 'delete'], 'deny'),
  ...cells('trips', 'dispatcher', ['select', 'insert', 'update'], 'allow'),
  ...cells('trips', 'admin', ['select', 'insert', 'update', 'delete'], 'allow'),
  ...cells('trips', 'anon', ['select', 'insert', 'update', 'delete'], 'deny'),

  // fare_rules
  ...cells('fare_rules', 'rider', ['select'], 'allow'),
  ...cells('fare_rules', 'rider', ['insert', 'update', 'delete'], 'deny'),
  ...cells('fare_rules', 'admin', ['select', 'insert', 'update', 'delete'], 'allow'),

  // payments
  ...cells('payments', 'rider', ['select'], 'own-only'),
  ...cells('payments', 'driver', ['select'], 'own-only'),
  ...cells('payments', 'support', ['select'], 'allow'),
  ...cells('payments', 'support', ['insert', 'update', 'delete'], 'deny'),
  ...cells('payments', 'anon', ['select'], 'deny'),

  // audit_logs
  ...cells('audit_logs', 'rider', ['select'], 'deny'),
  ...cells('audit_logs', 'driver', ['select'], 'deny'),
  ...cells('audit_logs', 'support', ['select'], 'allow'),
  ...cells('audit_logs', 'dispatcher', ['select'], 'allow'),
  ...cells('audit_logs', 'admin', ['select'], 'allow'),
];

export const rolesUnderTest = allRoles;
