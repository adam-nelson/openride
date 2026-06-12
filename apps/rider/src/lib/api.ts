import { OpenrideApi } from '@openride/api-client';

import { supabase } from './supabase';

// Typed wrapper over the Edge Functions (fare-estimate, bookings, …).
export const api = new OpenrideApi(supabase);
