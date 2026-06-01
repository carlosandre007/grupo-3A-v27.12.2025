-- Refatoração para Integração Financeira Automática e Proteção contra Duplicidade

-- 1. Atualizar tabela de Custos Fixos
ALTER TABLE public.fixed_costs 
ADD COLUMN IF NOT EXISTS month INTEGER,
ADD COLUMN IF NOT EXISTS year INTEGER,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS id_conta UUID REFERENCES public.banks(id),
ADD COLUMN IF NOT EXISTS paid_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS observation TEXT,
ADD COLUMN IF NOT EXISTS company TEXT DEFAULT 'Grupo 3A',
ADD COLUMN IF NOT EXISTS is_recurrent BOOLEAN DEFAULT true;

-- Adicionar índice de competência para busca rápida
CREATE INDEX IF NOT EXISTS idx_fixed_costs_competencia ON public.fixed_costs(month, year);

-- 2. Atualizar tabela de Transações (Fluxo de Caixa)
ALTER TABLE public.transactions
ADD COLUMN IF NOT EXISTS source_module TEXT, -- 'fixed_costs', 'charges', 'properties', etc.
ADD COLUMN IF NOT EXISTS reference_id UUID,   -- ID do registro original
ADD COLUMN IF NOT EXISTS payment_hash TEXT,    -- Hash para evitar duplicidade (ex: id+competencia+valor)
ADD COLUMN IF NOT EXISTS payment_registered BOOLEAN DEFAULT false;

-- Adicionar índice único para o hash de pagamento (OPCIONAL, mas recomendado para segurança nível banco)
-- CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_payment_hash ON public.transactions(payment_hash) WHERE payment_hash IS NOT NULL;

-- 3. Função para Recarregar Esquema
NOTIFY pgrst, 'reload schema';
