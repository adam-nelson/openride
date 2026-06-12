import { OpenrideApi } from '@openride/api-client';

import { supabase } from './supabase';

export const api = new OpenrideApi(supabase);
