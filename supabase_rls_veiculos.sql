-- 1. GARANTIR QUE A COLUNA user_id EXISTA
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'user_id') THEN
        ALTER TABLE veiculos ADD COLUMN user_id uuid REFERENCES auth.users;
        RAISE NOTICE 'Coluna user_id adicionada à tabela veiculos.';
    END IF;
END $$ LANGUAGE plpgsql;

-- 2. ATIVAR RLS NA TABELA veiculos
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;

-- 3. CRIAR POLÍTICA DE SELECT (Leitura)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to read all veiculos" ON veiculos;
    CREATE POLICY "Allow authenticated users to read all veiculos"
    ON veiculos FOR SELECT
    TO authenticated
    USING (true);
    RAISE NOTICE 'Política de SELECT criada/atualizada.';
END $$ LANGUAGE plpgsql;

-- 4. CRIAR POLÍTICA DE INSERT (Criação)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to insert veiculos" ON veiculos;
    CREATE POLICY "Allow authenticated users to insert veiculos"
    ON veiculos FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Política de INSERT criada/atualizada.';
END $$ LANGUAGE plpgsql;

-- 5. CRIAR POLÍTICA DE UPDATE (Atualização)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to update own veiculos" ON veiculos;
    CREATE POLICY "Allow authenticated users to update own veiculos"
    ON veiculos FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);
    RAISE NOTICE 'Política de UPDATE criada/atualizada.';
END $$ LANGUAGE plpgsql;

-- 6. CRIAR POLÍTICA DE DELETE (Exclusão)
DO $$ BEGIN
    DROP POLICY IF EXISTS "Allow authenticated users to delete own veiculos" ON veiculos;
    CREATE POLICY "Allow authenticated users to delete own veiculos"
    ON veiculos FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);
    RAISE NOTICE 'Política de DELETE criada/atualizada.';
END $$ LANGUAGE plpgsql;