// Placeholder. Run `make types` (or `pnpm db:types`) to regenerate this file
// from the live local schema once `supabase start` has applied migrations.
//
// Until then, callers get the `unknown` shape below — type checks still pass,
// but no field-level safety. Do not edit by hand.

export type Json = string | number | boolean | null | { [key: string]: Json } | Json[];

export interface Database {
  public: {
    Tables: Record<string, { Row: Record<string, unknown>; Insert: Record<string, unknown>; Update: Record<string, unknown> }>;
    Views: Record<string, { Row: Record<string, unknown> }>;
    Functions: Record<string, { Args: Record<string, unknown>; Returns: unknown }>;
    Enums: Record<string, string>;
    CompositeTypes: Record<string, Record<string, unknown>>;
  };
}
