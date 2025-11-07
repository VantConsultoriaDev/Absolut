-- Arquivo: supabase_rename_estado_to_uf.sql

-- Renomear coluna 'estado' para 'uf' na tabela 'clientes'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='clientes' AND column_name='estado') THEN
        ALTER TABLE public.clientes RENAME COLUMN estado TO uf;
        RAISE NOTICE 'Coluna estado renomeada para uf na tabela clientes.';
    ELSE
        RAISE NOTICE 'Coluna uf já existe ou estado não existe na tabela clientes. Nenhuma ação necessária.';
    END IF;
END
$$;

-- Renomear coluna 'estado' para 'uf' na tabela 'parceiros'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='parceiros' AND column_name='estado') THEN
        ALTER TABLE public.parceiros RENAME COLUMN estado TO uf;
        RAISE NOTICE 'Coluna estado renomeada para uf na tabela parceiros.';
    ELSE
        RAISE NOTICE 'Coluna uf já existe ou estado não existe na tabela parceiros. Nenhuma ação necessária.';
    END IF;
END
$$;