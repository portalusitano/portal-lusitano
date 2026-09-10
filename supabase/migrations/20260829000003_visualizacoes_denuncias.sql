-- Migration: Visualizações fiáveis e denúncia de anúncios
-- Data: 2026-08-29
--
-- Duas lacunas do marketplace:
--
-- 1. cavalos_venda.views_count existe desde 20260206000001 mas nunca é
--    incrementado para cavalos (só os eventos o fazem). O vendedor paga o
--    anúncio e o único indicador de retorno que recebe está sempre a zero.
--
-- 2. Não há forma de denunciar um anúncio. Num classificados aberto ao público
--    isso é o mínimo de segurança: fraudes, cavalos já vendidos que continuam
--    publicados, dados falsos.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe. Corra supabase/cavalos-venda-bootstrap.sql antes desta migracao.';
  END IF;
END $$;

-- =============================================================================
-- 1. Visualizações
-- =============================================================================
-- Uma linha por visitante e por dia. Sem esta desduplicação, o contador conta
-- refrescamentos e o vendedor recebe um número inflacionado, que é pior do que
-- não ter número nenhum.
--
-- visitante_hash é um resumo do IP com o agente do utilizador e um sal diário,
-- calculado na aplicação. O IP em bruto nunca chega aqui, e o sal diário impede
-- que o mesmo visitante seja seguido de um dia para o outro.
CREATE TABLE IF NOT EXISTS cavalos_venda_visualizacoes (
  cavalo_id UUID NOT NULL REFERENCES cavalos_venda(id) ON DELETE CASCADE,
  visitante_hash TEXT NOT NULL,
  dia DATE NOT NULL DEFAULT current_date,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (cavalo_id, visitante_hash, dia)
);

-- Suporta a limpeza periódica das linhas antigas: o histórico diário só serve
-- para desduplicar, o total acumulado vive em cavalos_venda.views_count.
CREATE INDEX IF NOT EXISTS idx_visualizacoes_dia
  ON cavalos_venda_visualizacoes (dia);

-- Regista a visualização e devolve true apenas quando ela foi realmente contada.
--
-- O incremento fica dentro da mesma função e só corre quando o INSERT resultou
-- numa linha nova, o que torna o contador imune a duas visualizações em paralelo
-- (o padrão ler-somar-gravar usado nos eventos perde incrementos).
CREATE OR REPLACE FUNCTION registar_visualizacao_cavalo(
  p_cavalo_id UUID,
  p_visitante_hash TEXT
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_nova BOOLEAN := false;
BEGIN
  INSERT INTO cavalos_venda_visualizacoes (cavalo_id, visitante_hash)
  VALUES (p_cavalo_id, p_visitante_hash)
  ON CONFLICT DO NOTHING;

  GET DIAGNOSTICS v_nova = ROW_COUNT;

  IF v_nova THEN
    UPDATE cavalos_venda
    SET views_count = COALESCE(views_count, 0) + 1
    WHERE id = p_cavalo_id;
  END IF;

  RETURN v_nova;
END;
$$;

ALTER TABLE cavalos_venda_visualizacoes ENABLE ROW LEVEL SECURITY;

-- Sem política de leitura pública: quem visitou o quê não é do domínio de
-- ninguém a não ser da própria plataforma. O vendedor vê o total, não a lista.
DROP POLICY IF EXISTS "visualizacoes_service_role" ON cavalos_venda_visualizacoes;
CREATE POLICY "visualizacoes_service_role"
  ON cavalos_venda_visualizacoes
  USING (auth.role() = 'service_role');

-- =============================================================================
-- 2. Denúncias
-- =============================================================================
CREATE TABLE IF NOT EXISTS cavalos_venda_denuncias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cavalo_id UUID NOT NULL REFERENCES cavalos_venda(id) ON DELETE CASCADE,

  -- ON DELETE SET NULL: apagar a conta não deve apagar a denúncia, que a equipa
  -- pode ainda estar a analisar.
  denunciante_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,

  motivo TEXT NOT NULL CHECK (motivo IN (
    'fraude',
    'ja_vendido',
    'dados_falsos',
    'conteudo_improprio',
    'duplicado',
    'outro'
  )),
  detalhe TEXT CHECK (detalhe IS NULL OR char_length(detalhe) <= 2000),

  status TEXT NOT NULL DEFAULT 'pendente'
    CHECK (status IN ('pendente', 'em_analise', 'procedente', 'improcedente')),

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  resolvida_at TIMESTAMPTZ,
  resolvida_por TEXT,
  nota_interna TEXT,

  -- Uma denúncia por pessoa e anúncio: quem já denunciou não inflaciona a fila
  -- de moderação repetindo o mesmo. Denúncias anónimas (denunciante_id nulo)
  -- não são abrangidas, porque NULL nunca colide num índice único.
  CONSTRAINT cavalos_venda_denuncias_unica UNIQUE (cavalo_id, denunciante_id)
);

-- Fila de moderação: pendentes primeiro, mais antigas no topo
CREATE INDEX IF NOT EXISTS idx_denuncias_pendentes
  ON cavalos_venda_denuncias (created_at ASC)
  WHERE status = 'pendente';

CREATE INDEX IF NOT EXISTS idx_denuncias_cavalo
  ON cavalos_venda_denuncias (cavalo_id);

ALTER TABLE cavalos_venda_denuncias ENABLE ROW LEVEL SECURITY;

-- Quem denuncia pode ver o que denunciou; ninguém mais. O anunciante não deve
-- conseguir descobrir quem o denunciou.
DROP POLICY IF EXISTS "denuncias_select_propria" ON cavalos_venda_denuncias;
CREATE POLICY "denuncias_select_propria"
  ON cavalos_venda_denuncias FOR SELECT
  USING (auth.uid() = denunciante_id);

DROP POLICY IF EXISTS "denuncias_service_role" ON cavalos_venda_denuncias;
CREATE POLICY "denuncias_service_role"
  ON cavalos_venda_denuncias
  USING (auth.role() = 'service_role');
