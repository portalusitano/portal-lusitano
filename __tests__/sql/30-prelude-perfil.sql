-- O que a Supabase põe por baixo da migração do perfil, e que o
-- `00-prelude.sql` ainda não punha: o esquema de armazenamento.
--
-- Sem isto, o bloco do balde na migração salta (diz que saltou, de propósito) e
-- as políticas que decidem quem pode escrever a fotografia de quem **nunca são
-- exercitadas**. Um teste que não corre a parte perigosa é um teste que se
-- finge verde — a mesma regra que o `chat-rls.sql.test.ts` já escreve para o
-- caso de não haver PostgreSQL.
--
-- É um substituto, e diz-se o que ele substitui: `storage.objects` tem na
-- Supabase muito mais colunas do que estas, e o serviço de armazenamento não é
-- o Postgres. O que aqui se reproduz é exactamente a superfície de que as
-- políticas dependem — `bucket_id`, `name`, e a `storage.foldername()`, que
-- está copiada da definição da Supabase (parte o caminho por `/` e devolve
-- tudo menos o último segmento).

-- O `00-prelude.sql` dá a `auth.users` as duas colunas de que o chat precisa. O
-- gatilho `handle_new_user` lê uma terceira, que a Supabase põe lá e que o
-- registo preenche com o que vem do formulário.
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS raw_user_meta_data JSONB;

CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  public BOOLEAN DEFAULT FALSE,
  file_size_limit BIGINT,
  allowed_mime_types TEXT[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id TEXT REFERENCES storage.buckets(id),
  name TEXT,
  owner UUID
);

ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION storage.foldername(name TEXT)
RETURNS TEXT[] LANGUAGE plpgsql AS $$
DECLARE
  _parts TEXT[];
BEGIN
  SELECT string_to_array(name, '/') INTO _parts;
  RETURN _parts[1 : array_length(_parts, 1) - 1];
END $$;

GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;
GRANT SELECT ON storage.buckets TO anon, authenticated;

-- Os privilégios de tabela **como a Supabase os dá por omissão** a `anon` e a
-- `authenticated` em tudo o que nasce no `public`. Sem eles a negação viria do
-- GRANT que nunca existiu, e não da migração — a prova seria vazia e diria o
-- contrário do que parece dizer.
--
-- É por isso que isto corre **antes** da migração: o que se está a provar é
-- que ela tira o que a Supabase tinha dado.
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_profiles TO anon;
