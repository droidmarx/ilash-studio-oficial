-- 1. Habilitar RLS em todas as tabelas (se não estiver habilitado)
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 2. Políticas para a tabela PERFIS
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.perfis 
FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.perfis 
FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem inserir seu próprio perfil" ON public.perfis 
FOR INSERT WITH CHECK (auth.uid() = id);

-- 3. Políticas para a tabela AGENDAMENTOS
DROP POLICY IF EXISTS "Usuários podem ver seus próprios agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem ver seus próprios agendamentos" ON public.agendamentos 
FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem inserir seus agendamentos" ON public.agendamentos 
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem atualizar seus agendamentos" ON public.agendamentos 
FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem deletar seus agendamentos" ON public.agendamentos 
FOR DELETE USING (auth.uid() = user_id);

-- 4. Políticas para a tabela CONFIGURACOES
DROP POLICY IF EXISTS "Usuários podem gerenciar suas configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários podem gerenciar suas configuracoes" ON public.configuracoes 
FOR ALL USING (auth.uid() = user_id);

-- 5. Dar acesso total para a SERVICE ROLE (Admin)
-- Por padrão a service_role desvia do RLS, mas garantimos aqui por redundância
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
