-- Criação das tabelas para o sistema Mobtax no Supabase
-- Execute este script no SQL Editor do Supabase

-- Extensão para gen_random_uuid (necessária para DEFAULT gen_random_uuid())
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Tabela de usuários removida (usando auth.users do Supabase)

-- Tabela de parceiros
CREATE TABLE IF NOT EXISTS parceiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(2) NOT NULL CHECK (tipo IN ('PF', 'PJ')),
    nome VARCHAR(255),
    documento VARCHAR(20),
    cnh VARCHAR(20),
    email VARCHAR(255),
    telefone VARCHAR(20),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(2),
    cep VARCHAR(10),
    observacoes TEXT,
    is_motorista BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de clientes
CREATE TABLE IF NOT EXISTS clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(20),
    nome VARCHAR(255),
    documento VARCHAR(30),
    email VARCHAR(255),
    telefone VARCHAR(30),
    endereco TEXT,
    cidade VARCHAR(100),
    estado VARCHAR(10),
    cep VARCHAR(20),
    observacoes TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    user_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de motoristas
CREATE TABLE IF NOT EXISTS motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    cnh VARCHAR(20) NOT NULL,
    categoria_cnh VARCHAR(5),
    nacionalidade VARCHAR(50),
    validade_cnh DATE,
    telefone VARCHAR(20),
    veiculo_vinculado UUID,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de veículos
CREATE TABLE IF NOT EXISTS veiculos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
    placa VARCHAR(8),
    placa_cavalo VARCHAR(8),
    placa_carreta VARCHAR(8),
    placa_carreta1 VARCHAR(8),
    placa_carreta2 VARCHAR(8),
    placa_dolly VARCHAR(8),
    modelo VARCHAR(100),
    fabricante VARCHAR(100),
    ano INTEGER,
    capacidade DECIMAL(10,2),
    chassis VARCHAR(50),
    carroceria VARCHAR(100),
    tipo VARCHAR(50) NOT NULL,
    quantidade_carretas INTEGER DEFAULT 0,
    possui_dolly BOOLEAN DEFAULT false,
    motorista_vinculado UUID,
    carretas_selecionadas UUID[] DEFAULT ARRAY[]::UUID[],
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de movimentações financeiras
CREATE TABLE IF NOT EXISTS movimentacoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tipo VARCHAR(10) NOT NULL CHECK (tipo IN ('receita', 'despesa')),
    valor DECIMAL(15,2) NOT NULL,
    descricao TEXT NOT NULL,
    categoria VARCHAR(100),
    data DATE NOT NULL,
    data_pagamento DATE,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    parceiro_id UUID REFERENCES parceiros(id),
    carga_id UUID,
    is_pago BOOLEAN DEFAULT false,
    observacoes TEXT,
    comprovante_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela de cargas
CREATE TABLE IF NOT EXISTS cargas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crt VARCHAR(50),
    descricao TEXT,
    origem VARCHAR(255) NOT NULL,
    destino VARCHAR(255) NOT NULL,
    peso DECIMAL(10,2),
    valor DECIMAL(15,2),
    data_coleta DATE,
    data_entrega DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'a_coletar' CHECK (status IN ('entregue', 'em_transito', 'a_coletar', 'armazenada', 'cancelada')),
    parceiro_id UUID REFERENCES parceiros(id),
    motorista_id UUID REFERENCES motoristas(id),
    veiculo_id UUID REFERENCES veiculos(id),
    observacoes TEXT,
    carretas_selecionadas UUID[] DEFAULT ARRAY[]::UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key para veiculo_vinculado em motoristas
-- Normalização de tipos antes de criar FKs (caso schema existente tenha TEXT)
ALTER TABLE motoristas DROP CONSTRAINT IF EXISTS fk_motorista_veiculo;
ALTER TABLE veiculos DROP CONSTRAINT IF EXISTS fk_veiculo_motorista;
-- Converte colunas para UUID de forma segura (vazio vira NULL)
ALTER TABLE motoristas
  ALTER COLUMN veiculo_vinculado TYPE UUID USING (
    CASE
      WHEN veiculo_vinculado IS NULL THEN NULL
      WHEN CAST(veiculo_vinculado AS TEXT) ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN CAST(veiculo_vinculado AS UUID)
      ELSE NULL
    END
  );
