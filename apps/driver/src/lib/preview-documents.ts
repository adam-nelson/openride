import type { DriverDocument } from './driver-state';

export function simulatePreviewDocumentVerification(
  documents: DriverDocument[],
  expiresOn: string,
): DriverDocument[] {
  return documents.map((document) =>
    document.renewalSubmitted
      ? {
          ...document,
          status: 'verified',
          uploaded: true,
          renewalSubmitted: false,
          expiringSoon: false,
          expiresOn,
          expiryLabel: 'expires in 12 months',
        }
      : document,
  );
}