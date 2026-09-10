-- Prova da RLS que o Realtime aplica a cada subscritor.
--
-- O Realtime, para cada linha que sai do WAL e para cada subscritor, põe os
-- claims desse subscritor e pergunta à base se a linha lhe é visível. É
-- exactamente isso que este ficheiro faz: SET ROLE authenticated + claims, e
-- depois um SELECT pela chave primária da linha.
BEGIN;

CREATE TEMP TABLE resultado(prova text, esperado int, obtido int) ON COMMIT DROP;
GRANT ALL ON resultado TO authenticated, anon;

INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'comprador@exemplo.pt'),
  ('22222222-2222-2222-2222-222222222222', 'vendedor@exemplo.pt'),
  ('33333333-3333-3333-3333-333333333333', 'terceiro@exemplo.pt')
ON CONFLICT DO NOTHING;

INSERT INTO cavalos_venda(id, user_id, nome, vendedor_telefone, vendedor_email, vendedor_whatsapp)
VALUES ('aaaaaaaa-0000-0000-0000-000000000001','22222222-2222-2222-2222-222222222222',
        'Zagalo','+351 912 345 678','vendedor@exemplo.pt','+351912345678')
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_conversas(id, cavalo_id, comprador_id, vendedor_id, comprador_nome)
VALUES ('bbbbbbbb-0000-0000-0000-000000000001','aaaaaaaa-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Comprador')
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_mensagens(id, conversa_id, remetente_id, corpo)
VALUES ('cccccccc-0000-0000-0000-000000000001','bbbbbbbb-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111','Ainda está disponível?')
ON CONFLICT DO NOTHING;

-- ── comprador ──────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
INSERT INTO resultado SELECT 'comprador ve a mensagem', 1, count(*)::int
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000001';
RESET ROLE;

-- ── vendedor ───────────────────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
INSERT INTO resultado SELECT 'vendedor ve a mensagem', 1, count(*)::int
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000001';
RESET ROLE;

-- ── terceiro autenticado ───────────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
INSERT INTO resultado SELECT 'terceiro ve a mensagem', 0, count(*)::int
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000001';
INSERT INTO resultado SELECT 'terceiro ve a conversa', 0, count(*)::int
  FROM marketplace_conversas WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';
INSERT INTO resultado SELECT 'terceiro ve a tabela toda', 0, count(*)::int FROM marketplace_mensagens;
RESET ROLE;

-- ── anónimo ────────────────────────────────────────────────────────────────
SET LOCAL ROLE anon;
SELECT set_config('request.jwt.claims', '{"role":"anon"}', true);
INSERT INTO resultado SELECT 'anonimo ve a mensagem', 0, count(*)::int
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000001';
RESET ROLE;

SELECT prova, esperado, obtido, (esperado = obtido) AS ok FROM resultado ORDER BY prova;

DO $$
DECLARE falhas int;
BEGIN
  SELECT count(*) INTO falhas FROM resultado WHERE esperado <> obtido;
  IF falhas > 0 THEN RAISE EXCEPTION 'RLS: % provas falharam', falhas; END IF;
END $$;

/* O resumo sai como resultado de consulta e não como NOTICE: um NOTICE vai
   para o stderr, e quem corre isto a partir do vitest lê o stdout. */
SELECT 'RLS: ' || count(*) || ' provas, ' ||
       count(*) FILTER (WHERE esperado <> obtido) || ' falhas' AS resumo
  FROM resultado;

COMMIT;
