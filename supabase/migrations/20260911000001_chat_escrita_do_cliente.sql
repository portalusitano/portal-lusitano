-- Migração: fechar a escrita do cliente nas tabelas do chat
-- Data: 2026-09-11
--
-- ── O buraco, e porque é que ele sobreviveu a uma revisão ───────────────────
--
-- A `20260829000002_marketplace_chat.sql` criou esta política:
--
--   CREATE POLICY "conversas_update_participante"
--     ON marketplace_conversas FOR UPDATE
--     USING      (auth.uid() = comprador_id OR auth.uid() = vendedor_id)
--     WITH CHECK (auth.uid() = comprador_id OR auth.uid() = vendedor_id);
--
-- Lida em voz alta, responde à pergunta certa: «só um participante escreve na
-- conversa». E é **exactamente a mesma forma de erro** que a
-- `20260910000001_perfil_com_fotografia.sql` já descreve a propósito da
-- `user_profiles`: **a RLS decide que linhas, não que colunas.** O `GRANT` é
-- sobre a tabela inteira (é o que a Supabase dá por omissão a `authenticated`,
-- e é o que o `__tests__/sql/05-privilegios.sql` reproduz), e nesta linha vivem
-- as três colunas que dizem **de quem é a conversa**:
--
--   cavalo_id      -- o anúncio
--   comprador_id   -- uma das duas pessoas
--   vendedor_id    -- a outra
--
-- O `WITH CHECK` só exige que quem escreve continue a ser **uma** das duas. A
-- outra é livre. Com a chave anónima — que anda no JavaScript da página, e é
-- suposto andar — e a sua própria sessão, qualquer participante de qualquer
-- conversa podia fazer:
--
--   PATCH /rest/v1/marketplace_conversas?id=eq.<uma conversa minha>
--   {"comprador_id": "<a vítima>", "vendedor_id": "<eu>"}
--
-- e com isso três coisas de uma vez:
--
--   1. **Entregar a uma terceira pessoa o fio de outra.** As mensagens que o
--      comprador original escreveu continuam lá, e a
--      `mensagens_select_participante` resolve a visibilidade **pela conversa**:
--      quem entra na conversa lê o histórico todo. Reproduzido: a vítima passa
--      de zero mensagens visíveis a ler o corpo que o comprador original tinha
--      escrito.
--   2. **Falar com qualquer pessoa de quem se saiba o UUID**, sem anúncio, sem
--      o `cavalo.status` ter de estar activo, e **sem passar pelo
--      `MAX_CONVERSAS_NOVAS_POR_MINUTO`** — o limite de ritmo do
--      `app/api/conversas` só corre no ramo que **cria** o fio, e aqui o fio já
--      existe. O gatilho do destinatário deriva-o da conversa, portanto a
--      mensagem seguinte é dirigida à vítima, que recebe o empurrão do Realtime
--      e um email do nosso servidor.
--   3. **Ler o nome e a fotografia de perfil de qualquer UUID.** A
--      `GET /api/conversas` carrega o perfil da outra parte com a chave de
--      serviço, a partir do `vendedor_id`/`comprador_id` da linha. A decisão
--      escrita na `20260910000001` — «não se abre leitura de `user_profiles` a
--      terceiros, senão a tabela é um directório de toda a gente» — desfaz-se
--      por aqui sem lhe tocar.
--
-- E o comprador original **perde** o fio: deixa de ver a conversa onde escreveu.
--
-- Nada disto precisa de um defeito novo: precisa de um `PATCH` e de um UUID.
--
-- ── Porque é que a política não era necessária para nada ────────────────────
--
-- Contado ficheiro a ficheiro: **nenhum** caminho deste repositório escreve em
-- `marketplace_conversas` ou em `marketplace_mensagens` com a chave anónima.
-- As únicas escritas são `app/api/conversas/**`, todas por `supabaseAdmin`, e os
-- dois gatilhos da `20260909000001`. O `arquivada_*` — a única coluna que uma
-- política de UPDATE para um participante poderia querer servir — não tem rota
-- nenhuma que a escreva: quem a põe a `false` é o gatilho, e quem a lê é o
-- `lib/chat/vista-publica`. A política autorizava uma operação que o produto
-- não faz.
--
-- É a mesma repartição que a `20260910000001` deixou escrita: **todos os
-- caminhos de escrita deste repositório vão por `supabaseAdmin`**, que é onde há
-- sessão verificada, limite de ritmo e validação.
--
-- ── Dois trincos, e cada um vale por si ────────────────────────────────────
--
-- 1. O `REVOKE`. É quem sabe falar de colunas, e é por isso que foi o `GRANT` —
--    e não a política — que corrigiu a `user_profiles`. Aqui não há coluna
--    nenhuma a salvar, por isso revoga-se a escrita inteira.
--
-- 2. A identidade da conversa passa a ser **imutável**, por gatilho. Sem isto,
--    um `GRANT ALL` escrito num dia apressado — ou um `ALTER DEFAULT
--    PRIVILEGES` da Supabase a passar outra vez — reabre o buraco sem que
--    ninguém toque numa política. Uma conversa **é** (anúncio, comprador,
--    vendedor); se esses três mudam, não é a mesma conversa, e mudá-los é
--    reescrever o histórico de quem lá escreveu.
--
-- O `GRANT SELECT` **não** se mexe, e não é por descuido: a
-- `mensagens_select_participante` faz um `EXISTS` sobre
-- `marketplace_conversas`, e a expressão de uma política corre com os
-- privilégios de quem invoca. Sem `SELECT` na conversa, cada entrega do
-- Realtime falhava com «permission denied» em vez de devolver as linhas certas.
--
-- ── Quando houver rota de arquivo ───────────────────────────────────────────
--
-- Escrever-se-á com as duas metades que faltavam aqui: `GRANT UPDATE
-- (arquivada_comprador)` / `(arquivada_vendedor)` — de **coluna**, nunca de
-- tabela — e uma política que só deixe cada lado tocar na sua. Ou, mais simples,
-- uma rota por `supabaseAdmin`, como todas as outras.
--
-- ── Idempotente ─────────────────────────────────────────────────────────────
--
-- Aplica-se duas vezes sem diferença, e isso é verificado por
-- `__tests__/lib/chat-rls.sql.test.ts` contra um PostgreSQL a sério, com um
-- braço «antes» que reproduz o sequestro e rebenta se deixar de o reproduzir.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.marketplace_conversas') IS NULL
     OR to_regclass('public.marketplace_mensagens') IS NULL THEN
    RAISE EXCEPTION
      'As tabelas do chat nao existem. Aplique primeiro a migracao 20260829000002_marketplace_chat.sql.';
  END IF;
