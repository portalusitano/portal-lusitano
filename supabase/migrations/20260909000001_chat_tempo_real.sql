-- Migração: o chat do marketplace em tempo real, com estado de entrega
-- Data: 2026-09-09
--
-- ── O que estava partido ────────────────────────────────────────────────────
--
-- Uma mensagem enviada por uma pessoa só aparecia do outro lado se essa outra
-- pessoa recarregasse a página. O distintivo de não lidas era sondado de
-- minuto a minuto, o que quer dizer que a mediana da espera era **trinta
-- segundos** — e continuava a correr com o separador escondido. Isto não é um
-- chat, é um formulário com histórico.
--
-- ── O que esta migração acrescenta, e porquê cada coisa ─────────────────────
--
-- 1. `destinatario_id` — quem é a outra parte, escrito na própria mensagem.
--    Não é desnormalização por gosto: é o que torna possíveis as duas coisas
--    seguintes.
--
--    a) O Realtime da Supabase só sabe filtrar uma subscrição por **uma**
--       igualdade (`coluna=eq.valor`). Sem esta coluna, um cliente que queira
--       saber das suas mensagens teria de subscrever a tabela inteira e
--       deixar a RLS deitar fora as dos outros — ou seja, o servidor avalia a
--       política de toda a gente ligada contra todas as mensagens do site.
--       Com ela, cada cliente subscreve `destinatario_id=eq.<eu>`.
--
--    b) A contagem de não lidas passa de **duas** perguntas para **uma**.
--       Antes: listar todas as conversas em que participo e depois contar as
--       mensagens dessas conversas com `IN (...)` — uma lista que cresce com o
--       número de conversas e que vai por dentro do URL do PostgREST. Agora é
--       um `count` com igualdade sobre um índice.
--
--    Quem a escreve é um gatilho e nunca a API: a política de INSERT deixa
--    qualquer participante escrever na conversa, e sem o gatilho um cliente
--    podia declarar-se destinatário de si próprio e nunca ser contado. O valor
--    é derivado da conversa, que é a única fonte de verdade sobre quem são as
--    duas partes.
--
-- 2. `entregue_at` — o estado do meio. Ver a nota longa mais abaixo.
--
-- 3. A publicação que o Realtime lê. Sem a tabela lá dentro, o WAL não sai do
--    Postgres e a subscrição fica calada sem um único erro do lado do cliente.
--
-- Quem decide quem recebe o quê continua a ser a RLS que já cá estava: o
-- Realtime avalia a política de SELECT de cada subscritor contra cada linha
-- antes de lha entregar. O filtro por `destinatario_id` é economia, não
-- segurança — subscrever `destinatario_id=eq.<outra pessoa>` continua a
-- devolver zero linhas, e isso está provado contra um PostgreSQL local.

-- =============================================================================
-- 0. Pré-requisito
-- =============================================================================
DO $$
BEGIN
  IF to_regclass('public.marketplace_mensagens') IS NULL THEN
    RAISE EXCEPTION
      'A tabela public.marketplace_mensagens nao existe. Aplique primeiro a migracao 20260829000002_marketplace_chat.sql.';
  END IF;
END $$;

-- =============================================================================
-- 1. Colunas novas
-- =============================================================================

-- Quem tem de receber esta mensagem. Derivada da conversa por gatilho.
ALTER TABLE marketplace_mensagens
  ADD COLUMN IF NOT EXISTS destinatario_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;

-- O momento em que a aplicação do destinatário foi avisada desta mensagem.
--
-- ── Porque é que isto é honesto e «entregue ao telemóvel» não seria ─────────
--
-- A base não sabe nada sobre telemóveis, browsers ou notificações. O que ela
-- pode saber com certeza é uma coisa só: **o servidor disse ao destinatário
-- que esta mensagem existe**. É isso que esta coluna guarda, e é escrita nos
-- dois sítios em que isso acontece — a contagem de não lidas e a abertura da
-- caixa de entrada.
--
-- O que não se inventa: não há «entregue» a partir do email de aviso (um email
-- enviado não é um email lido), nem a partir do envio (aí a mensagem só está
-- escrita), nem a partir de um relógio. Um estado que a base não sabe provar
-- não sai desta tabela.
ALTER TABLE marketplace_mensagens
  ADD COLUMN IF NOT EXISTS entregue_at TIMESTAMPTZ;

