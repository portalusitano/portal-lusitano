-- Migration: Mensagens entre comprador e vendedor no marketplace
-- Data: 2026-08-29
--
-- Até aqui, contactar um vendedor obrigava a expor publicamente o telemóvel, o
-- WhatsApp e o email dele na página do anúncio. Isso é um convite ao scraping e
-- tira o negócio do site logo no primeiro contacto.
--
-- Estas duas tabelas guardam a conversa dentro da plataforma. Os contactos
-- directos continuam a existir como alternativa, mas deixam de ser o único
-- caminho.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
-- A conversa aponta para o anúncio e usa cavalos_venda.user_id para saber quem
-- é o vendedor, por isso a migração 20260829000001 tem de estar aplicada.
DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe. Corra supabase/cavalos-venda-bootstrap.sql e a migracao 20260829000001 antes desta.';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'cavalos_venda' AND column_name = 'user_id'
  ) THEN
    RAISE EXCEPTION
      'A coluna cavalos_venda.user_id nao existe. Aplique primeiro a migracao 20260829000001_cavalos_venda_user_id.sql.';
  END IF;
END $$;

-- =============================================================================
-- 1. Conversas
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketplace_conversas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- ON DELETE CASCADE: removido o anúncio, a conversa deixa de ter contexto.
  cavalo_id UUID NOT NULL REFERENCES cavalos_venda(id) ON DELETE CASCADE,

  comprador_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  vendedor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Nome do comprador no momento do primeiro contacto. Guardado aqui para a
  -- caixa de entrada do vendedor não ter de ler auth.users a cada carregamento
  -- (uma leitura por conversa). O lado do vendedor sai de cavalos_venda.
  comprador_nome TEXT,

  -- Desnormalizado a partir da última mensagem, para ordenar a caixa de entrada
  -- sem ter de agregar a tabela de mensagens a cada leitura.
  ultima_mensagem_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Arquivar é por pessoa: esconder a conversa de um lado não a esconde do outro.
  arquivada_comprador BOOLEAN NOT NULL DEFAULT false,
  arquivada_vendedor BOOLEAN NOT NULL DEFAULT false,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Uma única conversa por comprador e anúncio: voltar a contactar continua o
  -- mesmo fio em vez de criar um novo.
  CONSTRAINT marketplace_conversas_unica UNIQUE (cavalo_id, comprador_id),

  -- Ninguém conversa consigo próprio (o dono a ver o próprio anúncio).
  CONSTRAINT marketplace_conversas_partes_distintas CHECK (comprador_id <> vendedor_id)
);

-- Caixa de entrada de cada lado, já ordenada
CREATE INDEX IF NOT EXISTS idx_conversas_vendedor
  ON marketplace_conversas (vendedor_id, ultima_mensagem_at DESC);

CREATE INDEX IF NOT EXISTS idx_conversas_comprador
  ON marketplace_conversas (comprador_id, ultima_mensagem_at DESC);

-- Conversas de um anúncio (usado ao mostrar o interesse gerado)
CREATE INDEX IF NOT EXISTS idx_conversas_cavalo
  ON marketplace_conversas (cavalo_id);

-- =============================================================================
-- 2. Mensagens
-- =============================================================================
CREATE TABLE IF NOT EXISTS marketplace_mensagens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversa_id UUID NOT NULL REFERENCES marketplace_conversas(id) ON DELETE CASCADE,
  remetente_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Limite imposto também na base de dados: a API valida, mas a API não é o
  -- único caminho até aqui.
  corpo TEXT NOT NULL CHECK (char_length(trim(corpo)) BETWEEN 1 AND 4000),

  -- Nulo enquanto o destinatário não abrir a conversa.
  lida_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Leitura de um fio por ordem cronológica
CREATE INDEX IF NOT EXISTS idx_mensagens_conversa
  ON marketplace_mensagens (conversa_id, created_at ASC);

-- Contagem de não lidas por conversa
CREATE INDEX IF NOT EXISTS idx_mensagens_por_ler
  ON marketplace_mensagens (conversa_id, remetente_id)
  WHERE lida_at IS NULL;

-- =============================================================================
-- 3. RLS
-- =============================================================================
-- As rotas da API usam a service role e filtram por participante em cada query.
-- Estas políticas são a segunda linha: se alguma leitura passar pela chave
-- anónima, continua a ser impossível ler a conversa de outra pessoa.
ALTER TABLE marketplace_conversas ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_mensagens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "conversas_select_participante" ON marketplace_conversas;
CREATE POLICY "conversas_select_participante"
  ON marketplace_conversas FOR SELECT
  USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

DROP POLICY IF EXISTS "conversas_update_participante" ON marketplace_conversas;
CREATE POLICY "conversas_update_participante"
  ON marketplace_conversas FOR UPDATE
  USING (auth.uid() = comprador_id OR auth.uid() = vendedor_id)
  WITH CHECK (auth.uid() = comprador_id OR auth.uid() = vendedor_id);

DROP POLICY IF EXISTS "conversas_service_role" ON marketplace_conversas;
CREATE POLICY "conversas_service_role"
  ON marketplace_conversas
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "mensagens_select_participante" ON marketplace_mensagens;
CREATE POLICY "mensagens_select_participante"
  ON marketplace_mensagens FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM marketplace_conversas c
    WHERE c.id = marketplace_mensagens.conversa_id
      AND (auth.uid() = c.comprador_id OR auth.uid() = c.vendedor_id)
  ));

-- Só se pode escrever em nome próprio e dentro de uma conversa de que se faz parte
DROP POLICY IF EXISTS "mensagens_insert_participante" ON marketplace_mensagens;
CREATE POLICY "mensagens_insert_participante"
  ON marketplace_mensagens FOR INSERT
  WITH CHECK (
    auth.uid() = remetente_id
    AND EXISTS (
      SELECT 1 FROM marketplace_conversas c
      WHERE c.id = marketplace_mensagens.conversa_id
        AND (auth.uid() = c.comprador_id OR auth.uid() = c.vendedor_id)
    )
  );

DROP POLICY IF EXISTS "mensagens_service_role" ON marketplace_mensagens;
CREATE POLICY "mensagens_service_role"
  ON marketplace_mensagens
  USING (auth.role() = 'service_role');

-- Nota: não há política de DELETE. Apagar uma mensagem já entregue reescreveria
-- o histórico da outra pessoa; esconder a conversa faz-se com arquivada_*.
