-- Adiciona as novas colunas à tabela 'clientes'
ALTER TABLE clientes
ADD COLUMN responsavel TEXT,
ADD COLUMN numero TEXT,
ADD COLUMN complemento TEXT;

-- Adiciona as novas colunas à tabela 'parceiros'
ALTER TABLE parceiros
ADD COLUMN responsavel TEXT,
ADD COLUMN numero TEXT,
ADD COLUMN complemento TEXT;

-- Opcional: Se você estiver usando RLS, pode ser necessário atualizar as políticas
-- para permitir que os usuários insiram/atualizem essas novas colunas.
-- Exemplo (se a política for baseada em user_id):
-- ALTER POLICY "Enable insert for authenticated users" ON "public"."clientes"
-- USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
-- ALTER POLICY "Enable update for authenticated users" ON "public"."clientes"
-- USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);