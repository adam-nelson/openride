import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useState } from 'react';

import { supabase } from './supabase';

export interface Profile {
  id: string;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  onboarding_completed_at: string | null;
}

/** Loads the signed-in user's row from public.users (RLS: own row only). */
export function useProfile(session: Session | null): {
  profile: Profile | null;
  loading: boolean;
  refresh: () => Promise<void>;
} {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!session) {
      setProfile(null);
      setLoading(false);
      return;
    }
    const { data } = await supabase
      .from('users')
      .select('id, display_name, email, phone, onboarding_completed_at')
      .eq('id', session.user.id)
      .maybeSingle();
    setProfile((data as Profile) ?? null);
    setLoading(false);
  }, [session]);

  useEffect(() => {
    setLoading(true);
    void refresh();
  }, [refresh]);

  return { profile, loading, refresh };
}

export async function completeProfile(displayName: string, email?: string): Promise<void> {
  const { data: userData } = await supabase.auth.getUser();
  const id = userData.user?.id;
  if (!id) throw new Error('Not signed in');
  const { error } = await supabase
    .from('users')
    .update({
      display_name: displayName.trim(),
      email: email?.trim() || null,
      onboarding_completed_at: new Date().toISOString(),
    })
    .eq('id', id);
  if (error) throw error;
}

export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      if (mounted) setSession(s);
    });

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { session, loading };
}

export async function sendOtp(phone: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({ phone });
  if (error) throw error;
}

export async function verifyOtp(phone: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({ phone, token, type: 'sms' });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
