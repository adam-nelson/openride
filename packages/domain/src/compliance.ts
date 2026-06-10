export interface ComplianceDocument {
  docType: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  expiresOn: Date | null;
}

export interface ComplianceRule {
  applies_to: 'driver' | 'vehicle';
  doc_type: string;
  is_required: boolean;
  validity_window_days: number | null;
}

export interface ComplianceVerdict {
  isCompliant: boolean;
  missing: string[];
  expired: string[];
  pending: string[];
}

/**
 * Decide whether a set of documents satisfies a set of compliance rules.
 * Pure — used by the dispatch filter and the daily expiry cron.
 */
export function evaluateCompliance(
  rules: ComplianceRule[],
  documents: ComplianceDocument[],
  now: Date,
): ComplianceVerdict {
  const missing: string[] = [];
  const expired: string[] = [];
  const pending: string[] = [];

  for (const rule of rules) {
    if (!rule.is_required) continue;
    const candidates = documents.filter((d) => d.docType === rule.doc_type);
    const approved = candidates.find((d) => d.status === 'approved');

    if (!approved) {
      if (candidates.some((d) => d.status === 'pending')) pending.push(rule.doc_type);
      else missing.push(rule.doc_type);
      continue;
    }
    if (approved.expiresOn && approved.expiresOn.getTime() <= now.getTime()) {
      expired.push(rule.doc_type);
    }
  }

  return {
    isCompliant: missing.length === 0 && expired.length === 0,
    missing,
    expired,
    pending,
  };
}
