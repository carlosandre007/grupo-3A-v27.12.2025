-- SCRIPT PARA CRIAR A TABELA DE LOGS DE AUDITORIA
-- Execute este script no SQL Editor do seu painel do Supabase e clique em RUN.

CREATE TABLE IF NOT EXISTS public.auditoria_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    data_hora TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL,
    usuario TEXT DEFAULT 'Sistema' NOT NULL,
    valor_anterior DECIMAL(12,2) DEFAULT 0.00,
    valor_novo DECIMAL(12,2) DEFAULT 0.00,
    tipo_alteracao TEXT NOT NULL,
    detalhes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.auditoria_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir inserções e seleções públicas/anônimas
DROP POLICY IF EXISTS "Enable all access for auditoria_logs" ON public.auditoria_logs;
CREATE POLICY "Enable all access for auditoria_logs" ON public.auditoria_logs FOR ALL USING (true) WITH CHECK (true);

-- Adicionar à publicação de tempo real do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE auditoria_logs;

-- Forçar recarregamento do cache
NOTIFY pgrst, 'reload schema';
