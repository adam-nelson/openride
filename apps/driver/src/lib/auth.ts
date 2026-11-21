import type { Session } from '@supabase/supabase-js';
import { useEffect, useState } from 'react';

import { createPhoneAuthService } from './phone-auth';
import { supabase } from './supabase';

const phoneAuth = createPhoneAuthService(supabase.auth);

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!mounted) return;
        setSession(data.session);
        setLoading(false);
      })
      .catch(() => {
        if (mounted) setLoading(false);
      });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      if (mounted) setSession(s);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export const sendOtp = phoneAuth.sendOtp;
export const verifyOtp = phoneAuth.verifyOtp;

export async function signOut(): Promise<void> {
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}
