-- O braço «depois»: a mesma base com a `20260911000001` aplicada.
--
-- Prova as duas metades da correcção — que a escrita do cliente está fechada, e
-- que o que tinha de continuar a funcionar continua. A segunda não é enfeite: um
-- `REVOKE` a mais em `SELECT` calava cada entrega do Realtime, porque a
-- `mensagens_select_participante` faz um `EXISTS` sobre `marketplace_conversas`
-- com os privilégios de quem invoca.
BEGIN;

CREATE TEMP TABLE resultado(prova text, esperado text, obtido text) ON COMMIT DROP;
GRANT ALL ON resultado TO authenticated, anon;

INSERT INTO auth.users(id, email) VALUES
  ('11111111-1111-1111-1111-111111111111', 'comprador@exemplo.pt'),
  ('22222222-2222-2222-2222-222222222222', 'atacante@exemplo.pt'),
  ('33333333-3333-3333-3333-333333333333', 'vitima@exemplo.pt')
ON CONFLICT DO NOTHING;

INSERT INTO cavalos_venda(id, user_id, nome)
VALUES ('aaaaaaaa-0000-0000-0000-000000000009',
        '22222222-2222-2222-2222-222222222222', 'Zagalo')
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_conversas(id, cavalo_id, comprador_id, vendedor_id, comprador_nome)
VALUES ('bbbbbbbb-0000-0000-0000-000000000009','aaaaaaaa-0000-0000-0000-000000000009',
        '11111111-1111-1111-1111-111111111111','22222222-2222-2222-2222-222222222222','Comprador')
ON CONFLICT DO NOTHING;

INSERT INTO marketplace_mensagens(id, conversa_id, remetente_id, corpo)
VALUES ('cccccccc-0000-0000-0000-000000000009','bbbbbbbb-0000-0000-0000-000000000009',
        '11111111-1111-1111-1111-111111111111','Privado: o meu numero e 912345678')
ON CONFLICT DO NOTHING;

-- Corre `$corpo$` como `authenticated` com os claims de `$sub$` e grava em
-- `resultado` se a operação foi recusada.
--
-- ── Porque é que isto conta linhas e não se fica pelo erro ──────────────────
--
-- A primeira versão desta função dizia «recusado» a qualquer excepção e
-- «PASSOU» à ausência dela, e estava errada: **a RLS não levanta erro a negar
-- um UPDATE** — a linha simplesmente não entra no `USING` e a operação afecta
-- zero linhas, em silêncio. Verificada ao contrário, contra a base sem a
-- migração nova, a prova «participante reescreve uma mensagem» aparecia como
-- `PASSOU` quando na verdade nada tinha mudado: não há política de UPDATE nas
-- mensagens, e nunca houve.
--
-- Uma recusa é, portanto, qualquer uma de duas coisas: um erro de privilégio,
-- ou zero linhas afectadas. `PASSOU` exige que a base tenha mesmo mexido em
-- alguma coisa — e é por isso que um `GET DIAGNOSTICS` vale aqui mais do que um
-- `EXCEPTION`.
CREATE OR REPLACE FUNCTION pg_temp.recusa(prova text, sub text, corpo text) RETURNS void
LANGUAGE plpgsql AS $fn$
DECLARE linhas bigint := 0; erro boolean := false;
BEGIN
  BEGIN
    EXECUTE format('SET LOCAL ROLE authenticated');
    PERFORM set_config('request.jwt.claims',
      format('{"sub":"%s","role":"authenticated"}', sub), true);
    EXECUTE corpo;
    GET DIAGNOSTICS linhas = ROW_COUNT;
  EXCEPTION WHEN others THEN
    erro := true;
  END;
  RESET ROLE;
  INSERT INTO resultado VALUES (
    prova, 'recusado',
    CASE WHEN NOT erro AND linhas > 0 THEN 'PASSOU (' || linhas || ' linhas)' ELSE 'recusado' END);
END $fn$;

-- ── O que passa a ser recusado ─────────────────────────────────────────────

