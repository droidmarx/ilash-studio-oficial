-- ==========================================
-- SISTEMA DE EXCLUSÃO ROBUSTA DE USUÁRIO
-- Este script cria uma função que deleta o usuário e todas as suas dependências
-- em ordem correta para evitar violações de foreign key constraints.
-- ==========================================

-- 1. Criar tabela de logs de deleção (opcional para rastreabilidade)
CREATE TABLE IF NOT EXISTS public.deletion_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid,
    user_email text,
    deleted_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    reason text DEFAULT 'Superadmin request'
);

-- 2. Habilitar RLS na tabela de logs e permitir apenas service_role
ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.deletion_logs TO service_role;

-- 3. Função de Exclusão Completa
CREATE OR REPLACE FUNCTION public.delete_user_data(target_user_id uuid)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER -- Permite rodar com privilégios elevados ignorando RLS
AS $$
DECLARE
    user_email_var text;
    result_info json;
BEGIN
    -- Obter o e-mail do usuário antes de deletar para o log
    SELECT email INTO user_email_var FROM public.perfis WHERE id = target_user_id;
    
    -- Se não encontrar no perfil, tenta no auth.users
    IF user_email_var IS NULL THEN
        SELECT email INTO user_email_var FROM auth.users WHERE id = target_user_id;
    END IF;

    -- Início da deleção em ordem de dependência (Payment Logs dependem de Subscriptions)
    
    -- A. Deletar logs de pagamento vinculados às inscrições do usuário
    DELETE FROM public.payment_logs 
    WHERE subscription_id IN (SELECT id FROM public.subscriptions WHERE user_id = target_user_id);
    
    -- B. Deletar as inscrições (subscriptions)
    DELETE FROM public.subscriptions WHERE user_id = target_user_id;
    
    -- C. Deletar agendamentos
    DELETE FROM public.agendamentos WHERE user_id = target_user_id;
    
    -- D. Deletar configurações
    DELETE FROM public.configuracoes WHERE user_id = target_user_id;
    
    -- E. Deletar perfil
    DELETE FROM public.perfis WHERE id = target_user_id;

    -- F. Registrar no log de deleções
    INSERT INTO public.deletion_logs (user_id, user_email)
    VALUES (target_user_id, COALESCE(user_email_var, 'desconhecido'));

    -- Retornar sucesso
    result_info := json_build_object(
        'success', true,
        'user_id', target_user_id,
        'email', user_email_var,
        'message', 'Dados deletados com sucesso do banco de dados'
    );
    
    RETURN result_info;

EXCEPTION WHEN OTHERS THEN
    -- Em caso de erro, retorna o erro
    RETURN json_build_object(
        'success', false,
        'message', SQLERRM,
        'detail', SQLSTATE
    );
END;
$$;
