-- Tabela de Logs de Auditoria do Administrador
CREATE TABLE IF NOT EXISTS public.admin_logs (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_id uuid REFERENCES public.perfis(id),
    action text NOT NULL, -- ex: 'IMPERSONATE', 'SUBSCRIPTION_UPDATE', 'GLOBAL_SETTINGS_CHANGE'
    target_id text, -- ID do usuário ou recurso afetado
    details jsonb, -- Detalhes extras da ação
    ip_address text,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS
ALTER TABLE public.admin_logs ENABLE ROW LEVEL SECURITY;

-- Apenas super_admins podem ver os logs (Política Simplificada para Backend via Service Role)
-- Nota: O backend usará a service role, mas podemos adicionar políticas para visualização no painel
CREATE POLICY "Super Admins can view logs" ON public.admin_logs
    FOR SELECT
    USING (EXISTS (SELECT 1 FROM public.perfis WHERE id = auth.uid() AND role = 'super_admin'));

-- Grant admin role para o email principal (Super Admin)
UPDATE public.perfis SET role = 'super_admin' WHERE email = 'droidmarx@gmail.com';
