-- Nova tabela para Alertas de Manutenção
CREATE TABLE IF NOT EXISTS public.maintenance_alerts (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    type TEXT NOT NULL CHECK (type IN ('vehicle', 'property')),
    related_item TEXT NOT NULL, -- Placa ou Código do Imóvel
    description TEXT NOT NULL,
    due_date DATE,
    due_km INTEGER,
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'resolved')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Nova tabela para Carrinho de Compras / Afazeres
CREATE TABLE IF NOT EXISTS public.shopping_cart (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    description TEXT NOT NULL,
    category TEXT NOT NULL CHECK (category IN ('piece', 'material', 'service', 'task')),
    estimated_value DECIMAL(12,2) DEFAULT 0.00,
    origin TEXT DEFAULT 'manual' CHECK (origin IN ('manual', 'alert')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'bought', 'completed')),
    alert_id UUID REFERENCES public.maintenance_alerts(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Garantir que a tabela de manutenções de moto tenha o campo km_atual
ALTER TABLE public.motorcycle_maintenance ADD COLUMN IF NOT EXISTS km_atual INTEGER;

-- Habilitar RLS e permissões para as novas tabelas
ALTER TABLE public.maintenance_alerts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for maintenance_alerts" ON public.maintenance_alerts FOR ALL USING (true) WITH CHECK (true);

ALTER TABLE public.shopping_cart ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable all access for shopping_cart" ON public.shopping_cart FOR ALL USING (true) WITH CHECK (true);

-- Habilitar Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE maintenance_alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE shopping_cart;

-- Notificar cache
NOTIFY pgrst, 'reload schema';
