import { createClient } from '@supabase/supabase-js';

// Cliente Supabase exclusivo para o backend que bypassa as regras de RLS (Row Level Security).
// NUNCA importe este arquivo em componentes do cliente (React).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin = createClient(
  supabaseUrl,
  serviceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);
