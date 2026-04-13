-- Migração: Movimentação Mensal Manual de Bancos
-- Objetivo: Criar tabela para registro manual de fluxos mensais que impactam o saldo.

CREATE TABLE IF NOT EXISTS public.movimentacao_mensal_bancos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_conta UUID REFERENCES public.banks(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 0 AND mes <= 11),
    ano INTEGER NOT NULL,
    entrada_mes NUMERIC(15,2) DEFAULT 0,
    saida_mes NUMERIC(15,2) DEFAULT 0,
    data_atualizacao TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    usuario TEXT,
    UNIQUE(id_conta, mes, ano)
);

-- Habilitar RLS
ALTER TABLE public.movimentacao_mensal_bancos ENABLE ROW LEVEL SECURITY;

-- Políticas simples (assumindo acesso total para usuários autenticados conforme padrão do projeto)
CREATE POLICY "Acesso total movimentação mensal" ON public.movimentacao_mensal_bancos
    FOR ALL USING (true) WITH CHECK (true);

-- Comentário para documentação
COMMENT ON TABLE public.movimentacao_mensal_bancos IS 'Registros manuais de movimentação mensal por conta bancária.';
