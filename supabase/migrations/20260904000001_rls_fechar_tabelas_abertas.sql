-- =============================================================================
-- Fechar as tabelas que estão abertas à chave anónima
-- Data: 2026-09-04
--
-- ATENÇÃO: esta migração NÃO foi aplicada a nenhuma base. Foi escrita e
-- validada contra um PostgreSQL 16 local — ver `supabase/validacao/`, que
-- reproduz o esquema e as políticas de produção, mede as 24 operações que a
-- chave anónima conseguia fazer e mede também o que tem de continuar a
-- funcionar. Aplicada duas vezes seguidas sem erro.
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
-- O papel `service_role` **ignora** o RLS, e é por ele que quase tudo lê. As
-- leituras feitas mesmo com a chave anónima foram contadas ficheiro a ficheiro,
-- e são quatro tabelas:
--
--   coudelarias    app/mapa/page.tsx, app/directorio/**, /api/coudelarias
--   cavalos_venda  app/comprar/**, app/page.tsx, /api/cavalos, /api/search
--   eventos        /api/eventos, /api/eventos/[slug]
--   reviews        /api/reviews (supabasePublic)
--
-- As quatro mantêm a leitura pública. Tudo o resto fecha sem que uma linha de
-- código mude.
--
-- O que não se pode contar com um grep: o padrão dominante no projecto é
-- `import { supabaseAdmin as supabase }`, e procurar por "supabase.from" sem
-- olhar ao alias no topo do ficheiro acusa de anónimo código que é service role
-- — as rotas de administração todas, por exemplo. O que conta é a que cliente o
-- identificador está ligado, não como se chama.
--
-- Duas escritas que eram anónimas passaram para o service role antes desta
-- migração, e sem isso ela partia-as: os contadores de visitas de
-- `app/api/eventos/[slug]/route.ts` e de `app/directorio/[slug]/page.tsx`. Um
-- UPDATE não se restringe a uma coluna por RLS, portanto deixar `anon` somar
-- uma visita é deixá-lo reescrever a linha inteira.
--
-- As políticas `TO service_role` que se criam abaixo são, em rigor,
-- redundantes — o service role passa à frente do RLS de qualquer maneira. Ficam
-- porque documentam quem é o dono da tabela, e é o estilo que as migrações
-- anteriores já usam.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Ajudante
-- -----------------------------------------------------------------------------
-- Tudo o que se segue tem de ser inofensivo numa base onde a tabela não exista
-- — é o que torna a migração aplicável a um ambiente de desenvolvimento parcial
-- e o que a torna repetível. Note-se que `ALTER TABLE IF EXISTS` **não** chega:
-- um `DROP POLICY IF EXISTS ... ON tabela_que_nao_existe` rebenta na mesma, com
-- "relation does not exist". Quem decide é o `to_regclass`.
CREATE OR REPLACE FUNCTION public.__rls_fechar(
  tabela            text,
  politicas_a_tirar text[] DEFAULT '{}',
  privilegios_anon  text   DEFAULT NULL,   -- ex.: 'SELECT'; NULL = nenhum
  politica_service  boolean DEFAULT true,
  qual_leitura      text   DEFAULT NULL    -- USING de uma política de leitura pública
) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE
  p text;
BEGIN
  IF to_regclass('public.' || quote_ident(tabela)) IS NULL THEN
    RAISE NOTICE 'tabela public.% nao existe, saltada', tabela;
    RETURN;
  END IF;

  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tabela);

  FOREACH p IN ARRAY politicas_a_tirar LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', p, tabela);
  END LOOP;

  IF politica_service THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tabela || '_service_role', tabela);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR ALL TO service_role USING (true) WITH CHECK (true)',
      tabela || '_service_role', tabela
    );
  END IF;

  IF qual_leitura IS NOT NULL THEN
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', tabela || '_select_public', tabela);
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO anon, authenticated USING (%s)',
      tabela || '_select_public', tabela, qual_leitura
    );
  END IF;

  EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', tabela);
  IF privilegios_anon IS NOT NULL THEN
    EXECUTE format('GRANT %s ON public.%I TO anon, authenticated', privilegios_anon, tabela);
  END IF;
END $fn$;

-- =============================================================================
-- 1. Tabelas com o RLS desligado e sem nenhuma leitura pública legítima
-- =============================================================================
-- Ligar o RLS sem criar política nenhuma para `anon` já fecha a tabela: sem
-- política que autorize, o PostgreSQL nega. O `REVOKE` é o segundo trinco —
-- sem ele, uma política mal escrita no futuro volta a abrir tudo de uma vez.
--
-- Nenhuma destas cinco é lida por código nenhum com a chave anónima;
-- `linhagens`, `profissionais_analytics_daily` e as duas de `admin_chat` não
-- são lidas por código nenhum, ponto final.
SELECT public.__rls_fechar('admin_chat_messages');
SELECT public.__rls_fechar('admin_chat_read_receipts');
SELECT public.__rls_fechar('favoritos');
SELECT public.__rls_fechar('linhagens');
SELECT public.__rls_fechar('profissionais_analytics_daily');

-- =============================================================================
-- 1b. `eventos` e `reviews`: leitura pública fica, escrita pública sai
-- =============================================================================
-- Estas duas também tinham o RLS desligado, mas são lidas com a chave anónima
-- (ver o cabeçalho), portanto não podem ser fechadas como as cinco de cima.
--
-- `reviews` fica mais apertada do que estava: a rota pública já filtra por
-- `status = 'approved'`, portanto avaliações pendentes e rejeitadas deixam de
-- ser legíveis de fora, o que hoje não é o caso.
--
-- `eventos` fica com `USING (true)` porque a rota `[slug]` procura por slug sem
-- filtrar o estado. Apertar para `status = 'active'` é a continuação natural
-- disto, mas mexe no comportamento da rota e por isso não vai aqui.
SELECT public.__rls_fechar('eventos', '{}', 'SELECT', true, 'true');
SELECT public.__rls_fechar('reviews', '{}', 'SELECT', true, 'status = ''approved''');

-- =============================================================================
-- 2. Políticas que dizem "service role" e valem para toda a gente
-- =============================================================================

-- payments — email, montante e identificadores Stripe de cada compra.
-- Além da leitura, `anon` podia INSERIR: a guarda de duplicados do webhook
-- procura `stripe_session_id` nesta tabela, portanto uma linha forjada com a
-- sessão de outra pessoa faz o webhook saltar o anúncio que ela pagou.
SELECT public.__rls_fechar(
  'payments',
  ARRAY['Enable all for service role', 'Allow all for service role']
);

-- leads — email e proveniência de campanha de cada contacto.
SELECT public.__rls_fechar(
  'leads',
  ARRAY['Enable all for service role', 'Allow all for service role']
);

-- contact_submissions — o formulário de venda inteiro em `form_data`, mais IP
-- e user agent. É também o sítio de onde o webhook do Stripe lê os dados do
-- anúncio: com UPDATE aberto, dava para reescrever o conteúdo de um anúncio já
-- pago entre o checkout e a entrega do webhook.
-- (Já tem `contact_submissions_service_role`; não se cria uma segunda.)
SELECT public.__rls_fechar(
  'contact_submissions',
  ARRAY['Enable all for service role', 'Allow all for service role'],
  NULL,
  false
);

-- admin_tasks, admin_automations, admin_automation_logs — o painel de
-- administração. As três tinham `FOR ALL USING (true)` sem papel.
SELECT public.__rls_fechar('admin_tasks', ARRAY['Admin can do everything on tasks']);
SELECT public.__rls_fechar('admin_automations', ARRAY['Admin can do everything on automations']);
SELECT public.__rls_fechar(
  'admin_automation_logs',
  ARRAY['Admin can do everything on automation logs']
);

-- =============================================================================
-- 3. Carrinhos abandonados e emails de recuperação
-- =============================================================================
-- `admin_all_abandoned_carts` estava `TO authenticated`: bastava registar uma
-- conta no site para ler os carrinhos e os emails de toda a gente. E
-- `public_update_own_cart` dizia "own" mas tinha `USING (true)` — qualquer
-- pessoa reescrevia o carrinho de qualquer outra.
SELECT public.__rls_fechar(
  'abandoned_carts',
  ARRAY['admin_all_abandoned_carts', 'public_update_own_cart', 'public_insert_abandoned_carts']
);
SELECT public.__rls_fechar('cart_recovery_emails', ARRAY['admin_all_recovery_emails'], NULL, false);
SELECT public.__rls_fechar('cart_recovery_stats', ARRAY['admin_all_recovery_stats']);

-- =============================================================================
-- 4. coudelarias — leitura pública fica, escrita pública sai
-- =============================================================================
-- As duas políticas chamavam-se "Service role pode inserir" e "Service role
-- pode atualizar" e não tinham papel nenhum atribuído: eram INSERT e UPDATE
-- para toda a gente, com `USING (true)`. As 35 fichas do directório podiam ser
-- reescritas por qualquer visitante — e o nome e a descrição de uma coudelaria
-- vão parar ao JSON-LD da ficha, o que fazia disto também um vector de XSS.
--
-- As duas políticas de leitura NÃO se tocam: são elas que servem o mapa e o
-- directório.
SELECT public.__rls_fechar(
  'coudelarias',
  ARRAY['Service role pode inserir', 'Service role pode atualizar'],
  'SELECT'
);

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
SELECT public.__rls_fechar(
  'seller_ratings',
  ARRAY['seller_ratings_insert_authenticated'],
  'SELECT',
  false
);

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

-- -----------------------------------------------------------------------------
-- O ajudante sai. Uma função com dois underscores à frente é um andaime, e um
-- andaime esquecido no sítio é uma função `SECURITY INVOKER` que faz `REVOKE` e
-- `GRANT` por `EXECUTE format` à espera de quem lhe pegue.
-- -----------------------------------------------------------------------------
DROP FUNCTION IF EXISTS public.__rls_fechar(text, text[], text, boolean, text);
