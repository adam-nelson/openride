import type { Session } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

import {
  createPhoneAuthService,
  normalizeSupportedPhoneNumber,
  phoneAuthErrorMessage,
  resendSecondsRemaining,
  type PhoneAuthClient,
} from './phone-auth';

function createFakeClient(overrides: Partial<Pick<PhoneAuthClient, 'signInWithOtp' | 'verifyOtp'>> = {}) {
  return {
    signInWithOtp: vi.fn().mockResolvedValue({ error: null }),
    verifyOtp: vi.fn().mockResolvedValue({ data: { session: {} as Session }, error: null }),
    ...overrides,
  } as unknown as PhoneAuthClient;
}

describe('phone sign-in helpers', () => {
  it.each([
    ['+234 801 234 5678', '+2348012345678'],
    ['+61 (4) 1234-5678', '+61412345678'],
    ['+234801234567', null],
    ['+1 202 555 0100', null],
    ['  ', null],
  ])('normalizes only supported E.164 mobile numbers: %s', (input, expected) => {
    expect(normalizeSupportedPhoneNumber(input)).toBe(expected);
  });

  it('never sends an invalid or placeholder number to Auth', async () => {
    const client = createFakeClient();
    const auth = createPhoneAuthService(client);

    await expect(auth.sendOtp('')).rejects.toThrow('E.164 format');
    await expect(auth.sendOtp('+61 400 000 0000')).rejects.toThrow('E.164 format');
    expect(client.signInWithOtp).not.toHaveBeenCalled();
  });

  it('sends the normalized phone to Supabase Auth', async () => {
    const client = createFakeClient();
    await createPhoneAuthService(client).sendOtp('+234 801 234 5678');
    expect(client.signInWithOtp).toHaveBeenCalledWith({
      phone: '+2348012345678',
      options: { data: { role: 'driver' } },
    });
  });

  it('requires verifyOtp to return a real session before sign-in can continue', async () => {
    const session = {} as Session;
    const client = createFakeClient({
      verifyOtp: vi.fn().mockResolvedValue({ data: { session }, error: null }),
    });
    await expect(createPhoneAuthService(client).verifyOtp('+61412345678', '123456')).resolves.toBe(session);

    const noSessionClient = createFakeClient({
      verifyOtp: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
    });
    await expect(createPhoneAuthService(noSessionClient).verifyOtp('+61412345678', '123456')).rejects.toThrow(
      'did not return a session',
    );
  });

  it('maps network, rate limit, and wrong/expired code errors to useful messages', () => {
    expect(phoneAuthErrorMessage(new TypeError('Failed to fetch'), 'send')).toMatch(/local Supabase Auth/i);
    expect(phoneAuthErrorMessage({ status: 429 }, 'send')).toMatch(/Too many code requests/i);
    expect(phoneAuthErrorMessage({ code: 'otp_expired' }, 'verify')).toMatch(/incorrect or expired/i);
  });

  it('counts down resend cooldown without allowing negative time', () => {
    expect(resendSecondsRemaining(31_000, 1_000)).toBe(30);
    expect(resendSecondsRemaining(999, 1_000)).toBe(0);
  });
});