-- O princípio da última mensagem, para a caixa de entrada não ter de ler a
-- tabela das mensagens.
--
-- ── Porque é que isto vale uma coluna desnormalizada ────────────────────────
--
-- A caixa de entrada precisa de duas coisas por conversa: quantas estão por
-- ler e o princípio da última. A primeira já sai de um índice. A segunda —
-- «a última linha de cada grupo» — não tem resposta no PostgREST sem um
-- `DISTINCT ON`, e a rota resolvia-a **trazendo todas as mensagens de todas as
-- conversas** e ficando com a última de cada uma em JavaScript. Medido no
-- banco de ensaio (2 000 conversas, 60 652 mensagens), para uma caixa de
-- entrada de 40 conversas em que uma é antiga: **1 970 linhas lidas para
-- escrever 40 pré-visualizações**. Com a coluna, zero — e as não lidas passam
-- a sair do índice parcial. Em A/B intercalado, 30 pares: **1,027ms →
-- 0,137ms**.
--
-- Duzentos caracteres porque a pré-visualização corta aos 120 e um `…` não
-- precisa de mais do que isso; guardar o corpo inteiro seria guardar duas
-- vezes a mesma conversa.
ALTER TABLE marketplace_conversas
  ADD COLUMN IF NOT EXISTS ultima_mensagem_previa TEXT;

-- =============================================================================
-- 2. Gatilho que preenche o destinatário
-- =============================================================================
CREATE OR REPLACE FUNCTION marketplace_mensagens_destinatario()
RETURNS TRIGGER
LANGUAGE plpgsql
-- SECURITY DEFINER para que a leitura da conversa não dependa da RLS de quem
-- escreve: o remetente vê sempre a sua própria conversa, mas uma política
-- futura mais apertada não pode ter como efeito deixar o destinatário a nulo.
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  SELECT CASE WHEN c.comprador_id = NEW.remetente_id THEN c.vendedor_id ELSE c.comprador_id END
    INTO NEW.destinatario_id
    FROM marketplace_conversas c
   WHERE c.id = NEW.conversa_id;

  IF NEW.destinatario_id IS NULL THEN
    RAISE EXCEPTION 'Mensagem sem destinatario: a conversa % nao existe', NEW.conversa_id;
  END IF;

  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_mensagens_destinatario ON marketplace_mensagens;
CREATE TRIGGER trg_mensagens_destinatario
  BEFORE INSERT OR UPDATE OF conversa_id, remetente_id ON marketplace_mensagens
  FOR EACH ROW EXECUTE FUNCTION marketplace_mensagens_destinatario();

-- Preenche o que já lá estava. Fora de qualquer condição: um UPDATE que não
-- encontra linhas custa nada e é o que torna esta migração repetível.
UPDATE marketplace_mensagens m
   SET destinatario_id = CASE
         WHEN c.comprador_id = m.remetente_id THEN c.vendedor_id
         ELSE c.comprador_id
       END
  FROM marketplace_conversas c
 WHERE c.id = m.conversa_id
   AND m.destinatario_id IS NULL;

-- Só depois do preenchimento. Idempotente: SET NOT NULL numa coluna que já é
-- NOT NULL é uma no-op.
ALTER TABLE marketplace_mensagens ALTER COLUMN destinatario_id SET NOT NULL;

-- =============================================================================
-- 2b. Gatilho que mantém a caixa de entrada em dia
-- =============================================================================
-- Isto estava escrito na API, em dois `UPDATE` a seguir a cada `INSERT` — um
-- na rota que abre a conversa e outro na que responde, com regras
-- ligeiramente diferentes (só uma delas desarquivava). Duas escritas por
-- mensagem, e uma janela entre elas em que a caixa de entrada mostrava a
-- ordem errada.
--
-- Passa a ser uma consequência de haver mensagem, escrita uma vez e no sítio
-- por onde toda a gente passa. Desarquivar faz parte: uma conversa que recebe
-- uma mensagem nova volta às duas caixas de entrada, senão arquivar é a
-- maneira de nunca mais saber de alguém.
CREATE OR REPLACE FUNCTION marketplace_conversas_ultima_mensagem()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  UPDATE marketplace_conversas
     SET ultima_mensagem_at = NEW.created_at,
         ultima_mensagem_previa = left(NEW.corpo, 200),
         arquivada_comprador = false,
         arquivada_vendedor = false
   WHERE id = NEW.conversa_id;
  RETURN NULL;
