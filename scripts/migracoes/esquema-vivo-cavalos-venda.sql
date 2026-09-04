-- Réplica do esquema de `cavalos_venda` tal como a base viva o tinha em
-- **2026-09-02**, lida de `information_schema.columns` e não escrita à mão.
--
-- Serve um propósito só: dar a `scripts/migracoes/validar.sh` um chão igual ao
-- de produção onde correr uma migração antes de ela entrar no repositório, como
-- o `CLAUDE.md` exige. Não é uma migração e não corre em lado nenhum a não ser
-- numa base descartável.
--
-- **Não é autoridade sobre nada.** É uma fotografia com data. Quando a base
-- mudar, esta fotografia fica velha, e a maneira de a renovar é voltar a lê-la
-- de `information_schema` — nunca acrescentar-lhe uma coluna à mão para o
-- teste passar.
--
-- As duas funções de `auth` são bonecos: o Supabase tem-nas e um Postgres
-- limpo não, e sem elas as políticas de RLS da migração não compilam. Devolvem
-- valores que não deixam ninguém ver nada, o que é o lado certo para um boneco.

CREATE SCHEMA IF NOT EXISTS auth;
CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT NULL::uuid $$;
CREATE OR REPLACE FUNCTION auth.role() RETURNS text LANGUAGE sql STABLE AS $$ SELECT 'anon'::text $$;

CREATE TABLE public.cavalos_venda (
  id uuid DEFAULT gen_random_uuid() NOT NULL,
  nome varchar(255) NOT NULL,
  slug varchar(255) NOT NULL,
  descricao text,
  sexo varchar(20) NOT NULL,
  idade integer,
  data_nascimento date,
  cor varchar(100),
  altura numeric(3,2),
  linhagem varchar(255),
  pai varchar(255),
  mae varchar(255),
  nivel_treino varchar(100),
  disciplinas text[],
  premios text[],
  caracteristicas text[],
  preco numeric(12,2),
  preco_negociavel boolean DEFAULT false,
  preco_sob_consulta boolean DEFAULT false,
  moeda varchar(3) DEFAULT 'EUR'::character varying,
  coudelaria_id uuid,
  vendedor_nome varchar(255),
  vendedor_telefone varchar(50),
  vendedor_email varchar(255),
  vendedor_whatsapp varchar(50),
  localizacao varchar(255),
  regiao varchar(100),
  foto_principal varchar(500),
  fotos text[],
  video_url varchar(500),
  registro_apsl varchar(100),
  documentos_em_dia boolean DEFAULT true,
  aceita_troca boolean DEFAULT false,
  transporte_incluido boolean DEFAULT false,
  destaque boolean DEFAULT false,
  status varchar(20) DEFAULT 'active'::character varying,
  views_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid,
  vendido_at timestamptz,
  removido_at timestamptz,
  verificado boolean DEFAULT false,
  verificado_at timestamptz,
  verificado_por text,
  rating_media numeric DEFAULT 0,
  total_vendas integer DEFAULT 0,
  listing_tier text DEFAULT 'standard'::text NOT NULL,
  listing_expires_at timestamptz,
  featured_until timestamptz,
  aviso_expiracao_dias smallint,
  aviso_expiracao_prazo timestamptz,
  aviso_expiracao_at timestamptz,
  PRIMARY KEY (id)
);
ALTER TABLE public.cavalos_venda ENABLE ROW LEVEL SECURITY;
CREATE POLICY cavalos_venda_select_active ON public.cavalos_venda FOR SELECT USING (status = 'active');

-- ---------------------------------------------------------------------------
-- `storage`, o mínimo — bonecos, como as duas funções de `auth` acima
-- ---------------------------------------------------------------------------
--
-- O Supabase traz este esquema; um PostgreSQL limpo não. Sem ele, a migração
-- que cria o balde privado dos documentos (`20260904000002_documentos_cavalo`)
-- morre na primeira linha e nunca se chega a saber se a tabela que vem a
-- seguir está bem escrita.
--
-- Estão aqui as colunas que as migrações deste repositório tocam, e mais
-- nenhuma. **Não é uma réplica do `storage` do Supabase** e não serve para
-- provar nada sobre o comportamento dele: o que se prova com estes bonecos é
-- que o SQL da migração compila e corre três vezes, não que o balde fica com
-- as permissões certas — isso só a base viva o diz.
--
-- `storage.objects` existe por causa do `drop policy ... on storage.objects`
-- que a migração dos documentos faz para limpar tentativas anteriores: um
-- `drop policy` precisa da tabela mesmo quando não há política nenhuma para
-- apagar.

CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text NOT NULL PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid DEFAULT gen_random_uuid() NOT NULL PRIMARY KEY,
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  metadata jsonb
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
