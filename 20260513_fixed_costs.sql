-- Migração: Custo Fixo Mensal
-- Objetivo: Criar tabela para registro de custos fixos recorrentes.

CREATE TABLE IF NOT EXISTS public.fixed_costs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    invoice TEXT,
    price NUMERIC(15,2) DEFAULT 0,
    qty INTEGER DEFAULT 1,
    total NUMERIC(15,2) GENERATED ALWAYS AS (price * qty) STORED,
    due_date DATE,
    status TEXT DEFAULT 'pending', -- 'paid' or 'pending'
    category TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Habilitar RLS
ALTER TABLE public.fixed_costs ENABLE ROW LEVEL SECURITY;

-- Políticas de acesso
CREATE POLICY "Acesso total custos fixos" ON public.fixed_costs
    FOR ALL USING (true) WITH CHECK (true);

-- Comentário para documentação
COMMENT ON TABLE public.fixed_costs IS 'Registros de custos fixos mensais da empresa.';
