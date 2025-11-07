-- Adiciona a coluna nome_fantasia à tabela permisso_internacional
ALTER TABLE public.permisso_internacional
ADD COLUMN nome_fantasia character varying NULL;

-- Opcional: Atualiza a RLS se necessário (assumindo que a RLS existente já cobre a tabela)
-- Se você tiver RLS estrita, pode ser necessário um comando adicional, mas o ALTER TABLE é o principal.