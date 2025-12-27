-- SCRIPT DE RESET DA TABELA COBRANÇAS
-- ATENÇÃO: Isso apagará todas as cobranças cadastradas para corrigir o erro de esquema.

DROP TABLE IF EXISTS public.charges;

CREATE TABLE public.charges (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    client_name TEXT NOT NULL,
    ref TEXT NOT NULL,
    value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    due_date DATE NOT NULL,
    time TEXT,
    status TEXT DEFAULT 'pending', -- 'pending' or 'received'
    received_at TIMESTAMP WITH TIME ZONE,
    
    -- Novos campos para recorrência
    frequency TEXT DEFAULT 'fixed', -- 'fixed', 'weekly', 'monthly'
    day_of_week INTEGER, -- 0-6 (Dom-Sab)
    day_of_month INTEGER, -- 1-31
    is_recurring BOOLEAN DEFAULT false,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissões e RLS
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for charges" ON public.charges FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.charges TO anon, authenticated, service_role;

-- Forçar atualização do cache API
NOTIFY pgrst, 'reload schema';
