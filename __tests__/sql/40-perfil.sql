-- Provas sobre o perfil: quem lê, quem escreve, e o que a coluna do prefixo
-- garante.
--
-- Cada prova põe-se no lugar de um cliente do PostgREST — `SET ROLE` mais os
-- claims — porque é assim que a Supabase avalia as políticas. O que se está a
-- provar não é o que a aplicação faz (isso são os testes de TypeScript), é o
-- que a base **deixa fazer a quem não passar pela aplicação**.
BEGIN;

CREATE TEMP TABLE r3(prova text, esperado text, obtido text) ON COMMIT DROP;
GRANT ALL ON r3 TO authenticated, anon;

-- Duas pessoas com conta. O gatilho `on_auth_user_created` cria-lhes o perfil.
INSERT INTO auth.users(id, email) VALUES
  ('aaaa1111-1111-1111-1111-111111111111', 'ana@exemplo.pt'),
  ('bbbb2222-2222-2222-2222-222222222222', 'bruno@exemplo.pt')
ON CONFLICT DO NOTHING;

-- ── O gatilho fez o seu trabalho ───────────────────────────────────────────
INSERT INTO r3 SELECT 'o registo cria o perfil', '2',
  count(*)::text FROM public.user_profiles
  WHERE id IN ('aaaa1111-1111-1111-1111-111111111111','bbbb2222-2222-2222-2222-222222222222');

-- ── O prefixo é opaco: existe, não é o id, e não se repete ─────────────────
INSERT INTO r3 SELECT 'todos os perfis tem prefixo', '0',
  count(*)::text FROM public.user_profiles WHERE avatar_prefixo IS NULL;

INSERT INTO r3 SELECT 'o prefixo nao contem o id', '0',
  count(*)::text FROM public.user_profiles
  WHERE avatar_prefixo LIKE '%' || replace(id::text, '-', '') || '%';

INSERT INTO r3 SELECT 'os prefixos sao distintos',
  (SELECT count(*)::text FROM public.user_profiles),
  (SELECT count(DISTINCT avatar_prefixo)::text FROM public.user_profiles);

-- ── Ler: cada uma vê a sua e mais nenhuma ──────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);

INSERT INTO r3 SELECT 'ana ve o proprio perfil', '1',
  count(*)::text FROM public.user_profiles WHERE id = 'aaaa1111-1111-1111-1111-111111111111';
INSERT INTO r3 SELECT 'ana ve o perfil do bruno', '0',
  count(*)::text FROM public.user_profiles WHERE id = 'bbbb2222-2222-2222-2222-222222222222';
INSERT INTO r3 SELECT 'ana ve a tabela toda', '1', count(*)::text FROM public.user_profiles;
RESET ROLE;

-- O anónimo não chega lá de todo. A pergunta é «consegue ler?» e não «quantas
-- lê?» de propósito: a migração tira-lhe o próprio privilégio de SELECT, logo
-- a resposta certa é um erro e não um zero — e um teste que contasse linhas
-- passaria à mesma se alguém devolvesse o GRANT amanhã.
DO $$
DECLARE passou boolean := false;
BEGIN
  SET LOCAL ROLE anon;
  PERFORM set_config('request.jwt.claims', '{"role":"anon"}', true);
  BEGIN
    PERFORM count(*) FROM public.user_profiles;
    passou := true;
  EXCEPTION WHEN insufficient_privilege THEN passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('anonimo consegue ler perfis', 'false', passou::text);
END $$;

-- ── Escrever o nome: pode ───────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
UPDATE public.user_profiles SET full_name = 'Ana Sequeira'
  WHERE id = 'aaaa1111-1111-1111-1111-111111111111';
RESET ROLE;

INSERT INTO r3 SELECT 'ana pode escrever o proprio nome', 'Ana Sequeira',
  coalesce(full_name, '(nulo)') FROM public.user_profiles
  WHERE id = 'aaaa1111-1111-1111-1111-111111111111';

-- ── Escrever a assinatura: **não** pode ────────────────────────────────────
--
-- Esta é a prova que motivou a migração. Antes dela, este UPDATE passava: a
-- política aprova (a linha é dela) e o GRANT era sobre a tabela inteira.
DO $$
DECLARE passou boolean := false;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    UPDATE public.user_profiles SET tools_subscription_status = 'active'
      WHERE id = 'aaaa1111-1111-1111-1111-111111111111';
    passou := true;
  EXCEPTION WHEN insufficient_privilege THEN
    passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('ana consegue dar-se a assinatura', 'false', passou::text);
END $$;

INSERT INTO r3 SELECT 'a assinatura da ana continua free', 'free',
  coalesce(tools_subscription_status, '(nulo)') FROM public.user_profiles
  WHERE id = 'aaaa1111-1111-1111-1111-111111111111';