END $$;

DROP TRIGGER IF EXISTS trg_conversas_ultima_mensagem ON marketplace_mensagens;
CREATE TRIGGER trg_conversas_ultima_mensagem
  AFTER INSERT ON marketplace_mensagens
  FOR EACH ROW EXECUTE FUNCTION marketplace_conversas_ultima_mensagem();

-- Preenche as pré-visualizações do que já lá está.
UPDATE marketplace_conversas c
   SET ultima_mensagem_previa = left(u.corpo, 200)
  FROM (
    SELECT DISTINCT ON (conversa_id) conversa_id, corpo
      FROM marketplace_mensagens
     ORDER BY conversa_id, created_at DESC, id DESC
  ) u
 WHERE u.conversa_id = c.id
   AND c.ultima_mensagem_previa IS NULL;

-- =============================================================================
-- 3. Índices
-- =============================================================================

-- O distintivo da navegação: uma igualdade sobre um índice parcial. As linhas
-- lidas não entram no índice, e são a esmagadora maioria de uma conversa
-- velha.
--
-- O `conversa_id` vem a seguir porque a caixa de entrada faz a mesma pergunta
-- repartida por conversa: com ele, a contagem por conversa lê-se do índice sem
-- ir à tabela.
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario_por_ler
  ON marketplace_mensagens (destinatario_id, conversa_id)
  WHERE lida_at IS NULL;

-- As que ainda não foram anunciadas ao destinatário. Mesmo raciocínio.
CREATE INDEX IF NOT EXISTS idx_mensagens_destinatario_por_entregar
  ON marketplace_mensagens (destinatario_id)
  WHERE entregue_at IS NULL;

-- Paginação do fio, do mais recente para trás. O `id` entra no índice porque
-- entra no cursor: duas mensagens podem partilhar o `created_at` ao
-- microssegundo, e sem um desempate a página seguinte podia repetir ou saltar
-- uma linha.
CREATE INDEX IF NOT EXISTS idx_mensagens_fio_recente
  ON marketplace_mensagens (conversa_id, created_at DESC, id DESC);

-- =============================================================================
-- 4. A publicação que o Realtime lê
-- =============================================================================
-- Sem isto a subscrição liga-se, diz «SUBSCRIBED» e nunca recebe nada — é a
-- falha mais silenciosa desta funcionalidade inteira, e por isso fica na
-- migração e não num painel de administração que ninguém sabe que existe.
--
-- A REPLICA IDENTITY fica em DEFAULT **de propósito**, e foi ensaiada antes de
-- se decidir. FULL põe a linha **antiga** inteira no WAL a cada UPDATE; o que
-- o Realtime precisa de ver para avaliar a nossa política de SELECT
-- (`conversa_id`) vem no registo **novo**, que é completo tanto no INSERT como
-- no UPDATE. FULL só serviria para ler o registo antigo, que nenhum ecrã desta
-- funcionalidade mostra.
--
-- Medido num PostgreSQL 16 local com `wal_level = logical` — sem isso a
-- pergunta nem sequer se faz, e a primeira medição, feita em `replica`, dava
-- uns enganadores +1,3% —, em A/B intercalado de 8 pares, marcando 985
-- mensagens como lidas de cada vez: **746 028 → 944 256 bytes de WAL, +26,6%**.
-- Um quarto mais de WAL por cada marcação de leitura, para uma informação que
-- ninguém lê. Não entra.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public'
       AND tablename = 'marketplace_mensagens'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE marketplace_mensagens;
  END IF;
END $$;

-- =============================================================================
-- 5. Nota sobre a RLS
-- =============================================================================
-- Não se acrescenta política nenhuma. As que a migração 20260829000002 criou
-- são exactamente as que o Realtime aplica a cada subscritor, e a prova está
-- em `__tests__/lib/chat-rls.sql.test.ts` (corre contra o PostgreSQL local
-- quando existe um, e diz porque saltou quando não existe).
--
-- O que **não** se pode fazer daqui para a frente: dar ao papel `anon` um
-- SELECT nestas tabelas, ou acrescentar uma política com `USING (true)`. Ou
-- uma ou outra abre o canal a toda a gente sem uma única linha de código de
-- cliente mudar.
