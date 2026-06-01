-- FIX: Ensure columns exist in charges table
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS frequency TEXT DEFAULT 'fixed';
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS day_of_week INTEGER;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS day_of_month INTEGER;
ALTER TABLE public.charges ADD COLUMN IF NOT EXISTS is_recurring BOOLEAN DEFAULT false;

-- FIX: Ensure RLS policies allow insertion
ALTER TABLE public.charges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all access for charges" ON public.charges;
CREATE POLICY "Enable all access for charges" ON public.charges FOR ALL USING (true) WITH CHECK (true);

-- Refresh schema cache
NOTIFY pgrst, 'reload schema';
