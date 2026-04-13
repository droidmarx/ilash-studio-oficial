import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabaseAdmin';

/**
 * Endpoint Administrativo para Exclusão Total de Usuário
 * Este endpoint resolve o problema de inconsistência ao deletar usuários,
 * executando uma função SQL robusta primeiro e depois removendo o usuário do Auth.
 * 
 * Requisito: Service Role Key configurada no ambiente.
 */
export async function POST(request: Request) {
  try {
    const { userId, adminToken } = await request.json();

    // 1. Validar Token de Super Admin (bypass estático usado no projeto)
    if (adminToken !== 'ilash105046') {
      return NextResponse.json({ error: 'Não autorizado. Token inválido.' }, { status: 401 });
    }

    if (!userId) {
      return NextResponse.json({ error: 'O ID do usuário é obrigatório.' }, { status: 400 });
    }

    console.log(`[Delete API] Iniciando exclusão robusta para usuário: ${userId}`);

    // 2. Chamar a função SQL robusta via RPC
    // Esta função (delete_user_data) limpa: payment_logs -> subscriptions -> agendamentos -> configuracoes -> perfis
    // em uma única transação SQL.
    const { data: rpcData, error: rpcError } = await supabaseAdmin.rpc('delete_user_data', {
      target_user_id: userId
    });

    if (rpcError) {
      console.error('[Delete API] Erro na execução da função SQL (RPC):', rpcError);
      return NextResponse.json({ 
        error: `Erro ao limpar dependências no banco: ${rpcError.message}` 
      }, { status: 500 });
    }

    // Verificamos se a função SQL retornou algum erro interno (capturado pelo EXCEPTION no PL/pgSQL)
    if (rpcData && rpcData.success === false) {
      console.error('[Delete API] RPC retornou falha interna:', rpcData);
      return NextResponse.json({ 
        error: `Inconsistência no banco: ${rpcData.message}` 
      }, { status: 500 });
    }

    // 3. Excluir o usuário do Supabase Auth
    // Isso invalida sessões e remove o registro do auth.users.
    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId);
    
    if (authError) {
      console.error('[Delete API] Erro ao remover do Supabase Auth:', authError);
      // Se chegamos aqui, o banco foi limpo mas o Auth falhou.
      // O admin pode tentar novamente (idempotência garantida pela função SQL).
      return NextResponse.json({ 
        error: `Dados do banco limpos, mas falha ao remover do Auth: ${authError.message}` 
      }, { status: 500 });
    }

    console.log(`[Delete API] Usuário ${userId} excluído com sucesso absoluta.`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Usuário e todas as dependências foram removidos com sucesso.',
      details: rpcData
    });

  } catch (err: any) {
    console.error('[Delete API] Erro crítico inesperado:', err);
    return NextResponse.json({ 
      error: 'Erro interno no servidor ao processar a exclusão.', 
      detail: err.message 
    }, { status: 500 });
  }
}
