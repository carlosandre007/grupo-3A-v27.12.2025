-- SCRIPT DE CORREÇÃO E CONFIGURAÇÃO COMPLETA
-- Execute este script no Console SQL do Supabase para corrigir os erros de "tabela não encontrada" e permissões.

-- 1. CORREÇÃO: Tabela de BANCOS (Banks)
CREATE TABLE IF NOT EXISTS public.banks (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    balance DECIMAL(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Habilitar RLS e permitir tudo (para evitar erros de permissão se RLS estiver ativo)
ALTER TABLE public.banks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for banks" ON public.banks;
CREATE POLICY "Enable all access for banks" ON public.banks FOR ALL USING (true) WITH CHECK (true);

-- 2. CORREÇÃO: Tabela de IMÓVEIS (Properties)
CREATE TABLE IF NOT EXISTS public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    value DECIMAL(12,2) DEFAULT 0.00,
    tenant TEXT, -- Nome do inquilino (legado/cache)
    tenant_id UUID REFERENCES public.clients(id), -- Link para tabela de clientes
    status TEXT DEFAULT 'available', -- 'available' ou 'rented'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- GARANTIR que a coluna tenant_id exista (caso a tabela já existisse sem ela)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.clients(id);
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tenant TEXT;

-- Habilitar RLS e permitir tudo
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for properties" ON public.properties;
CREATE POLICY "Enable all access for properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);

-- 3. CORREÇÃO: Tabela de COBRANÇAS (Charges) - Campos de Recorrência
ALTER TABLE public.charges 
ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'fixed',
ADD COLUMN IF NOT EXISTS day_of_week INTEGER,
ADD COLUMN IF NOT EXISTS day_of_month INTEGER,
ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- 4. Habilitar Realtime para atualização instantânea (Opcional)
ALTER PUBLICATION supabase_realtime ADD TABLE banks;
ALTER PUBLICATION supabase_realtime ADD TABLE properties;

-- 5. FORÇAR ATUALIZAÇÃO DO CACHE DO ESQUEMA (Importante para o erro "schema cache")
NOTIFY pgrst, 'reload schema';
