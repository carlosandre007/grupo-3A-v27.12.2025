ALTER TABLE public.fixed_costs ADD COLUMN IF NOT EXISTS carry_forward_value BOOLEAN DEFAULT false;
