-- Adiciona a coluna custom_price na tabela perfis (se ainda não existe)
-- Execute no SQL Editor do Supabase Dashboard
ALTER TABLE public.perfis ADD COLUMN IF NOT EXISTS custom_price numeric DEFAULT 9.99;

-- Atualiza usuários que ainda não têm preço definido para o padrão
UPDATE public.perfis SET custom_price = 9.99 WHERE custom_price IS NULL;