-- O sequestro do braço «antes», nas duas direcções.
SELECT pg_temp.recusa('vendedor reescreve comprador_id',
  '22222222-2222-2222-2222-222222222222',
  $$UPDATE marketplace_conversas SET comprador_id = '33333333-3333-3333-3333-333333333333'
     WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009'$$);

SELECT pg_temp.recusa('comprador reescreve vendedor_id',
  '11111111-1111-1111-1111-111111111111',
  $$UPDATE marketplace_conversas SET vendedor_id = '33333333-3333-3333-3333-333333333333'
     WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009'$$);

SELECT pg_temp.recusa('participante reaponta o cavalo_id',
  '11111111-1111-1111-1111-111111111111',
  $$UPDATE marketplace_conversas SET cavalo_id = 'aaaaaaaa-0000-0000-0000-000000000009'
     WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009'$$);

-- A prévia da caixa de entrada e o nome que o vendedor vê.
SELECT pg_temp.recusa('participante forja a previa',
  '11111111-1111-1111-1111-111111111111',
  $$UPDATE marketplace_conversas SET ultima_mensagem_previa = 'PREVIA FORJADA'
     WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009'$$);

SELECT pg_temp.recusa('participante reescreve o comprador_nome',
  '22222222-2222-2222-2222-222222222222',
  $$UPDATE marketplace_conversas SET comprador_nome = 'Portal Lusitano'
     WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009'$$);

SELECT pg_temp.recusa('participante arquiva o lado do outro',
  '11111111-1111-1111-1111-111111111111',
  $$UPDATE marketplace_conversas SET arquivada_vendedor = true
     WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009'$$);

SELECT pg_temp.recusa('participante apaga a conversa',
  '22222222-2222-2222-2222-222222222222',
  $$DELETE FROM marketplace_conversas WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009'$$);

SELECT pg_temp.recusa('participante abre uma conversa a mao',
  '22222222-2222-2222-2222-222222222222',
  $$INSERT INTO marketplace_conversas(cavalo_id, comprador_id, vendedor_id)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000009',
            '33333333-3333-3333-3333-333333333333','22222222-2222-2222-2222-222222222222')$$);

-- O histórico de alguém não se reescreve nem se apaga.
SELECT pg_temp.recusa('participante reescreve uma mensagem',
  '22222222-2222-2222-2222-222222222222',
  $$UPDATE marketplace_mensagens SET corpo = 'reescrita'
     WHERE id = 'cccccccc-0000-0000-0000-000000000009'$$);

SELECT pg_temp.recusa('participante apaga uma mensagem',
  '22222222-2222-2222-2222-222222222222',
  $$DELETE FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000009'$$);

-- ── E a vítima continua fora ───────────────────────────────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
INSERT INTO resultado SELECT 'vitima ve a mensagem', '0', count(*)::text
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000009';
RESET ROLE;

-- ── O que tinha de continuar a funcionar ───────────────────────────────────
-- Os dois participantes continuam a ler o fio. É esta leitura que o Realtime
-- faz por cada subscritor e por cada linha, e é com os privilégios dele.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
INSERT INTO resultado SELECT 'comprador continua a ler o fio', '1', count(*)::text
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000009';
INSERT INTO resultado SELECT 'comprador continua a ver a conversa', '1', count(*)::text
  FROM marketplace_conversas WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009';
RESET ROLE;

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
INSERT INTO resultado SELECT 'vendedor continua a ler o fio', '1', count(*)::text
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000009';
RESET ROLE;

-- A conversa está onde estava: nenhuma das recusas acima tocou na linha.
INSERT INTO resultado SELECT 'comprador_id intacto', '11111111-1111-1111-1111-111111111111',
  comprador_id::text FROM marketplace_conversas WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009';

-- E o gatilho da caixa de entrada continua a escrever a prévia: uma mensagem
-- nova pela chave de serviço põe a conversa em dia. É o UPDATE que o gatilho da
-- identidade imutável **não** pode travar.
INSERT INTO marketplace_mensagens(conversa_id, remetente_id, corpo)
VALUES ('bbbbbbbb-0000-0000-0000-000000000009','22222222-2222-2222-2222-222222222222','Ainda esta');
INSERT INTO resultado SELECT 'o gatilho da previa continua a escrever', 'Ainda esta',
  coalesce(ultima_mensagem_previa,'(nada)') FROM marketplace_conversas
 WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009';

SELECT prova, esperado, obtido, (esperado = obtido) AS ok FROM resultado ORDER BY prova;

DO $$
DECLARE falhas int;
BEGIN
  SELECT count(*) INTO falhas FROM resultado WHERE esperado <> obtido;
  IF falhas > 0 THEN RAISE EXCEPTION 'escrita da conversa: % provas falharam', falhas; END IF;
END $$;

SELECT 'escrita da conversa: ' || count(*) || ' provas, ' ||
       count(*) FILTER (WHERE esperado <> obtido) || ' falhas' AS resumo
  FROM resultado;

COMMIT;
