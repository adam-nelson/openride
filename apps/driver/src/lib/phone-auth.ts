import type { Session, SupabaseClient } from '@supabase/supabase-js';

export const RESEND_COOLDOWN_SECONDS = 30;

export type PhoneAuthClient = Pick<SupabaseClient['auth'], 'signInWithOtp' | 'verifyOtp'>;

export function normalizeSupportedPhoneNumber(input: string): string | null {
  const phone = input.trim().replace(/[\s().-]/g, '');
  if (/^\+234\d{10}$/.test(phone) || /^\+61\d{9}$/.test(phone)) return phone;
  return null;
}

export function resendSecondsRemaining(resendAt: number, now = Date.now()): number {
  return Math.max(0, Math.ceil((resendAt - now) / 1000));
}

export function phoneAuthErrorMessage(error: unknown, action: 'send' | 'verify'): string {
  const details =
    typeof error === 'object' && error !== null
      ? (error as { message?: unknown; status?: unknown; code?: unknown })
      : {};
  const message = typeof details.message === 'string' ? details.message : '';
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : '';
  const status = typeof details.status === 'number' ? details.status : 0;

  if (status === 429 || /rate.?limit|over_sms_send_rate_limit/.test(`${code} ${message.toLowerCase()}`)) {
    return 'Too many code requests. Wait a little before trying again.';
  }
  if (
    action === 'verify' &&
    /otp_expired|otp_not_found|invalid_credentials|invalid_grant|token_expired/.test(code)
  ) {
    return 'That code is incorrect or expired. Request a new code and try again.';
  }
  if (
    error instanceof TypeError ||
    /failed to fetch|network|cors|connection refused|load failed/i.test(message)
  ) {
    return 'Could not reach local Supabase Auth. Check the local Supabase and web preview proxy, then retry.';
  }
  if (action === 'verify') return 'That code is incorrect or expired. Check it or request a new one.';
  return 'Could not send a sign-in code. Check the phone number and try again.';
}

export function createPhoneAuthService(client: PhoneAuthClient) {
  return {
    async sendOtp(phoneInput: string): Promise<void> {
      const phone = normalizeSupportedPhoneNumber(phoneInput);
      if (!phone) {
        throw new Error('Enter a mobile number in E.164 format, such as +2348012345678 or +61412345678.');
      }
      const { error } = await client.signInWithOtp({ phone, options: { data: { role: 'driver' } } });
      if (error) throw error;
    },

    async verifyOtp(phoneInput: string, token: string): Promise<Session> {
      const phone = normalizeSupportedPhoneNumber(phoneInput);
      if (!phone) throw new Error('Enter a valid supported phone number before verifying the code.');
      const { data, error } = await client.verifyOtp({ phone, token, type: 'sms' });
      if (error) throw error;
      if (!data.session) throw new Error('Verification did not return a session. Request a new code and try again.');
      return data.session;
    },
  };
}