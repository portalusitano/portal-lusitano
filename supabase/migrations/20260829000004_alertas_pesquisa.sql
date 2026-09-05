-- Migration: Alertas de pesquisa no marketplace
-- Data: 2026-08-29
--
-- Quem procura um Lusitano com critérios concretos — égua, Ribatejo, até 20 mil,
-- iniciada em dressage — raramente encontra à primeira. Sem alertas, essa pessoa
-- tem de voltar ao site de sua iniciativa, e a maioria não volta.
--
-- Cada alerta guarda os critérios de uma pesquisa e a data a partir da qual
-- interessa avisar. O cron compara com os anúncios publicados desde então.

DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe. Corra supabase/cavalos-venda-bootstrap.sql antes desta migracao.';
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS marketplace_alertas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Rótulo dado pela pessoa. Sem ele, a lista de alertas fica ilegível assim que
  -- houver mais do que um.
  nome TEXT,

  -- Critérios. Todos opcionais: um alerta sem critérios avisa de tudo o que é
  -- publicado, que é um caso de uso legítimo num nicho pequeno como este.
  sexo TEXT,
  regiao TEXT,
  preco_min NUMERIC,
  preco_max NUMERIC,
  idade_min INTEGER,
  idade_max INTEGER,
  disciplina TEXT,
  nivel TEXT,
  termo TEXT,

  frequencia TEXT NOT NULL DEFAULT 'diaria'
    CHECK (frequencia IN ('diaria', 'semanal')),

  ativo BOOLEAN NOT NULL DEFAULT true,

  -- Fronteira do que já foi comunicado. Começa na criação para o primeiro aviso
  -- não despejar o catálogo inteiro na caixa de correio de quem acabou de criar
  -- o alerta.
  desde TIMESTAMPTZ NOT NULL DEFAULT now(),
  ultimo_envio_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Um intervalo invertido não devolveria nada e a pessoa ficaria à espera de um
  -- email que nunca chega, sem perceber porquê.
  CONSTRAINT alertas_preco_coerente CHECK (
    preco_min IS NULL OR preco_max IS NULL OR preco_min <= preco_max
  ),
  CONSTRAINT alertas_idade_coerente CHECK (
    idade_min IS NULL OR idade_max IS NULL OR idade_min <= idade_max
  )
);

-- Lista de alertas de uma pessoa
CREATE INDEX IF NOT EXISTS idx_alertas_user
  ON marketplace_alertas (user_id, created_at DESC);

-- Fila do cron: só os activos interessam, ordenados pelo que está há mais tempo
-- sem envio (NULLS FIRST põe os que nunca foram enviados à cabeça).
CREATE INDEX IF NOT EXISTS idx_alertas_por_enviar
  ON marketplace_alertas (ultimo_envio_at ASC NULLS FIRST)
  WHERE ativo;

ALTER TABLE marketplace_alertas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "alertas_select_proprio" ON marketplace_alertas;
CREATE POLICY "alertas_select_proprio"
  ON marketplace_alertas FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_update_proprio" ON marketplace_alertas;
CREATE POLICY "alertas_update_proprio"
  ON marketplace_alertas FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_delete_proprio" ON marketplace_alertas;
CREATE POLICY "alertas_delete_proprio"
  ON marketplace_alertas FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "alertas_service_role" ON marketplace_alertas;
CREATE POLICY "alertas_service_role"
  ON marketplace_alertas
  USING (auth.role() = 'service_role');
