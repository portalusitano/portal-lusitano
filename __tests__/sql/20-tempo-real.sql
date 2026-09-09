-- Provas sobre o que a migração do tempo real acrescenta.
BEGIN;

CREATE TEMP TABLE r2(prova text, esperado text, obtido text) ON COMMIT DROP;
GRANT ALL ON r2 TO authenticated, anon;

-- O gatilho preencheu o destinatário da mensagem semeada em 10-rls.sql.
INSERT INTO r2 SELECT 'destinatario da mensagem do comprador',
  '22222222-2222-2222-2222-222222222222', destinatario_id::text
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000001';

-- A publicação tem a tabela lá dentro.
INSERT INTO r2 SELECT 'marketplace_mensagens na publicacao', 'true',
  EXISTS (SELECT 1 FROM pg_publication_tables
           WHERE pubname='supabase_realtime' AND tablename='marketplace_mensagens')::text;

-- ── Um participante não consegue forjar o destinatário ─────────────────────
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
INSERT INTO marketplace_mensagens(id, conversa_id, remetente_id, corpo, destinatario_id)
VALUES ('cccccccc-0000-0000-0000-000000000002','bbbbbbbb-0000-0000-0000-000000000001',
        '11111111-1111-1111-1111-111111111111','Forjada',
        '11111111-1111-1111-1111-111111111111');
RESET ROLE;

INSERT INTO r2 SELECT 'destinatario forjado pelo cliente foi reescrito',
  '22222222-2222-2222-2222-222222222222', destinatario_id::text
  FROM marketplace_mensagens WHERE id = 'cccccccc-0000-0000-0000-000000000002';

-- ── O filtro do Realtime não é uma porta ───────────────────────────────────
-- Um terceiro que subscreva `destinatario_id=eq.<vendedor>` continua a ver
-- zero: quem decide é a RLS, e o filtro só encolhe o que ela já autoriza.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
INSERT INTO r2 SELECT 'terceiro subscreve o filtro do vendedor', '0', count(*)::text
  FROM marketplace_mensagens WHERE destinatario_id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

-- E o próprio vendedor, com o mesmo filtro, vê as duas.
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claims', '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
INSERT INTO r2 SELECT 'vendedor subscreve o filtro proprio', '2', count(*)::text
  FROM marketplace_mensagens WHERE destinatario_id = '22222222-2222-2222-2222-222222222222';
RESET ROLE;

-- ── O Realtime entrega a linha inteira ─────────────────────────────────────
-- E a linha inteira não passa pelo `lib/chat/vista-publica`: o que sai pelo
-- socket é o que está na tabela, coluna a coluna. A promessa da página inicial
-- — «Fale com o vendedor sem publicar o seu número» — depende, deste lado, de
-- uma coisa só: **estas duas tabelas não guardarem contactos**. Se alguém lhes
-- acrescentar um `telefone` para poupar uma junção, o canal passa a publicá-lo
-- sem uma linha de código de cliente mudar.
INSERT INTO r2 SELECT 'colunas de contacto nas tabelas do chat', '0', count(*)::text
  FROM information_schema.columns
 WHERE table_schema = 'public'
   AND table_name IN ('marketplace_mensagens', 'marketplace_conversas')
   AND (column_name ILIKE '%telefone%' OR column_name ILIKE '%email%'
        OR column_name ILIKE '%whatsapp%' OR column_name ILIKE '%telemovel%'
        OR column_name ILIKE '%contacto%');

-- A pré-visualização que o gatilho escreve é a última mensagem, e é ela que a
-- caixa de entrada usa em vez de ler a tabela das mensagens.
INSERT INTO r2 SELECT 'previa da ultima mensagem', 'Forjada',
  ultima_mensagem_previa FROM marketplace_conversas
 WHERE id = 'bbbbbbbb-0000-0000-0000-000000000001';

SELECT prova, esperado, obtido, (esperado = obtido) AS ok FROM r2 ORDER BY prova;

DO $$
DECLARE falhas int;
BEGIN
  SELECT count(*) INTO falhas FROM r2 WHERE esperado IS DISTINCT FROM obtido;
  IF falhas > 0 THEN RAISE EXCEPTION 'tempo real: % provas falharam', falhas; END IF;
END $$;

SELECT 'tempo real: ' || count(*) || ' provas, ' ||
       count(*) FILTER (WHERE esperado IS DISTINCT FROM obtido) || ' falhas' AS resumo
  FROM r2;

COMMIT;
