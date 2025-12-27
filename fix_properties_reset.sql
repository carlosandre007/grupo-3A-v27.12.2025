-- SCRIPT DE RESET DA TABELA IMÓVEIS
-- ATENÇÃO: Isso apagará todos os imóveis cadastrados para corrigir o erro de esquema.

DROP TABLE IF EXISTS public.properties;

CREATE TABLE public.properties (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    code TEXT NOT NULL,
    description TEXT NOT NULL,
    address TEXT NOT NULL,
    value DECIMAL(12,2) DEFAULT 0.00,
    tenant TEXT,
    tenant_id UUID REFERENCES public.clients(id),
    status TEXT DEFAULT 'available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Permissões e RLS
ALTER TABLE public.properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for properties" ON public.properties FOR ALL USING (true) WITH CHECK (true);
GRANT ALL ON public.properties TO anon, authenticated, service_role;

-- Forçar atualização do cache API
NOTIFY pgrst, 'reload schema';
