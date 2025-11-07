-- Adiciona as colunas de PIX à tabela 'parceiros'
-- Estas colunas são necessárias para sincronização após a atualização do esquema local.

ALTER TABLE public.parceiros
ADD COLUMN IF NOT EXISTS pix_key_type text NULL,
ADD COLUMN IF NOT EXISTS pix_key text NULL,
ADD COLUMN IF NOT EXISTS pix_titular text NULL;

-- Opcional: Adicionar RLS para as novas colunas se necessário, mas o RLS existente deve cobrir.
-- Se você tiver RLS ativo, certifique-se de que as políticas de UPDATE e INSERT permitam o acesso a estas novas colunas.
-- Exemplo (se a política for baseada em user_id):
-- ALTER POLICY "Enable insert for authenticated users" ON public.parceiros
-- USING (auth.uid() = user_id);
-- ALTER POLICY "Enable update for authenticated users" ON public.parceiros
-- USING (auth.uid() = user_id);

-- Confirmação
SELECT 'Colunas PIX adicionadas à tabela parceiros.' AS status;