-- 1. REMOVER CHAVE ESTRANGEIRA PROBLEMÁTICA (se existir)
-- Tenta remover a constraint fk_veiculo_motorista para evitar conflito de tipo.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'fk_veiculo_motorista'
    ) THEN
        ALTER TABLE veiculos DROP CONSTRAINT fk_veiculo_motorista;
        RAISE NOTICE 'Constraint fk_veiculo_motorista removida.';
    END IF;
END
$$ LANGUAGE plpgsql;

-- 2. ALTERAR O TIPO DA COLUNA motorista_vinculado para UUID
-- Se a coluna tiver dados TEXT inválidos, isso pode falhar.
-- Se falhar, você pode precisar limpar os dados primeiro (SET motorista_vinculado = NULL).
ALTER TABLE veiculos
ALTER COLUMN motorista_vinculado TYPE uuid USING motorista_vinculado::uuid;

-- 3. RECRIAR A CHAVE ESTRANGEIRA (Assumindo que aponta para motoristas)
-- Se a tabela motoristas não existir, esta etapa falhará.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_name = 'motoristas'
    ) THEN
        ALTER TABLE veiculos
        ADD CONSTRAINT fk_veiculo_motorista
        FOREIGN KEY (motorista_vinculado)
        REFERENCES motoristas(id);
        RAISE NOTICE 'Constraint fk_veiculo_motorista recriada com sucesso.';
    ELSE
        RAISE NOTICE 'Tabela motoristas não encontrada. Chave estrangeira não recriada.';
    END IF;
END
$$ LANGUAGE plpgsql;

-- 4. GARANTIR QUE AS COLUNAS DE DATA SEJAM ATUALIZADAS (do script anterior)
-- Isso garante que as colunas de data e o trigger estejam corretos.
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'user_id') THEN
        ALTER TABLE veiculos ADD COLUMN user_id uuid REFERENCES auth.users;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'created_at') THEN
        ALTER TABLE veiculos ADD COLUMN created_at timestamp with time zone DEFAULT now();
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'veiculos' AND column_name = 'updated_at') THEN
        ALTER TABLE veiculos ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$ LANGUAGE plpgsql;

-- 5. TRIGGER para atualizar 'updated_at' automaticamente (reaplicado)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS set_veiculos_updated_at ON veiculos;
CREATE TRIGGER set_veiculos_updated_at
BEFORE UPDATE ON veiculos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();