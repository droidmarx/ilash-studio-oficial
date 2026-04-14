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

-- 5. Garantir que as colunas necessárias existam na tabela perfis
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='onboarding_completed') THEN
        ALTER TABLE public.perfis ADD COLUMN onboarding_completed BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='custom_price') THEN
        ALTER TABLE public.perfis ADD COLUMN custom_price DECIMAL(10,2);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='perfis' AND column_name='plan') THEN
        ALTER TABLE public.perfis ADD COLUMN plan TEXT DEFAULT 'Premium';
    END IF;
END $$;

-- 6. Garantir que o seu usuário principal tenha a role de super_admin
UPDATE perfis 
SET role = 'super_admin' 
WHERE email = 'droidmarx@gmail.com';
