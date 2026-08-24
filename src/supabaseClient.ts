import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://evvsjsqocekkpmffbjkg.supabase.co';
export const SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qshd4LEttV7iiBfK8F7l-w_f4e_1aGZ';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