ALTER TABLE veiculos
  ALTER COLUMN motorista_vinculado TYPE UUID USING (
    CASE
      WHEN motorista_vinculado IS NULL THEN NULL
      WHEN CAST(motorista_vinculado AS TEXT) ~* '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$' THEN CAST(motorista_vinculado AS UUID)
      ELSE NULL
    END
  );

-- Recria as FKs com tipos compatíveis
ALTER TABLE motoristas 
  ADD CONSTRAINT fk_motorista_veiculo 
  FOREIGN KEY (veiculo_vinculado) REFERENCES veiculos(id);

-- Adicionar foreign key para motorista_vinculado em veiculos
ALTER TABLE veiculos 
  ADD CONSTRAINT fk_veiculo_motorista 
  FOREIGN KEY (motorista_vinculado) REFERENCES motoristas(id);

-- Criar tabela de Permisso Internacional (se não existir)
CREATE TABLE IF NOT EXISTS permisso_internacional (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    veiculo_id UUID REFERENCES veiculos(id) ON DELETE CASCADE,
    razao_social TEXT,
    nome_fantasia TEXT,
    cnpj VARCHAR(20),
    endereco_completo TEXT,
    data_consulta TIMESTAMP WITH TIME ZONE,
    simulado BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key para carga_id em movimentacoes_financeiras
ALTER TABLE movimentacoes_financeiras 
  DROP CONSTRAINT IF EXISTS fk_movimentacao_carga;
ALTER TABLE movimentacoes_financeiras 
  ADD CONSTRAINT fk_movimentacao_carga 
  FOREIGN KEY (carga_id) REFERENCES cargas(id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_parceiros_documento ON parceiros(documento);
CREATE INDEX IF NOT EXISTS idx_parceiros_tipo ON parceiros(tipo);
CREATE INDEX IF NOT EXISTS idx_motoristas_parceiro ON motoristas(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_motoristas_cpf ON motoristas(cpf);
CREATE INDEX IF NOT EXISTS idx_veiculos_parceiro ON veiculos(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_placa ON veiculos(placa);
CREATE INDEX IF NOT EXISTS idx_cargas_status ON cargas(status);
CREATE INDEX IF NOT EXISTS idx_cargas_parceiro ON cargas(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_tipo ON movimentacoes_financeiras(tipo);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_data ON movimentacoes_financeiras(data);

-- Criar triggers para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Bloco de trigger para users removido (usando auth.users do Supabase)

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='parceiros'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_parceiros_updated_at ON parceiros';
    EXECUTE 'CREATE TRIGGER update_parceiros_updated_at BEFORE UPDATE ON parceiros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='motoristas'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_motoristas_updated_at ON motoristas';
    EXECUTE 'CREATE TRIGGER update_motoristas_updated_at BEFORE UPDATE ON motoristas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='veiculos'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_veiculos_updated_at ON veiculos';
    EXECUTE 'CREATE TRIGGER update_veiculos_updated_at BEFORE UPDATE ON veiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='movimentacoes_financeiras'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_movimentacoes_updated_at ON movimentacoes_financeiras';
    EXECUTE 'CREATE TRIGGER update_movimentacoes_updated_at BEFORE UPDATE ON movimentacoes_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='cargas'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_cargas_updated_at ON cargas';
    EXECUTE 'CREATE TRIGGER update_cargas_updated_at BEFORE UPDATE ON cargas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='permisso_internacional'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_permisso_internacional_updated_at ON permisso_internacional';
    EXECUTE 'CREATE TRIGGER update_permisso_internacional_updated_at BEFORE UPDATE ON permisso_internacional FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- Inserção de usuário administrador local removida.

-- Habilitar RLS (Row Level Security) para todas as tabelas
-- ALTER TABLE users ENABLE ROW LEVEL SECURITY; -- removido
ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE permisso_internacional ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS (ajustar conforme necessário)
-- Permitir acesso total para usuários autenticados (simplificado)
-- CREATE POLICY "Enable all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated'); -- removido
DROP POLICY IF EXISTS "Enable all for authenticated users" ON parceiros;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON motoristas;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON veiculos;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON movimentacoes_financeiras;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON cargas;
DROP POLICY IF EXISTS "Enable all for authenticated users" ON permisso_internacional;
CREATE POLICY "Enable all for authenticated users" ON parceiros FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON motoristas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON veiculos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON movimentacoes_financeiras FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON cargas FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON permisso_internacional FOR SELECT USING (auth.role() = 'authenticated');

-- Tabela de contratos de frete (necessária para sincronização de contratos)
CREATE TABLE IF NOT EXISTS contratos_frete (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID, -- opcional, usado para filtrar por usuário
    carga_id UUID REFERENCES cargas(id) ON DELETE CASCADE,
    pdf_url TEXT,
    motorista_nome VARCHAR(255),
    parceiro_nome VARCHAR(255),
    crt VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para contratos_frete
ALTER TABLE contratos_frete ENABLE ROW LEVEL SECURITY;
-- Política simples (igual às demais); restringida a SELECT e idempotente
DROP POLICY IF EXISTS "Enable all for authenticated users" ON contratos_frete;
CREATE POLICY "Enable all for authenticated users" ON contratos_frete FOR SELECT USING (auth.role() = 'authenticated');

-- Trigger para atualizar updated_at
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema='public' AND table_name='contratos_frete'
  ) THEN
    EXECUTE 'DROP TRIGGER IF EXISTS update_contratos_frete_updated_at ON contratos_frete';
    EXECUTE 'CREATE TRIGGER update_contratos_frete_updated_at BEFORE UPDATE ON contratos_frete FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- Criar bucket de Storage para salvar PDFs de contratos
-- Torna o bucket público para que os PDFs possam ser acessados via URL pública
DO $$ BEGIN
  -- Cria bucket público 'contratos' apenas se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'contratos'
  ) THEN
    PERFORM storage.create_bucket('contratos', true);
  END IF;
END $$;

-- Adicionar coluna user_id às tabelas principais para escopo por usuário (se não existir)
ALTER TABLE clientes ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE parceiros ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE motoristas ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE veiculos ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE movimentacoes_financeiras ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE cargas ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE permisso_internacional ADD COLUMN IF NOT EXISTS user_id UUID;

-- Índices para user_id (melhorar filtros por usuário)
CREATE INDEX IF NOT EXISTS idx_clientes_user_id ON clientes(user_id);
CREATE INDEX IF NOT EXISTS idx_parceiros_user_id ON parceiros(user_id);
CREATE INDEX IF NOT EXISTS idx_motoristas_user_id ON motoristas(user_id);
CREATE INDEX IF NOT EXISTS idx_veiculos_user_id ON veiculos(user_id);
CREATE INDEX IF NOT EXISTS idx_movimentacoes_user_id ON movimentacoes_financeiras(user_id);
CREATE INDEX IF NOT EXISTS idx_cargas_user_id ON cargas(user_id);
CREATE INDEX IF NOT EXISTS idx_permisso_user_id ON permisso_internacional(user_id);
CREATE INDEX IF NOT EXISTS idx_contratos_user_id ON contratos_frete(user_id);

-- Políticas de proprietário (user_id) com WITH CHECK para INSERT/UPDATE
DROP POLICY IF EXISTS "Owner access clientes" ON clientes;
CREATE POLICY "Owner access clientes" ON clientes FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner access parceiros" ON parceiros;
CREATE POLICY "Owner access parceiros" ON parceiros FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner access motoristas" ON motoristas;
CREATE POLICY "Owner access motoristas" ON motoristas FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner access veiculos" ON veiculos;
CREATE POLICY "Owner access veiculos" ON veiculos FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner access movimentacoes" ON movimentacoes_financeiras;
CREATE POLICY "Owner access movimentacoes" ON movimentacoes_financeiras FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner access cargas" ON cargas;
CREATE POLICY "Owner access cargas" ON cargas FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner access permisso" ON permisso_internacional;
CREATE POLICY "Owner access permisso" ON permisso_internacional FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "Owner access contratos" ON contratos_frete;
CREATE POLICY "Owner access contratos" ON contratos_frete FOR ALL
  USING (user_id = auth.uid() OR user_id IS NULL) WITH CHECK (user_id = auth.uid());

-- Criar bucket de Storage para salvar comprovantes (imagens/PDFs)
DO $$ BEGIN
  -- Cria bucket público 'comprovantes' apenas se ainda não existir
  IF NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE name = 'comprovantes'
  ) THEN
    PERFORM storage.create_bucket('comprovantes', true);
  END IF;
END $$;

-- Adicionar coluna comprovante_url à tabela de movimentações (idempotente)
ALTER TABLE movimentacoes_financeiras ADD COLUMN IF NOT EXISTS comprovante_url TEXT;