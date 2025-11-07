-- Arquivo: supabase_alter_cargas_v2.sql

-- 1. Adicionar colunas à tabela 'cargas' para suportar transbordo, trajetos e tipo de operação

ALTER TABLE public.cargas
ADD COLUMN IF NOT EXISTS transbordo TEXT NOT NULL DEFAULT 'sem_transbordo',
ADD COLUMN IF NOT EXISTS trajetos JSONB NOT NULL DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS tipo_operacao TEXT NOT NULL DEFAULT 'exportacao';

-- Opcional: Atualizar dados existentes para preencher a coluna 'trajetos'
-- Se a carga não tiver trajetos (dados antigos), cria um trajeto único a partir dos campos de carga existentes.
UPDATE public.cargas
SET
    transbordo = 'sem_transbordo',
    tipo_operacao = 'exportacao',
    trajetos = jsonb_build_array(
        jsonb_build_object(
            'index', 1,
            -- Assumindo que a UF e Cidade foram salvas no formato 'Cidade - UF'
            'ufOrigem', split_part(origem, ' - ', 2),
            'cidadeOrigem', split_part(origem, ' - ', 1),
            'ufDestino', split_part(destino, ' - ', 2),
            'cidadeDestino', split_part(destino, ' - ', 1),
            'valor', valor,
            -- Converte datas para string YYYY-MM-DD
            'dataColeta', to_char(data_coleta, 'YYYY-MM-DD'),
            'dataEntrega', to_char(data_entrega, 'YYYY-MM-DD')
        )
    )
WHERE
    trajetos IS NULL OR jsonb_array_length(trajetos) = 0;

-- 2. Adicionar coluna 'trajeto_index' à tabela 'movimentacoes_financeiras'
-- Esta coluna é usada para vincular uma movimentação a um trajeto específico dentro de uma carga.

ALTER TABLE public.movimentacoes_financeiras
ADD COLUMN IF NOT EXISTS trajeto_index INTEGER;