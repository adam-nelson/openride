import { describe, expect, it } from 'vitest';

import { evaluateCompliance, type ComplianceDocument, type ComplianceRule } from './compliance';

const RULES: ComplianceRule[] = [
  { applies_to: 'driver', doc_type: 'licence_front', is_required: true, validity_window_days: null },
  { applies_to: 'driver', doc_type: 'authority', is_required: true, validity_window_days: 365 },
  { applies_to: 'driver', doc_type: 'medical_cert', is_required: false, validity_window_days: 365 },
];

const NOW = new Date('2026-06-15T00:00:00Z');

function doc(docType: string, status: ComplianceDocument['status'], expiresOn: Date | null): ComplianceDocument {
  return { docType, status, expiresOn };
}

describe('evaluateCompliance', () => {
  it('is compliant when all required docs are approved and unexpired', () => {
    const v = evaluateCompliance(
      RULES,
      [
        doc('licence_front', 'approved', null),
        doc('authority', 'approved', new Date('2026-12-01T00:00:00Z')),
      ],
      NOW,
    );
    expect(v.isCompliant).toBe(true);
    expect(v.missing).toEqual([]);
    expect(v.expired).toEqual([]);
  });

  it('flags a missing required document', () => {
    const v = evaluateCompliance(RULES, [doc('licence_front', 'approved', null)], NOW);
    expect(v.isCompliant).toBe(false);
    expect(v.missing).toContain('authority');
  });

  it('flags an expired approved document', () => {
    const v = evaluateCompliance(
      RULES,
      [
        doc('licence_front', 'approved', null),
        doc('authority', 'approved', new Date('2026-06-01T00:00:00Z')), // before NOW
      ],
      NOW,
    );
    expect(v.isCompliant).toBe(false);
    expect(v.expired).toContain('authority');
  });

  it('reports a pending (not yet approved) document separately from missing', () => {
    const v = evaluateCompliance(
      RULES,
      [doc('licence_front', 'approved', null), doc('authority', 'pending', null)],
      NOW,
    );
    expect(v.isCompliant).toBe(false);
    expect(v.pending).toContain('authority');
    expect(v.missing).not.toContain('authority');
  });

  it('ignores non-required documents', () => {
    const v = evaluateCompliance(
      RULES,
      [doc('licence_front', 'approved', null), doc('authority', 'approved', null)],
      NOW,
    );
    // medical_cert is not required and absent — still compliant.
    expect(v.isCompliant).toBe(true);
  });
});
