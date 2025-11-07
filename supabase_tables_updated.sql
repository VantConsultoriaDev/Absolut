-- Tabela veiculos
CREATE TABLE IF NOT EXISTS public.veiculos (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    parceiro_id uuid REFERENCES public.parceiros(id) ON DELETE SET NULL,
    
    placa text,
    placa_cavalo text,
    placa_carreta text,
    placa_carreta1 text,
    placa_carreta2 text,
    placa_dolly text,
    
    modelo text,
    fabricante text,
    ano integer,
    capacidade integer,
    chassis text,
    carroceria text,
    tipo text NOT NULL, -- Ex: Truck, Cavalo, Carreta
    
    quantidade_carretas integer,
    possui_dolly boolean DEFAULT FALSE,
    motorista_vinculado uuid REFERENCES public.motoristas(id) ON DELETE SET NULL,
    
    -- Coluna para armazenar IDs de carretas vinculadas (para Cavalo)
    carretas_selecionadas text[], -- CORREÇÃO: Garantindo que esta coluna exista
    
    is_active boolean DEFAULT TRUE
);

-- Tabela permisso_internacional (Relacionamento 1:1 com Veiculo)
CREATE TABLE IF NOT EXISTS public.permisso_internacional (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    
    veiculo_id uuid UNIQUE REFERENCES public.veiculos(id) ON DELETE CASCADE,
    
    razao_social text NOT NULL,
    nome_fantasia text,
    cnpj text NOT NULL,
    endereco_completo text,
    data_consulta timestamp with time zone DEFAULT now(),
    simulado boolean DEFAULT FALSE
);

-- Adicionando trigger de updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_veiculos') THEN
        CREATE TRIGGER set_updated_at_veiculos
        BEFORE UPDATE ON public.veiculos
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_permisso') THEN
        CREATE TRIGGER set_updated_at_permisso
        BEFORE UPDATE ON public.permisso_internacional
        FOR EACH ROW
        EXECUTE FUNCTION public.set_updated_at();
    END IF;
END
$$;