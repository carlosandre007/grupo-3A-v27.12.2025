-- 1. Melhoria na tabela de Transações (Fluxo de Caixa)
ALTER TABLE public.transactions 
ADD COLUMN IF NOT EXISTS referencia_id UUID,
ADD COLUMN IF NOT EXISTS origem TEXT;

-- Index para busca rápida por referência (evita duplicidade)
CREATE INDEX IF NOT EXISTS idx_transactions_referencia ON public.transactions(referencia_id);

-- 2. Melhoria na tabela de Manutenção da Moto
ALTER TABLE public.motorcycle_maintenance
ADD COLUMN IF NOT EXISTS km_atual INTEGER;

-- 3. Melhoria na tabela de Clientes
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS cnh TEXT,
ADD COLUMN IF NOT EXISTS cnh_validade DATE;

-- Caso a coluna cnh_expiry já exista e tenha dados (...)
UPDATE public.clients SET cnh_validade = cnh_expiry::DATE WHERE cnh_validade IS NULL AND cnh_expiry IS NOT NULL;

-- Caso a coluna cnhExpiry já exista e tenha dados, podemos migrar (opcional, mas recomendado seguir o nome sugerido)
-- UPDATE public.clients SET cnh_validade = cnh_expiry::DATE WHERE cnh_expiry IS NOT NULL;

-- 4. Tabela de Vínculo de Ativos (Veículos e Imóveis)
CREATE TABLE IF NOT EXISTS public.cliente_ativos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    cliente_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
    ativo_id UUID NOT NULL,
    tipo TEXT CHECK (tipo IN ('veiculo', 'imovel', 'loja')),
    data_vinculo TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(cliente_id, ativo_id, tipo)
);

-- Habilitar RLS e Realtime
ALTER TABLE public.cliente_ativos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for cliente_ativos" ON public.cliente_ativos;
CREATE POLICY "Enable all access for cliente_ativos" ON public.cliente_ativos FOR ALL USING (true) WITH CHECK (true);
ALTER PUBLICATION supabase_realtime ADD TABLE cliente_ativos;

-- 5. Melhoria na tabela de Imóveis (Tipo: Casa ou Loja)
ALTER TABLE public.properties ADD COLUMN IF NOT EXISTS tipo TEXT DEFAULT 'imovel' CHECK (tipo IN ('imovel', 'loja'));

-- 6. Adicionar coluna 'type' na tabela de Motocicletas (para suportar ícones de carros)
ALTER TABLE public.motorcycles ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'moto' CHECK (type IN ('moto', 'carro'));

-- Recarregar cache do PostgREST
NOTIFY pgrst, 'reload schema';

-- 7. Adicionar secondary_balance na tabela de Bancos
ALTER TABLE public.banks ADD COLUMN IF NOT EXISTS secondary_balance NUMERIC DEFAULT 0;
