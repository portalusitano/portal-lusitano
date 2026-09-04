-- =============================================================================
-- Fechar as tabelas que estão abertas à chave anónima
-- Data: 2026-09-04
--
-- ATENÇÃO: esta migração NÃO foi aplicada a nenhuma base. Foi escrita e
-- validada contra um PostgreSQL 16 local (aplicada duas vezes seguidas, para
-- provar que é idempotente). Rever antes de correr em produção.
--
-- -----------------------------------------------------------------------------
-- O que ela corrige
-- -----------------------------------------------------------------------------
-- A chave `NEXT_PUBLIC_SUPABASE_ANON_KEY` está, por definição, no JavaScript
-- que o site entrega a toda a gente. Quem a copia fala com o PostgREST como o
-- papel `anon`, e o que o trava a partir daí é só o RLS. Foram encontradas três
-- famílias de buracos:
--
--   1. Sete tabelas com o RLS **desligado** e `GRANT ALL` a `anon` e a
--      `authenticated`: qualquer pessoa lê, escreve e apaga tudo o que lá está.
--      Entre elas, `favoritos` (email de cada utilizador e o que ele guardou) e
--      `admin_chat_messages` (a conversa interna da administração).
--
--   2. Políticas com o nome trocado pela intenção. `CREATE POLICY … FOR ALL
--      USING (true)` **sem** `TO service_role` aplica-se a `public`, que em
--      PostgreSQL quer dizer *todos os papéis*, `anon` incluído. Uma política
--      chamada "Enable all for service role" que na verdade abre a tabela ao
--      mundo é pior do que nenhuma, porque quem lê a lista de políticas fica
--      convencido de que está fechada. Apanha `payments`, `leads`,
--      `contact_submissions`, `admin_tasks`, `admin_automations` e
--      `admin_automation_logs`.
--
--      (A migração 20260302000001 já tentou apagar a de `contact_submissions`,
--      mas procurou-a por "Allow all for service role" e o nome que lá está é
--      "Enable all for service role". Um `DROP POLICY IF EXISTS` com o nome
--      errado não dá erro nenhum — não faz nada, em silêncio. Por isso aqui
--      apagam-se os dois nomes.)
--
--   3. Escritas públicas onde só devia haver leitura pública: `coudelarias`
--      aceita INSERT e UPDATE de qualquer pessoa (as 35 fichas que lá estão
--      podem ser reescritas por quem quiser), e `seller_ratings` aceita
--      INSERT de qualquer pessoa com qualquer `cavalo_id` e qualquer
--      `buyer_email`.
--
-- -----------------------------------------------------------------------------
-- Porque é que fechar não parte o site
-- -----------------------------------------------------------------------------
-- O papel `service_role` **ignora** o RLS. Todas as rotas de API e todas as
-- páginas de servidor deste projecto lêem por `lib/supabase-admin.ts`, que é
-- service role. O cliente anónimo aparece em oito ficheiros e em sete deles só
-- para autenticação (`auth.getUser`, login, registo, recuperação de senha).
--
-- A única leitura de tabela feita com a chave anónima em todo o projecto é
--
--     app/mapa/page.tsx  →  coudelarias  where status = 'active'
--
-- e é por isso que a política de leitura pública de `coudelarias` fica
-- intacta. Tudo o resto pode fechar sem que uma linha de código mude.
--
-- As políticas `TO service_role` que se criam abaixo são, em rigor,
-- redundantes — o service role passa à frente do RLS de qualquer maneira. Ficam
-- porque documentam quem é o dono da tabela, e é o estilo que as migrações
-- anteriores já usam.
-- =============================================================================

-- =============================================================================
-- 1. Tabelas com o RLS desligado
-- =============================================================================
-- Ligar o RLS sem criar política nenhuma para `anon` já fecha a tabela: sem
-- política que autorize, o PostgreSQL nega. O `REVOKE` é o segundo trinco —
-- sem ele, uma política mal escrita no futuro volta a abrir tudo de uma vez.

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'admin_chat_messages',
    'admin_chat_read_receipts',
    'favoritos',
    'linhagens',
    'profissionais_analytics_daily',
    'reviews',
    'eventos'
  ] LOOP
    IF to_regclass('public.' || quote_ident(t)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
      EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', t);
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_service_role', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
        t || '_service_role', t
      );
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- 2. Políticas que dizem "service role" e valem para toda a gente
-- =============================================================================

