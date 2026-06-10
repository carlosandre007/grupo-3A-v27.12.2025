-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'aluguel', 'devolucao', 'alerta', 'caixa'
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar Realtime na tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- Tabela de Fechamentos de Caixa
CREATE TABLE IF NOT EXISTS public.caixa_fechamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_fechamento DATE UNIQUE NOT NULL, -- Garante apenas um fechamento por dia
    fechado_em TIMESTAMPTZ DEFAULT now(),
    usuario TEXT NOT NULL
);
