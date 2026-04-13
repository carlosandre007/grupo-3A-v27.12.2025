-- Add category_id and observation to charges
ALTER TABLE charges ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id);
ALTER TABLE charges ADD COLUMN IF NOT EXISTS observation TEXT;

-- Create audit log table for charges
CREATE TABLE IF NOT EXISTS log_edicao_cobrancas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  id_cobranca UUID REFERENCES charges(id) ON DELETE CASCADE,
  usuario TEXT,
  campo_editado TEXT,
  valor_antigo TEXT,
  valor_novo TEXT,
  data_hora TIMESTAMPTZ DEFAULT now()
);

-- Note: Ensure categories table exists (it should, based on CashFlow.tsx)
-- and that the user has permissions to run these DDL statements.
