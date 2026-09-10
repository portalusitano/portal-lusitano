-- O braço «antes» do A/B: o sequestro de uma conversa contra uma base com as
-- duas migrações do chat e **sem** a `20260911000001`.
--
-- Existe pela razão que o `35-perfil-antes.sql` já escreve: uma correcção sem o
-- defeito reproduzido é uma afirmação sobre o passado que ninguém verificou. O
-- `13-conversa-depois.sql` mostra que hoje a base recusa; este mostra que ontem
-- aceitava, e os dois correm na mesma máquina e na mesma corrida.
--
-- O ataque é um `UPDATE` só, com a chave anónima e a sessão de quem o faz:
-- troca-se o comprador pela vítima e põe-se o atacante como vendedor. O
-- `WITH CHECK` da política aprova, porque o atacante continua a ser **uma** das
-- duas partes — e é tudo o que ela exige.
BEGIN;

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

-- A vítima não vê nada, antes do ataque.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM marketplace_mensagens
   WHERE id = 'cccccccc-0000-0000-0000-000000000009';
  IF n <> 0 THEN
    RAISE EXCEPTION 'antes: a vitima ja via a mensagem sem ataque (%), a montagem esta errada', n;
  END IF;
END $$;
RESET ROLE;

-- O ataque: o atacante é o vendedor desta conversa e reescreve a outra parte.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
UPDATE marketplace_conversas
   SET comprador_id = '33333333-3333-3333-3333-333333333333'
 WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009';
-- E a prévia da caixa de entrada, que não é a última mensagem de ninguém.
UPDATE marketplace_conversas
   SET ultima_mensagem_previa = 'PREVIA FORJADA', comprador_nome = 'Portal Lusitano'
 WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009';
RESET ROLE;

-- A vítima passa a ler o que o comprador original escreveu.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
DO $$
DECLARE corpo_lido text;
BEGIN
  SELECT corpo INTO corpo_lido FROM marketplace_mensagens
   WHERE id = 'cccccccc-0000-0000-0000-000000000009';

  -- Se isto disparar, o braço «antes» deixou de reproduzir o defeito e a prova
  -- do braço «depois» passa a não querer dizer nada.
  IF corpo_lido IS DISTINCT FROM 'Privado: o meu numero e 912345678' THEN
    RAISE EXCEPTION 'antes: o sequestro NAO passou (%) — o A/B perdeu o braco de controlo',
      coalesce(corpo_lido, '(nada)');
  END IF;
END $$;
RESET ROLE;

-- E o comprador original perdeu o fio onde escreveu.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM marketplace_conversas
   WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009';
  IF n <> 0 THEN
    RAISE EXCEPTION 'antes: o comprador original ainda ve o fio (%)', n;
  END IF;
END $$;
RESET ROLE;

/* Pelo stdout, pela mesma razão dos outros ficheiros: um NOTICE vai para o
   stderr e quem corre isto a partir do vitest lê o stdout. */
SELECT 'antes: o sequestro passou (comprador_id=' || comprador_id || ', previa=' ||
       ultima_mensagem_previa || ')' AS resumo
  FROM marketplace_conversas WHERE id = 'bbbbbbbb-0000-0000-0000-000000000009';

COMMIT;
