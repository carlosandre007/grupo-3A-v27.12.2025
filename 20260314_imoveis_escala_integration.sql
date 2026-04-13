-- Migration for Property Management and Charges Scale Integration

-- Add origin and link fields to property_payments
ALTER TABLE property_payments ADD COLUMN IF NOT EXISTS origem_pagamento TEXT DEFAULT 'pagamento_manual';
ALTER TABLE property_payments ADD COLUMN IF NOT EXISTS id_escala_cobranca UUID REFERENCES charges(id);

-- Optional: Index for better lookup
CREATE INDEX IF NOT EXISTS idx_property_payments_charge ON property_payments(id_escala_cobranca);
