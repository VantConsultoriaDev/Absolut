-- Criação das tabelas para o sistema Mobtax no Supabase
-- Execute este script no SQL Editor do Supabase

-- Tabela de usuários
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    name VARCHAR(255),
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'master', 'comum')),
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    permissions JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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

-- Tabela de motoristas
CREATE TABLE IF NOT EXISTS motoristas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parceiro_id UUID NOT NULL REFERENCES parceiros(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cpf VARCHAR(14) NOT NULL,
    cnh VARCHAR(20) NOT NULL,
    categoria_cnh VARCHAR(5),
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
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'pago', 'cancelado')),
    parceiro_id UUID REFERENCES parceiros(id),
    carga_id UUID,
    is_pago BOOLEAN DEFAULT false,
    observacoes TEXT,
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
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar foreign key para veiculo_vinculado em motoristas
ALTER TABLE motoristas 
ADD CONSTRAINT fk_motorista_veiculo 
FOREIGN KEY (veiculo_vinculado) REFERENCES veiculos(id);

-- Adicionar foreign key para motorista_vinculado em veiculos
ALTER TABLE veiculos 
ADD CONSTRAINT fk_veiculo_motorista 
FOREIGN KEY (motorista_vinculado) REFERENCES motoristas(id);

-- Adicionar foreign key para carga_id em movimentacoes_financeiras
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

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_parceiros_updated_at BEFORE UPDATE ON parceiros FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_motoristas_updated_at BEFORE UPDATE ON motoristas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_veiculos_updated_at BEFORE UPDATE ON veiculos FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_movimentacoes_updated_at BEFORE UPDATE ON movimentacoes_financeiras FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_cargas_updated_at BEFORE UPDATE ON cargas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir usuário administrador padrão (senha: admin123 - deve ser alterada)
INSERT INTO users (username, password_hash, email, name, role, is_active) 
VALUES ('admin', '$2b$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin@mobtax.com', 'Administrador Global', 'admin', true)
ON CONFLICT (username) DO NOTHING;

-- Habilitar RLS (Row Level Security) para todas as tabelas
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE parceiros ENABLE ROW LEVEL SECURITY;
ALTER TABLE motoristas ENABLE ROW LEVEL SECURITY;
ALTER TABLE veiculos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimentacoes_financeiras ENABLE ROW LEVEL SECURITY;
ALTER TABLE cargas ENABLE ROW LEVEL SECURITY;

-- Políticas básicas de RLS (ajustar conforme necessário)
-- Permitir acesso total para usuários autenticados (simplificado)
CREATE POLICY "Enable all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON parceiros FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON motoristas FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON veiculos FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON movimentacoes_financeiras FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Enable all for authenticated users" ON cargas FOR ALL USING (auth.role() = 'authenticated');