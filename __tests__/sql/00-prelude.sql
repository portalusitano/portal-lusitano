-- Reprodução mínima do que a Supabase põe por baixo das nossas migrações:
-- os papéis, o esquema auth, auth.uid()/auth.role() tal como lá estão
-- definidos, e a tabela do anúncio de que a migração do chat depende.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE SCHEMA IF NOT EXISTS auth;
CREATE TABLE IF NOT EXISTS auth.users (id UUID PRIMARY KEY, email TEXT);

-- Tal como na Supabase: o sujeito sai de request.jwt.claims (o JSON inteiro),
-- que é o que o Realtime escreve antes de avaliar a política de cada
-- subscritor.
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json->>'sub',
    nullif(current_setting('request.jwt.claim.sub', true), '')
  )::uuid;
$$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$
  SELECT coalesce(
    nullif(current_setting('request.jwt.claims', true), '')::json->>'role',
    nullif(current_setting('request.jwt.claim.role', true), ''),
    current_user
  );
$$;

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT SELECT ON auth.users TO authenticated;

-- Substituto de cavalos_venda: as colunas que a migração do chat exige, mais
-- as três de contacto, que existem na verdadeira e que o chat nunca pode
-- devolver.
CREATE TABLE IF NOT EXISTS public.cavalos_venda (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  nome TEXT,
  vendedor_telefone TEXT,
  vendedor_email TEXT,
  vendedor_whatsapp TEXT
);
