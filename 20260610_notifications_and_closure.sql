-- Tabela de Notificações
CREATE TABLE IF NOT EXISTS public.notificacoes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo TEXT NOT NULL,
    mensagem TEXT NOT NULL,
    tipo TEXT NOT NULL, -- 'aluguel', 'devolucao', 'alerta', 'caixa'
    lida BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.notificacoes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para notificacoes (Liberar acesso para anon e autenticados)
DROP POLICY IF EXISTS "Permitir tudo para notificacoes" ON public.notificacoes;
CREATE POLICY "Permitir tudo para notificacoes" 
ON public.notificacoes FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Habilitar Realtime na tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notificacoes;

-- Tabela de Fechamentos de Caixa
CREATE TABLE IF NOT EXISTS public.caixa_fechamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_fechamento DATE UNIQUE NOT NULL, -- Garante apenas um fechamento por dia
    fechado_em TIMESTAMPTZ DEFAULT now(),
    usuario TEXT NOT NULL,
    whatsapp_enviado BOOLEAN DEFAULT FALSE
);

-- Habilitar RLS
ALTER TABLE public.caixa_fechamentos ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para caixa_fechamentos
DROP POLICY IF EXISTS "Permitir tudo para caixa_fechamentos" ON public.caixa_fechamentos;
CREATE POLICY "Permitir tudo para caixa_fechamentos" 
ON public.caixa_fechamentos FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);

-- Alteração para adicionar a coluna se a tabela já existir
ALTER TABLE public.caixa_fechamentos ADD COLUMN IF NOT EXISTS whatsapp_enviado BOOLEAN DEFAULT FALSE;

-- Test commit verification comment


