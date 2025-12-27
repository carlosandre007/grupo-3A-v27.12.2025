-- Tabela de Manutenções da Moto
CREATE TABLE IF NOT EXISTS public.motorcycle_maintenance (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    motorcycle_id UUID REFERENCES public.motorcycles(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    value DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    type TEXT NOT NULL CHECK (type IN ('credit', 'debit')), -- 'credit' (receita/semana) ou 'debit' (despesa/manutenção)
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- RLS
ALTER TABLE public.motorcycle_maintenance ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable all access for motorcycle_maintenance" ON public.motorcycle_maintenance
    FOR ALL USING (true) WITH CHECK (true);

-- Permissões
GRANT ALL ON public.motorcycle_maintenance TO anon, authenticated, service_role;

-- Cache reload
NOTIFY pgrst, 'reload schema';
