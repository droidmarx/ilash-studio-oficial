-- 1. Criar a tabela de logs administrativos se não existir
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    action TEXT NOT NULL,
    target_id TEXT,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Habilitar RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- 3. Política: Apenas Admins podem visualizar logs
DROP POLICY IF EXISTS "Admins can view logs" ON public.admin_logs;
CREATE POLICY "Admins can view logs" ON public.admin_logs
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM perfis 
            WHERE perfis.id = auth.uid() 
            AND (perfis.role = 'super_admin' OR perfis.role = 'admin')
        )
    );

-- 4. Garantir que o seu usuário principal tenha a role de super_admin
UPDATE perfis 
SET role = 'super_admin' 
WHERE email = 'droidmarx@gmail.com';

-- 5. Se a coluna 'status' não existir e for 'subscription_status', este script apenas confirma.
-- O código já foi ajustado para usar 'subscription_status'.
