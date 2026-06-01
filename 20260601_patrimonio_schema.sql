-- SCRIPT DE MIGRAÇÃO PATRIMONIAL ATUALIZADO - GRUPO 3A
-- Execute este script no SQL Editor do Supabase (https://supabase.com)

-- 1. Adicionar colunas na tabela de motocicletas/veículos
ALTER TABLE public.motorcycles 
ADD COLUMN IF NOT EXISTS valor_patrimonial DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS valor_atual DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS data_aquisicao DATE,
ADD COLUMN IF NOT EXISTS receita_acumulada_anterior DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS despesa_acumulada_anterior DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 2. Adicionar colunas na tabela de imóveis/lojas
ALTER TABLE public.properties 
ADD COLUMN IF NOT EXISTS valor_patrimonial DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS valor_atual DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS data_aquisicao DATE,
ADD COLUMN IF NOT EXISTS receita_acumulada_anterior DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS despesa_acumulada_anterior DECIMAL(12,2) DEFAULT 0.00,
ADD COLUMN IF NOT EXISTS observacoes TEXT;

-- 3. Forçar recarregamento do cache do PostgREST para reconhecer as novas colunas
NOTIFY pgrst, 'reload schema';
