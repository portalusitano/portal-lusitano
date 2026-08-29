-- Põe cavalos_venda no estado que o código espera (idempotente)
--
-- Porque é que este ficheiro existe
-- ---------------------------------
-- Nenhuma migração cria cavalos_venda: a tabela só é definida no script solto
-- supabase/NOVAS-FUNCIONALIDADES.sql, que traz 6 INSERT de exemplo SEM ON
-- CONFLICT — correr esse ficheiro numa base já povoada duplica os dados.
--
-- Além disso, as colunas de que o código depende chegam espalhadas por várias
-- migrações (views_count, verificação/ratings, planos de anúncio, RLS). Numa
-- base de dados onde essa cadeia não foi aplicada, o sintoma típico é:
--
--   ERROR: 42703: column "listing_tier" of relation "cavalos_venda" does not exist
--
-- e, pior, o webhook do Stripe passa a falhar a criar anúncios pagos, porque
-- escreve listing_tier, listing_expires_at e featured_until no INSERT.
--
-- Este ficheiro junta tudo isso num só sítio, sem nenhum INSERT de dados, e é
-- seguro correr as vezes que forem precisas: colunas com IF NOT EXISTS,
-- políticas recriadas com DROP ... IF EXISTS antes, constraint verificada antes
-- de ser adicionada. Numa base de dados já actualizada não faz nada.
--
-- Depois de correr este ficheiro, aplique a migração
-- supabase/migrations/20260829000001_cavalos_venda_user_id.sql, que acrescenta
-- a ligação ao utilizador (user_id) por cima deste estado.
--
-- Pré-requisito: a tabela coudelarias, referenciada por coudelaria_id.

-- =============================================================================
-- 1. Tabela base
-- =============================================================================
CREATE TABLE IF NOT EXISTS cavalos_venda (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    descricao TEXT,
    sexo VARCHAR(20) NOT NULL, -- macho, femea, castrado
    idade INTEGER, -- anos
    data_nascimento DATE,
    cor VARCHAR(100),
    altura DECIMAL(3, 2), -- em metros
    linhagem VARCHAR(255),
    pai VARCHAR(255),
    mae VARCHAR(255),
    nivel_treino VARCHAR(100), -- desbastado, iniciado, avancado, competicao
    disciplinas TEXT[], -- dressage, toureio, trabalho, lazer, alta_escola
    premios TEXT[],
    caracteristicas TEXT[],
    preco DECIMAL(12, 2),
    preco_negociavel BOOLEAN DEFAULT false,
    preco_sob_consulta BOOLEAN DEFAULT false,
    moeda VARCHAR(3) DEFAULT 'EUR',
    coudelaria_id UUID REFERENCES coudelarias(id),
    vendedor_nome VARCHAR(255),
    vendedor_telefone VARCHAR(50),
    vendedor_email VARCHAR(255),
    vendedor_whatsapp VARCHAR(50),
    localizacao VARCHAR(255),
    regiao VARCHAR(100),
    foto_principal VARCHAR(500),
    fotos TEXT[],
    video_url VARCHAR(500),
    registro_apsl VARCHAR(100), -- número de registro
    documentos_em_dia BOOLEAN DEFAULT true,
    aceita_troca BOOLEAN DEFAULT false,
    transporte_incluido BOOLEAN DEFAULT false,
    destaque BOOLEAN DEFAULT false,
    status VARCHAR(20) DEFAULT 'active', -- active, vendido, reservado, inativo
    views_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para cavalos
CREATE INDEX IF NOT EXISTS idx_cavalos_preco ON cavalos_venda(preco);
CREATE INDEX IF NOT EXISTS idx_cavalos_sexo ON cavalos_venda(sexo);
CREATE INDEX IF NOT EXISTS idx_cavalos_regiao ON cavalos_venda(regiao);
CREATE INDEX IF NOT EXISTS idx_cavalos_status ON cavalos_venda(status);
CREATE INDEX IF NOT EXISTS idx_cavalos_coudelaria ON cavalos_venda(coudelaria_id);


-- =============================================================================
-- 2. Contador de visualizações (de 20260206000001)
-- =============================================================================
ALTER TABLE cavalos_venda
  ADD COLUMN IF NOT EXISTS views_count INTEGER DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_cavalos_venda_views_count
  ON cavalos_venda (views_count DESC);

UPDATE cavalos_venda SET views_count = 0 WHERE views_count IS NULL;

-- =============================================================================
-- 3. Verificação de vendedor e ratings (de 20260301000002)
-- =============================================================================
ALTER TABLE cavalos_venda
  ADD COLUMN IF NOT EXISTS verificado BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verificado_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verificado_por TEXT,
  ADD COLUMN IF NOT EXISTS rating_media NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_vendas INTEGER DEFAULT 0;

CREATE TABLE IF NOT EXISTS seller_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cavalo_id uuid NOT NULL REFERENCES cavalos_venda(id) ON DELETE CASCADE,
  buyer_email text NOT NULL,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_seller_ratings_cavalo_id ON seller_ratings (cavalo_id);

ALTER TABLE seller_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "seller_ratings_select_public" ON seller_ratings;
CREATE POLICY "seller_ratings_select_public"
  ON seller_ratings FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "seller_ratings_insert_authenticated" ON seller_ratings;
CREATE POLICY "seller_ratings_insert_authenticated"
  ON seller_ratings FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "seller_ratings_service_role" ON seller_ratings;
CREATE POLICY "seller_ratings_service_role"
  ON seller_ratings
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 4. Planos de anúncio (de 20260301000003)
-- =============================================================================
-- Estas três colunas são escritas pelo webhook do Stripe. Sem elas, criar um
-- anúncio pago falha.
ALTER TABLE cavalos_venda
  ADD COLUMN IF NOT EXISTS listing_tier TEXT NOT NULL DEFAULT 'standard',
  ADD COLUMN IF NOT EXISTS listing_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS featured_until TIMESTAMPTZ;

-- ADD CONSTRAINT nao aceita IF NOT EXISTS, dai a verificacao explicita
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cavalos_venda_listing_tier_check'
      AND conrelid = 'public.cavalos_venda'::regclass
  ) THEN
    ALTER TABLE cavalos_venda
      ADD CONSTRAINT cavalos_venda_listing_tier_check
      CHECK (listing_tier IN ('basico', 'standard', 'destaque', 'premium'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_cavalos_venda_featured_until
  ON cavalos_venda (featured_until DESC)
  WHERE featured_until IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cavalos_venda_listing_expires_at
  ON cavalos_venda (listing_expires_at ASC)
  WHERE listing_expires_at IS NOT NULL;

-- =============================================================================
-- 5. RLS de base (de 20260301000001)
-- =============================================================================
-- A tabela guarda dados pessoais do vendedor (email, telefone, WhatsApp), por
-- isso o publico so pode ver anuncios activos.
ALTER TABLE cavalos_venda ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cavalos_venda_select_active" ON cavalos_venda;
CREATE POLICY "cavalos_venda_select_active"
  ON cavalos_venda FOR SELECT
  USING (status = 'active');

DROP POLICY IF EXISTS "cavalos_venda_service_role" ON cavalos_venda;
CREATE POLICY "cavalos_venda_service_role"
  ON cavalos_venda
  USING (auth.role() = 'service_role');