END $$;

-- =============================================================================
-- 1. Primeiro trinco: o privilégio
-- =============================================================================
-- Um `REVOKE` de um privilégio que não está lá é uma no-op, e é o que torna
-- isto repetível.

REVOKE INSERT, UPDATE, DELETE ON public.marketplace_conversas FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.marketplace_conversas FROM anon;

-- Nas mensagens, o `UPDATE` e o `DELETE` já eram negados pela RLS — não há
-- política nenhuma para nenhum dos dois. O `REVOKE` é o segundo trinco do
-- mesmo sítio: sem ele, uma política mal escrita no futuro volta a abrir a
-- reescrita do histórico de alguém.
--
-- O `INSERT` fica como está, de propósito: a `mensagens_insert_participante`
-- exige `auth.uid() = remetente_id` **e** participação na conversa, e é uma
-- decisão tomada e escrita na `20260909000001`. O que ela deixa passar — uma
-- mensagem escrita por fora do `app/api/conversas`, e por isso por fora do
-- `validarMensagem` e do `MAX_MENSAGENS_POR_MINUTO` — está descrito no relatório
-- desta revisão como proposta, e não se decide aqui.
REVOKE UPDATE, DELETE ON public.marketplace_mensagens FROM authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.marketplace_mensagens FROM anon;

-- A política que autorizava um UPDATE sem colunas. Sai porque não serve nada
-- (ver a nota acima) e porque deixá-la é deixar uma arma carregada à espera de
-- um `GRANT`.
DROP POLICY IF EXISTS "conversas_update_participante" ON public.marketplace_conversas;

-- =============================================================================
-- 2. Segundo trinco: a identidade da conversa é imutável
-- =============================================================================
-- Vale para **todos** os papéis, a chave de serviço incluída, e é de propósito:
-- o que se está a afirmar não é um privilégio, é o modelo de dados. Nenhuma rota
-- deste repositório escreve nestas três colunas depois do `INSERT`.
--
-- Uma reparação manual legítima existe e tem um nome: desligar o gatilho dentro
-- de uma transacção, consciente do que se está a fazer. É precisamente o que
-- não se consegue fazer com um `PATCH` de PostgREST.
--
-- `IS DISTINCT FROM` e não `<>` para que um UPDATE que reescreva o mesmo valor
-- passe — é o que o `trg_conversas_ultima_mensagem` faz a cada mensagem.
CREATE OR REPLACE FUNCTION public.marketplace_conversas_identidade_imutavel()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
BEGIN
  IF NEW.cavalo_id IS DISTINCT FROM OLD.cavalo_id
     OR NEW.comprador_id IS DISTINCT FROM OLD.comprador_id
     OR NEW.vendedor_id IS DISTINCT FROM OLD.vendedor_id THEN
    RAISE EXCEPTION
      'A identidade de uma conversa (cavalo_id, comprador_id, vendedor_id) nao se altera.'
      USING ERRCODE = 'check_violation';
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_conversas_identidade_imutavel ON public.marketplace_conversas;
CREATE TRIGGER trg_conversas_identidade_imutavel
  BEFORE UPDATE OF cavalo_id, comprador_id, vendedor_id ON public.marketplace_conversas
  FOR EACH ROW EXECUTE FUNCTION public.marketplace_conversas_identidade_imutavel();
