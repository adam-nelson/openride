import { describe, expect, it } from 'vitest';

import { simulatePreviewDocumentVerification } from './preview-documents';

describe('simulatePreviewDocumentVerification', () => {
  it('updates preview state locally without mutating unrelated records', () => {
    const input = [
      {
        type: 'Hackney Permit' as const,
        status: 'pending' as const,
        uploaded: true,
        renewalSubmitted: true,
        expiringSoon: true,
      },
      { type: 'License' as const, status: 'verified' as const, uploaded: true },
    ];

    const result = simulatePreviewDocumentVerification(input, '2027-11-06T00:00:00.000Z');

    expect(result[0]).toMatchObject({
      status: 'verified',
      uploaded: true,
      renewalSubmitted: false,
      expiringSoon: false,
      expiresOn: '2027-11-06T00:00:00.000Z',
    });
    expect(result[1]).toBe(input[1]);
    expect(input.at(0)?.status).toBe('pending');
  });
});