-- payments — email, montante e identificadores Stripe de cada compra.
-- Além da leitura, `anon` podia INSERIR: a guarda de duplicados do webhook
-- procura `stripe_session_id` nesta tabela, portanto uma linha forjada com a
-- sessão de outra pessoa faz o webhook saltar o anúncio que ela pagou.
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for service role" ON public.payments;
DROP POLICY IF EXISTS "Allow all for service role" ON public.payments;
DROP POLICY IF EXISTS "payments_service_role" ON public.payments;
CREATE POLICY "payments_service_role" ON public.payments
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.payments FROM anon, authenticated;

-- leads — email e proveniência de campanha de cada contacto.
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for service role" ON public.leads;
DROP POLICY IF EXISTS "Allow all for service role" ON public.leads;
DROP POLICY IF EXISTS "leads_service_role" ON public.leads;
CREATE POLICY "leads_service_role" ON public.leads
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.leads FROM anon, authenticated;

-- contact_submissions — o formulário de venda inteiro em `form_data`, mais IP
-- e user agent. É também o sítio de onde o webhook do Stripe lê os dados do
-- anúncio: com UPDATE aberto, dava para reescrever o conteúdo de um anúncio já
-- pago entre o checkout e a entrega do webhook.
ALTER TABLE IF EXISTS public.contact_submissions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Enable all for service role" ON public.contact_submissions;
DROP POLICY IF EXISTS "Allow all for service role" ON public.contact_submissions;
REVOKE ALL ON public.contact_submissions FROM anon, authenticated;

-- admin_tasks, admin_automations, admin_automation_logs — o painel de
-- administração. As três tinham `FOR ALL USING (true)` sem papel.
ALTER TABLE IF EXISTS public.admin_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can do everything on tasks" ON public.admin_tasks;
DROP POLICY IF EXISTS "admin_tasks_service_role" ON public.admin_tasks;
CREATE POLICY "admin_tasks_service_role" ON public.admin_tasks
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.admin_tasks FROM anon, authenticated;

ALTER TABLE IF EXISTS public.admin_automations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can do everything on automations" ON public.admin_automations;
DROP POLICY IF EXISTS "admin_automations_service_role" ON public.admin_automations;
CREATE POLICY "admin_automations_service_role" ON public.admin_automations
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.admin_automations FROM anon, authenticated;

ALTER TABLE IF EXISTS public.admin_automation_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Admin can do everything on automation logs" ON public.admin_automation_logs;
DROP POLICY IF EXISTS "admin_automation_logs_service_role" ON public.admin_automation_logs;
CREATE POLICY "admin_automation_logs_service_role" ON public.admin_automation_logs
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.admin_automation_logs FROM anon, authenticated;

-- =============================================================================
-- 3. Carrinhos abandonados e emails de recuperação
-- =============================================================================
-- `admin_all_abandoned_carts` estava `TO authenticated`: bastava registar uma
-- conta no site para ler os carrinhos e os emails de toda a gente. E
-- `public_update_own_cart` dizia "own" mas tinha `USING (true)` — qualquer
-- pessoa reescrevia o carrinho de qualquer outra.
ALTER TABLE IF EXISTS public.abandoned_carts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_abandoned_carts" ON public.abandoned_carts;
DROP POLICY IF EXISTS "public_update_own_cart" ON public.abandoned_carts;
DROP POLICY IF EXISTS "public_insert_abandoned_carts" ON public.abandoned_carts;
DROP POLICY IF EXISTS "abandoned_carts_service_role" ON public.abandoned_carts;
CREATE POLICY "abandoned_carts_service_role" ON public.abandoned_carts
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.abandoned_carts FROM anon, authenticated;