-- ── E o mesmo pelo `stripe_customer_id` e por um INSERT forjado ────────────
DO $$
DECLARE passou boolean := false;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    UPDATE public.user_profiles SET stripe_customer_id = 'cus_forjado'
      WHERE id = 'aaaa1111-1111-1111-1111-111111111111';
    passou := true;
  EXCEPTION WHEN insufficient_privilege THEN passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('ana consegue escrever o cliente stripe', 'false', passou::text);
END $$;

DO $$
DECLARE passou boolean := false;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    INSERT INTO public.user_profiles (id, tools_subscription_status)
      VALUES ('cccc3333-3333-3333-3333-333333333333', 'active');
    passou := true;
  EXCEPTION WHEN insufficient_privilege THEN passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('ana consegue inserir um perfil com assinatura', 'false', passou::text);
END $$;

-- E não pode apagar o perfil para fugir a seja o que for.
DO $$
DECLARE passou boolean := false;
BEGIN
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    DELETE FROM public.user_profiles WHERE id = 'aaaa1111-1111-1111-1111-111111111111';
    passou := true;
  EXCEPTION WHEN insufficient_privilege THEN passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('ana consegue apagar o proprio perfil', 'false', passou::text);
END $$;

-- ── O balde: cada uma escreve debaixo do seu prefixo ───────────────────────
DO $$
DECLARE
  prefixo_ana text;
  prefixo_bruno text;
  passou boolean;
BEGIN
  IF to_regclass('storage.objects') IS NULL THEN
    INSERT INTO r3 VALUES ('sem storage: baldes por provar', 'com storage', 'sem storage');
    RETURN;
  END IF;

  SELECT avatar_prefixo INTO prefixo_ana FROM public.user_profiles
    WHERE id = 'aaaa1111-1111-1111-1111-111111111111';
  SELECT avatar_prefixo INTO prefixo_bruno FROM public.user_profiles
    WHERE id = 'bbbb2222-2222-2222-2222-222222222222';

  INSERT INTO r3 VALUES ('o balde dos avatares existe', 'true',
    (EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'avatares'))::text);
  INSERT INTO r3 SELECT 'o balde e publico de leitura', 'true', public::text
    FROM storage.buckets WHERE id = 'avatares';

  -- A Ana debaixo do prefixo dela: passa.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
      VALUES ('avatares', prefixo_ana || '/uma.webp');
    passou := true;
  EXCEPTION WHEN OTHERS THEN passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('ana escreve debaixo do proprio prefixo', 'true', passou::text);

  -- A Ana debaixo do prefixo do Bruno: não passa.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    INSERT INTO storage.objects (bucket_id, name)
      VALUES ('avatares', prefixo_bruno || '/roubada.webp');
    passou := true;
  EXCEPTION WHEN OTHERS THEN passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('ana escreve debaixo do prefixo do bruno', 'false', passou::text);

  -- Na raiz do balde, sem prefixo nenhum: não passa. Sem isto, um caminho
  -- `foto.webp` teria `foldername` vazio e escapava à comparação.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"aaaa1111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  BEGIN
    INSERT INTO storage.objects (bucket_id, name) VALUES ('avatares', 'solta.webp');
    passou := true;
  EXCEPTION WHEN OTHERS THEN passou := false;
  END;
  RESET ROLE;
  INSERT INTO r3 VALUES ('ana escreve na raiz do balde', 'false', passou::text);

  -- E o Bruno não apaga a fotografia da Ana.
  SET LOCAL ROLE authenticated;
  PERFORM set_config('request.jwt.claims', '{"sub":"bbbb2222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  DELETE FROM storage.objects WHERE bucket_id = 'avatares' AND name = prefixo_ana || '/uma.webp';
  RESET ROLE;
  INSERT INTO r3 VALUES ('a fotografia da ana sobreviveu ao bruno', '1',
    (SELECT count(*)::text FROM storage.objects
      WHERE bucket_id = 'avatares' AND name = prefixo_ana || '/uma.webp'));
END $$;

SELECT prova, esperado, obtido, (esperado = obtido) AS ok FROM r3 ORDER BY prova;

DO $$
DECLARE falhas int;
BEGIN
  SELECT count(*) INTO falhas FROM r3 WHERE esperado <> obtido;
  IF falhas > 0 THEN RAISE EXCEPTION 'perfil: % provas falharam', falhas; END IF;
END $$;

/* O resumo sai como resultado de consulta e não como NOTICE: um NOTICE vai
   para o stderr, e quem corre isto a partir do vitest lê o stdout. */
SELECT 'perfil: ' || count(*) || ' provas, ' ||
       count(*) FILTER (WHERE esperado <> obtido) || ' falhas' AS resumo
  FROM r3;

COMMIT;
