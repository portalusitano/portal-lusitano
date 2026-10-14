-- Aviso de fim de anúncio
--
-- O anúncio é pago e tem prazo, mas até aqui o vendedor não era avisado de
-- nada: o anúncio deixava de aparecer e ele só descobria por acaso. Estas
-- colunas guardam qual foi o último aviso enviado para cada anúncio, para o
-- cron diário poder avisar a 7 dias, a 1 dia e no proprio dia sem repetir o
-- mesmo aviso todas as manhas.
--
-- Idempotente: pode correr as vezes que forem precisas.

DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION 'A tabela public.cavalos_venda nao existe. Corra primeiro supabase/cavalos-venda-bootstrap.sql.';
  END IF;
END $$;

-- Limiar (em dias) do ultimo aviso enviado: 7, 1 ou 0. NULL = ainda sem aviso.
ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS aviso_expiracao_dias SMALLINT;

-- Prazo a que esse aviso dizia respeito. E o que permite reconhecer uma
-- renovacao: se o listing_expires_at ja nao e este, o ciclo de avisos
-- recomeca do zero sem ninguem ter de limpar nada a mao.
ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS aviso_expiracao_prazo TIMESTAMPTZ;

ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS aviso_expiracao_at TIMESTAMPTZ;

-- So os anuncios publicos com prazo entram na varredura diaria; os restantes
-- nao teem nada a expirar e nao vale a pena percorre-los.
CREATE INDEX IF NOT EXISTS idx_cavalos_venda_expiracao
  ON public.cavalos_venda (listing_expires_at)
  WHERE listing_expires_at IS NOT NULL
    AND status IN ('active', 'reservado');

COMMENT ON COLUMN public.cavalos_venda.aviso_expiracao_dias IS
  'Limiar do ultimo aviso de expiracao enviado (7, 1 ou 0). NULL = nenhum aviso enviado.';
COMMENT ON COLUMN public.cavalos_venda.aviso_expiracao_prazo IS
  'listing_expires_at a que o ultimo aviso dizia respeito; um prazo diferente reinicia o ciclo de avisos.';
COMMENT ON COLUMN public.cavalos_venda.aviso_expiracao_at IS
  'Momento em que o ultimo aviso de expiracao foi enviado ao vendedor.';