ALTER TABLE IF EXISTS public.cart_recovery_emails ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_recovery_emails" ON public.cart_recovery_emails;
REVOKE ALL ON public.cart_recovery_emails FROM anon, authenticated;

ALTER TABLE IF EXISTS public.cart_recovery_stats ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all_recovery_stats" ON public.cart_recovery_stats;
DROP POLICY IF EXISTS "cart_recovery_stats_service_role" ON public.cart_recovery_stats;
CREATE POLICY "cart_recovery_stats_service_role" ON public.cart_recovery_stats
  FOR ALL TO service_role USING (true) WITH CHECK (true);
REVOKE ALL ON public.cart_recovery_stats FROM anon, authenticated;

-- =============================================================================
-- 4. coudelarias — leitura pública fica, escrita pública sai
-- =============================================================================
-- As duas políticas chamavam-se "Service role pode inserir" e "Service role
-- pode atualizar" e não tinham papel nenhum atribuído: eram INSERT e UPDATE
-- para toda a gente, com `USING (true)`. As 35 fichas do directório podiam ser
-- reescritas por qualquer visitante — e o nome e a descrição de uma coudelaria
-- vão parar ao JSON-LD da ficha, o que fazia disto também um vector de XSS.
--
-- A política de leitura NÃO se toca: `app/mapa/page.tsx` lê esta tabela com a
-- chave anónima e é a única leitura anónima do projecto.
DROP POLICY IF EXISTS "Service role pode inserir" ON public.coudelarias;
DROP POLICY IF EXISTS "Service role pode atualizar" ON public.coudelarias;
DROP POLICY IF EXISTS "coudelarias_service_role" ON public.coudelarias;
CREATE POLICY "coudelarias_service_role" ON public.coudelarias
  FOR ALL TO service_role USING (true) WITH CHECK (true);

DO $$
BEGIN
  IF to_regclass('public.coudelarias') IS NOT NULL THEN
    -- Só o necessário para o `select` do mapa. Sem INSERT, UPDATE nem DELETE.
    EXECUTE 'REVOKE ALL ON public.coudelarias FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.coudelarias TO anon, authenticated';
  END IF;
END $$;

-- =============================================================================
-- 5. seller_ratings — uma avaliação tem de vir de alguém
-- =============================================================================
-- `seller_ratings_insert_authenticated` chamava-se "authenticated" mas estava
-- em `public` com `WITH CHECK (true)`: qualquer pessoa inseria avaliações em
-- nome de qualquer comprador, sobre qualquer anúncio, quantas quisesse. Num
-- classificados, a reputação do vendedor é o produto.
--
-- Fica só leitura pública (as avaliações mostram-se na ficha) e a escrita passa
-- a ser do servidor, que é quem sabe se houve mesmo uma transacção.
DROP POLICY IF EXISTS "seller_ratings_insert_authenticated" ON public.seller_ratings;

DO $$
BEGIN
  IF to_regclass('public.seller_ratings') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON public.seller_ratings FROM anon, authenticated';
    EXECUTE 'GRANT SELECT ON public.seller_ratings TO anon, authenticated';
  END IF;
END $$;

-- =============================================================================
-- 6. Um pagamento, um anúncio
-- =============================================================================
-- A guarda de duplicados do webhook lê `payments` e depois escreve — entre as
-- duas coisas não há nada que impeça duas entregas simultâneas do mesmo evento
-- (o Stripe repete) de passarem as duas pela guarda e inserirem dois cavalos
-- pelo mesmo pagamento. Quem resolve isto é o índice, não o código: com ele, a
-- segunda escrita rebenta, o webhook devolve 500 e o evento fica na fila.
--
-- Se algum dia esta tabela tiver duplicados, o índice não é criado e a migração
-- pára aqui com erro — de propósito. Limpar os duplicados é uma decisão de
-- negócio (qual das linhas fica), não uma coisa para uma migração adivinhar.
CREATE UNIQUE INDEX IF NOT EXISTS payments_stripe_session_id_key
  ON public.payments (stripe_session_id)
  WHERE stripe_session_id IS NOT NULL;
