-- SCRIPT PARA CRIAR A TABELA DE LOGS DE EXCLUSÃO
-- Cole este script no Editor SQL do seu painel do Supabase e clique em RUN.

CREATE TABLE IF NOT EXISTS public.deletion_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    table_name VARCHAR(255) NOT NULL,
    record_id VARCHAR(255),
    record_description TEXT,
    deleted_by VARCHAR(255) DEFAULT 'Sistema',
    deleted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.deletion_logs ENABLE ROW LEVEL SECURITY;

-- Criar políticas para permitir inserções e seleções públicas/anônimas
DROP POLICY IF EXISTS "Allow anon insert" ON public.deletion_logs;
CREATE POLICY "Allow anon insert" ON public.deletion_logs FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon select" ON public.deletion_logs;
CREATE POLICY "Allow anon select" ON public.deletion_logs FOR SELECT USING (true);

-- Adicionar à publicação de tempo real do Supabase
ALTER PUBLICATION supabase_realtime ADD TABLE deletion_logs;
