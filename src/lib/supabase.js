import { createClient } from '@supabase/supabase-js';

const supabaseUrl  = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey  = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder';

if (!import.meta.env.VITE_SUPABASE_URL || !import.meta.env.VITE_SUPABASE_ANON_KEY) {
  console.warn("Supabase URL yoki Anon Key topilmadi! Iltimos, Vercel sozlamalarida Environment Variables ni qo'shing.");
}

export const supabase = createClient(supabaseUrl, supabaseKey);

