import { createClient } from '@supabase/supabase-js';

// Cliente Supabase exclusivo para o backend que bypassa as regras de RLS.
// NUNCA importe este arquivo em componentes do cliente.

export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('ERRO CRÍTICO: Credenciais do Supabase Admin não encontradas no ambiente.');
    throw new Error('Configuração do servidor incompleta (Service Role Key ausente).');
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}
