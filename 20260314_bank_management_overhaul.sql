-- Migration for Bank Management Overhaul
-- Project: GRUPO 30

-- 1. Update 'banks' table
ALTER TABLE banks ADD COLUMN IF NOT EXISTS banco TEXT;
ALTER TABLE banks ADD COLUMN IF NOT EXISTS responsavel TEXT;
ALTER TABLE banks ADD COLUMN IF NOT EXISTS tipo_conta TEXT;
ALTER TABLE banks ADD COLUMN IF NOT EXISTS icone_banco TEXT;

-- Rename columns if they don't match the new naming (optional but better to align)
-- Note: 'name' and 'balance' exist currently.
-- We will keep 'name' as 'nome_conta' or just use 'name' in code for compatibility.
-- The user requested: id, banco, nome_conta, responsavel, saldo_atual, tipo_conta, icone_banco, data_criacao.

-- For safety and compatibility, we'll keep 'name' and 'balance' but add comments or create views if needed.
-- Actually, let's just make sure the code uses these names.

-- 2. Update 'transactions' table
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS id_conta UUID REFERENCES banks(id);
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS origem TEXT;

-- 3. Refresh schema cache
NOTIFY pgrst, 'reload schema';
