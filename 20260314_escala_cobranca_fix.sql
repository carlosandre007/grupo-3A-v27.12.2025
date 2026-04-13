-- Fix for Charges Scale module
-- Use specific names requested by the user

-- Add new columns if they don't exist
ALTER TABLE charges ADD COLUMN IF NOT EXISTS valor_cobranca DECIMAL(10,2);
ALTER TABLE charges ADD COLUMN IF NOT EXISTS id_categoria_financeira UUID REFERENCES categories(id);

-- Optional: Copy data from old columns if they exist (compatibility)
DO $$ 
BEGIN 
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='charges' AND column_name='value') THEN
        UPDATE charges SET valor_cobranca = value WHERE valor_cobranca IS NULL;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='charges' AND column_name='category_id') THEN
        UPDATE charges SET id_categoria_financeira = category_id WHERE id_categoria_financeira IS NULL;
    END IF;
END $$;
