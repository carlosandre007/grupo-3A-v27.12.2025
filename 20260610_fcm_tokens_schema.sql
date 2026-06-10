CREATE TABLE IF NOT EXISTS public.user_fcm_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    email TEXT,
    token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.user_fcm_tokens ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
DROP POLICY IF EXISTS "Permitir tudo para user_fcm_tokens" ON public.user_fcm_tokens;
CREATE POLICY "Permitir tudo para user_fcm_tokens" 
ON public.user_fcm_tokens FOR ALL 
TO anon, authenticated 
USING (true) 
WITH CHECK (true);
