-- Migration: Ligar anúncios do marketplace ao utilizador autenticado
-- Data: 2026-08-29
--
-- Até aqui um anúncio em cavalos_venda só era identificável pelo vendedor_email
-- preenchido a partir do checkout Stripe. Sem uma ligação ao auth.users não é
-- possível o vendedor gerir os próprios anúncios ("Os meus anúncios"), porque
-- o email do Stripe pode divergir do email da conta e não é uma chave fiável.
--
-- Esta migração adiciona a ligação, faz o backfill dos anúncios existentes por
-- correspondência de email e abre as políticas RLS mínimas para o dono ler e
-- editar o que é seu.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
-- Nenhuma migração cria cavalos_venda: a tabela só é definida no script solto
-- supabase/NOVAS-FUNCIONALIDADES.sql. Sem esta verificação, aplicar a migração
-- a uma base de dados sem essa tabela rebenta com um "42P01: relation
-- cavalos_venda does not exist", que não diz a ninguém o que fazer a seguir.
DO $$
BEGIN
  IF to_regclass('public.cavalos_venda') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.cavalos_venda nao existe nesta base de dados. Corra primeiro supabase/cavalos-venda-bootstrap.sql (idempotente, sem dados de exemplo) e volte a aplicar esta migracao. Nao corra NOVAS-FUNCIONALIDADES.sql numa base de dados ja povoada: os INSERT desse ficheiro nao tem ON CONFLICT e duplicam os dados.';
  END IF;
END $$;

-- =============================================================================
-- 1. Coluna de ligação ao utilizador
-- =============================================================================
-- ON DELETE SET NULL: apagar a conta não deve apagar o anúncio pago nem partir
-- os registos de pagamento que lhe apontam.
ALTER TABLE cavalos_venda
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Marcas temporais das transições que o vendedor controla
ALTER TABLE cavalos_venda
  ADD COLUMN IF NOT EXISTS vendido_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS removido_at TIMESTAMPTZ;

-- =============================================================================
-- 2. Índices
-- =============================================================================
-- Suporta a query principal de "Os meus anúncios": WHERE user_id = ? ORDER BY created_at DESC
CREATE INDEX IF NOT EXISTS idx_cavalos_venda_user_id
  ON cavalos_venda (user_id, created_at DESC)
  WHERE user_id IS NOT NULL;

-- Suporta a reclamação por email dos anúncios que ainda não têm dono. Índice
-- parcial: cobre exactamente as linhas que essa query percorre e encolhe à
-- medida que os anúncios vão sendo reclamados.
CREATE INDEX IF NOT EXISTS idx_cavalos_venda_por_reclamar
  ON cavalos_venda (vendedor_email)
  WHERE user_id IS NULL AND vendedor_email IS NOT NULL;

-- =============================================================================
-- 3. Backfill dos anúncios existentes
-- =============================================================================
-- Liga cada anúncio à conta cujo email coincide (case-insensitive, sem espaços).
-- Anúncios cujo vendedor nunca criou conta ficam com user_id NULL e continuam a
-- ser reclamáveis mais tarde pela aplicação quando esse email autenticar.
UPDATE cavalos_venda cv
SET user_id = u.id
FROM auth.users u
WHERE cv.user_id IS NULL
  AND cv.vendedor_email IS NOT NULL
  AND lower(trim(cv.vendedor_email)) = lower(trim(u.email));

-- =============================================================================
-- 4. Políticas RLS para o dono do anúncio
-- =============================================================================
-- As políticas existentes (cavalos_venda_select_active + service_role) mantêm-se.
-- As políticas são combinadas com OR, por isso isto acrescenta acesso ao dono
-- sem alterar o que o público vê.

-- O dono vê os próprios anúncios em qualquer estado (pending, vendido, expirado…)
DROP POLICY IF EXISTS "cavalos_venda_select_own" ON cavalos_venda;
CREATE POLICY "cavalos_venda_select_own"
  ON cavalos_venda FOR SELECT
  USING (auth.uid() = user_id);

-- O dono edita os próprios anúncios e não pode transferi-los para outra conta
DROP POLICY IF EXISTS "cavalos_venda_update_own" ON cavalos_venda;
CREATE POLICY "cavalos_venda_update_own"
  ON cavalos_venda FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Nota: não há política de INSERT nem de DELETE para o dono. A criação continua
-- a passar pelo webhook Stripe (service role) para o anúncio não poder ser criado
-- sem pagamento, e a remoção é lógica (status = 'removido') via UPDATE.
