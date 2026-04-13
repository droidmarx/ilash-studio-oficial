-- ============================================================
-- SCRIPT DE CORREÇÃO DE PERMISSÕES RLS - ILASH STUDIO
-- Execute no SQL Editor do Supabase Dashboard
-- Idempotente: pode ser re-executado sem problemas
-- ============================================================

-- 1. Habilitar RLS em todas as tabelas
ALTER TABLE public.perfis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agendamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.configuracoes ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 2. Políticas para a tabela PERFIS
-- ============================================================
DROP POLICY IF EXISTS "Usuários podem ver seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem ver seu próprio perfil" ON public.perfis
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem inserir seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem inserir seu próprio perfil" ON public.perfis
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem atualizar seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem atualizar seu próprio perfil" ON public.perfis
  FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Usuários podem deletar seu próprio perfil" ON public.perfis;
CREATE POLICY "Usuários podem deletar seu próprio perfil" ON public.perfis
  FOR DELETE USING (auth.uid() = id);

-- ============================================================
-- 3. Políticas para a tabela AGENDAMENTOS
-- ============================================================
DROP POLICY IF EXISTS "Usuários podem ver seus próprios agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem ver seus próprios agendamentos" ON public.agendamentos
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem inserir seus agendamentos" ON public.agendamentos
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem atualizar seus agendamentos" ON public.agendamentos
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar seus agendamentos" ON public.agendamentos;
CREATE POLICY "Usuários podem deletar seus agendamentos" ON public.agendamentos
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================
-- 4. Políticas para a tabela CONFIGURACOES
-- ============================================================
DROP POLICY IF EXISTS "Usuários podem ver suas configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários podem ver suas configuracoes" ON public.configuracoes
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem inserir suas configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários podem inserir suas configuracoes" ON public.configuracoes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem atualizar suas configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários podem atualizar suas configuracoes" ON public.configuracoes
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Usuários podem deletar suas configuracoes" ON public.configuracoes;
CREATE POLICY "Usuários podem deletar suas configuracoes" ON public.configuracoes
  FOR DELETE USING (auth.uid() = user_id);

-- Remove política FOR ALL antiga se existir
DROP POLICY IF EXISTS "Usuários podem gerenciar suas configuracoes" ON public.configuracoes;

-- ============================================================
-- 5. Permissões para service_role (usado pelo backend admin)
-- service_role bypassa RLS automaticamente, mas garantimos os GRANTs
-- ============================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;
