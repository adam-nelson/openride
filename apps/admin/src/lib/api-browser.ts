'use client';

import { OpenrideApi } from '@openride/api-client';

import { getSupabaseBrowser } from './supabase-browser';

let cached: OpenrideApi | null = null;

/** Typed Edge Function client bound to the browser Supabase session. */
export function getApi(): OpenrideApi {
  if (!cached) cached = new OpenrideApi(getSupabaseBrowser());
  return cached;
}
