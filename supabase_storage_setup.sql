-- 1. Criar o bucket 'avatares' se ele não existir
-- O campo 'public' deve ser true para que as imagens sejam acessíveis via URL pública
INSERT INTO storage.buckets (id, name, public)
VALUES ('avatares', 'avatares', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Política para permitir que usuários autenticados façam upload (INSERT)
-- Permite que qualquer usuário autenticado insira um arquivo no bucket 'avatares'
-- Nota: Se esta política já existir, a execução falhará.
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to upload avatars"
    ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'avatares');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 3. Política para permitir que todos leiam (SELECT)
-- Permite que qualquer pessoa (público) leia arquivos no bucket 'avatares'
DO $$ BEGIN
    CREATE POLICY "Allow public read access to avatars"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'avatares');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 4. Política para permitir que usuários autenticados atualizem/substituam seus próprios avatares (UPDATE)
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to update avatars"
    ON storage.objects FOR UPDATE TO authenticated
    USING (bucket_id = 'avatares');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 5. Política para permitir que usuários autenticados deletem (DELETE)
DO $$ BEGIN
    CREATE POLICY "Allow authenticated users to delete avatars"
    ON storage.objects FOR DELETE TO authenticated
    USING (bucket_id = 'avatares');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;