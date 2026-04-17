-- 1. Habilitar RLS na tabela (se não estiver)
ALTER TABLE agendamentos ENABLE ROW LEVEL SECURITY;

-- 2. Remover políticas antigas se existirem (para evitar conflitos)
DROP POLICY IF EXISTS "Usuários podem ver seus próprios agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Usuários podem inserir seus próprios agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Usuários podem excluir seus próprios agendamentos" ON agendamentos;
DROP POLICY IF EXISTS "Usuários podem atualizar seus próprios agendamentos" ON agendamentos;

-- 3. Criar nova política unificada de SELECT
CREATE POLICY "Acesso de leitura para donos" 
ON agendamentos FOR SELECT 
TO authenticated 
USING (auth.uid() = user_id);

-- 4. Criar política de INSERT
CREATE POLICY "Permitir inserção pelo dono" 
ON agendamentos FOR INSERT 
TO authenticated 
WITH CHECK (auth.uid() = user_id);

-- 5. Criar política de UPDATE
CREATE POLICY "Permitir atualização pelo dono" 
ON agendamentos FOR UPDATE 
TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 6. Criar política de DELETE
CREATE POLICY "Permitir exclusão pelo dono" 
ON agendamentos FOR DELETE 
TO authenticated 
USING (auth.uid() = user_id);
