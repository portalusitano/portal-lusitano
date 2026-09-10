-- Dá destino aos campos que o formulário de publicar anúncio pede e deita fora.
--
-- Contexto medido, em `docs/campos-do-anuncio.md`: o formulário tem 99 campos,
-- o pedido de checkout envia 103 chaves, o webhook escreve 29 colunas, e das 99
-- respostas do vendedor **só 19 chegam a uma coluna**. As outras 80 viajam do
-- browser até ao servidor, ficam guardadas em `contact_submissions.form_data`
-- (que é a tabela do administrador, não a do anúncio) e nunca mais são lidas
-- por ninguém.
--
-- O dono do site quer que nada seja opcional. O pré-requisito de «nada
-- opcional» é os campos terem onde aterrar: exigir oitenta respostas para as
-- deitar ao lixo é pedir trabalho a troco de nada.
--
-- ─── Como se decidiu o destino de cada campo ─────────────────────────────────
--
-- 1. **Coluna própria** quando o valor tem de ser alcançável por um `WHERE` ou
--    um `ORDER BY` do PostgREST — ou porque já é filtro hoje, ou porque é da
--    mesma classe dos que já são coluna (`sexo`, `idade`, `altura`, `preco`,
--    `regiao`, `nivel_treino`, `disciplinas`). O peso é da classe da altura; a
--    raça é da classe da pelagem; `uso_atual` é da classe de `disciplinas`.
--
-- 2. **`jsonb` agrupado** quando o bloco se lê inteiro na ficha e nenhum campo
--    isolado é chave de pesquisa. São seis blocos e cobrem 45 dos 80 campos.
--    Um `jsonb` continua a ser filtrável (`comportamento->>'apto_criancas'`),
--    por isso agrupar não fecha nenhuma porta — só evita 45 colunas que
--    ninguém consulta uma a uma.
--
-- 3. **Tabela à parte** para a ascendência. Oito colunas de avós resolvem duas
--    gerações e mais nenhuma; um caminho (`pai.mae`) resolve as que vierem sem
--    outra migração. E é uma árvore: o mesmo desenho serve o bisavô.
--
-- 4. **Não guardar** o que não serve o anúncio nem a moderação. São três, e a
--    razão é a mesma para os três: `cavalos_venda` é lida por **qualquer**
--    pessoa quando `status = 'active'` — a política `cavalos_venda_select_active`
--    não tem papel nenhum atribuído, e o RLS do Postgres é por linha, não por
--    coluna. Tudo o que aqui entrar fica publicado. O NIF e a morada do
--    vendedor são dados fiscais e ficam onde já estão, em
--    `contact_submissions`, cujas duas únicas políticas exigem `service_role`.
--    O nome do veterinário é o nome de um terceiro que nunca consentiu em ser
--    publicado num classificados.
--
-- ─── Duas escolhas de tipo que se explicam ───────────────────────────────────
--
-- **Todas as colunas de texto novas são `text` e não `varchar(n)`.** No
-- Postgres os dois têm o mesmo desempenho, e o limite não compra nada: compra
-- um `22001 value too long` no `insert` do webhook, que corre **depois de o
-- dinheiro entrar**. Um anúncio pago que não se publica porque o nome de
-- registo tinha 260 caracteres é o pior desfecho possível desta tabela.
--
-- **`peso_kg` é `numeric` sem precisão e `anos_treino` é `integer`.** Pela
-- mesma razão: um `numeric(4,1)` rebenta com 22003 em 1500 kg e um `smallint`
-- rebenta com 22003 em 99999 anos. O sítio de recusar um peso absurdo é a
-- validação do formulário e a moderação — não é uma excepção do Postgres a
-- meio de um webhook de pagamento.
--
-- ─── Índices, e porque não há nenhum aqui ────────────────────────────────────
--
-- Não se acrescenta um índice GIN por cada `jsonb` nem um btree por cada
-- coluna nova. A tabela tem hoje **zero linhas** e viverá em centenas: um
-- varrimento sequencial ganha a um índice a esta escala, e seis GIN por
-- consultas que ninguém escreveu ainda é custo de escrita a troco de uma
-- hipótese. A única excepção considerada — um `UNIQUE` em `microchip`, para
-- apanhar o mesmo cavalo anunciado duas vezes — foi rejeitada: um cavalo
-- revendido anos depois é um anúncio legítimo com o mesmo microchip, e a
-- restrição recusá-lo-ia no `insert` do webhook, outra vez depois de o
-- dinheiro entrar. Duplicados são trabalho de moderação, não de restrição.
--
-- Idempotente de propósito: corre inteira as vezes que forem precisas.

-- ─── Colunas próprias ────────────────────────────────────────────────────────

ALTER TABLE public.cavalos_venda
  -- Identificação. `raca` não é só um campo que faltava: `app/api/cavalos`
  -- **já a pede** no `.select(...)` e a base não a tem, o que devolve 42703 e
  -- deixa a listagem vazia. Os tipos gerados em `lib/database.types.ts` ainda
  -- a declaram, e é por isso que o teste `colunas-supabase` não deu por nada.
  ADD COLUMN IF NOT EXISTS raca text,
  ADD COLUMN IF NOT EXISTS nome_registo text,
  ADD COLUMN IF NOT EXISTS microchip text,
  ADD COLUMN IF NOT EXISTS passaporte_equino text,
  ADD COLUMN IF NOT EXISTS pais_nascimento text,
  ADD COLUMN IF NOT EXISTS peso_kg numeric,
  ADD COLUMN IF NOT EXISTS nivel_apsl text,
  ADD COLUMN IF NOT EXISTS prova_aptidao_apsl boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS temperamento text,
  ADD COLUMN IF NOT EXISTS coudelaria_origem text,
  -- Treino. `anos_treino` e `nivel_cavaleiro` são da classe de `nivel_treino`,
  -- que já é coluna; `uso_atual` é da classe de `disciplinas`, que já é `text[]`.
  ADD COLUMN IF NOT EXISTS anos_treino integer,
  ADD COLUMN IF NOT EXISTS nivel_cavaleiro text,
  ADD COLUMN IF NOT EXISTS uso_atual text[],
  -- Vendedor. `vendedor_tipo` distingue particular de profissional e de
  -- coudelaria, que é a primeira coisa que um comprador quer saber e a
  -- primeira que a moderação verifica.
  ADD COLUMN IF NOT EXISTS vendedor_tipo text,
  ADD COLUMN IF NOT EXISTS vendedor_pais text,
  ADD COLUMN IF NOT EXISTS vendedor_website text,
  -- O formulário pede dois vídeos. `video_url` já existe e já é contrato com a
  -- área do vendedor (`SELLER_EDITABLE_FIELDS`) e com `lib/marketplace-listings`;
  -- transformá-la em `text[]` era migrar um contrato vivo por causa de um
  -- segundo valor. O formulário pede dois, não pede N.
  ADD COLUMN IF NOT EXISTS video_url_2 text;

-- ─── Blocos `jsonb` ──────────────────────────────────────────────────────────
--
-- Sem `DEFAULT '{}'`: um objecto vazio afirma «o vendedor não respondeu a
-- nada» e um `NULL` afirma «não há bloco». São coisas diferentes, e a ficha
-- lê-as de maneira diferente — a regra de `lib/coudelaria-ficha.ts` de não
-- afirmar o que os dados não provam vale aqui do mesmo modo.

ALTER TABLE public.cavalos_venda
  ADD COLUMN IF NOT EXISTS morfologia jsonb,
  ADD COLUMN IF NOT EXISTS treino jsonb,
  ADD COLUMN IF NOT EXISTS comportamento jsonb,
  ADD COLUMN IF NOT EXISTS maneio jsonb,
  ADD COLUMN IF NOT EXISTS saude jsonb,
  ADD COLUMN IF NOT EXISTS condicoes_venda jsonb;

COMMENT ON COLUMN public.cavalos_venda.morfologia IS
  'cor_olhos, cor_crina, cor_casco, marcas_distintivas. Lê-se inteiro na ficha.';
COMMENT ON COLUMN public.cavalos_venda.treino IS
  'treinador_atual, ginete_habitual, competicoes. O nível e os anos são colunas.';
COMMENT ON COLUMN public.cavalos_venda.comportamento IS
  'Os oito booleanos de maneabilidade: habituado_transporte, habituado_ferrador, habituado_veterinario, trabalha_em_grupo, trabalha_solto, trabalha_a_mao, habituado_campo, apto_criancas.';
COMMENT ON COLUMN public.cavalos_venda.maneio IS
  'regime_estabulacao, tipo_alimentacao, horas_trabalho_semana, teste_dna_realizado, seguro_equino.';
COMMENT ON COLUMN public.cavalos_venda.saude IS
  'Doze campos de saúde. Inclui vacinacao_atualizada e desparasitacao_atualizada, que até aqui eram reduzidas a um E lógico em documentos_em_dia e perdidas.';
COMMENT ON COLUMN public.cavalos_venda.condicoes_venda IS
  'Treze condições de negócio: trial, financiamento, exportação, cobrição, visita, equipamento, motivo. O preço, o negociável, a troca e o transporte continuam colunas próprias por serem filtro.';

COMMENT ON COLUMN public.cavalos_venda.peso_kg IS
  'Quilos, como o vendedor os escreveu. Sem precisão declarada de propósito — ver o cabeçalho da migração.';

-- ─── A ascendência ───────────────────────────────────────────────────────────
--
-- `caminho` é a posição na árvore vista do exemplar: 'pai', 'mae', 'pai.pai',
-- 'pai.mae', 'mae.pai', 'mae.mae'. Uma terceira geração acrescenta linhas, não
-- colunas.
--
-- `cavalos_venda.pai` e `.mae` continuam a existir e a ser escritas. É
-- duplicação, e é deliberada: são elas que o cartão e o `<Pedigree>` já lêem, e
-- trocar esse caminho de leitura não é trabalho desta migração. A tabela é a
-- árvore inteira — incluindo os números de registo do pai e da mãe, que não
-- tinham sítio nenhum.

CREATE TABLE IF NOT EXISTS public.cavalos_venda_ascendentes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cavalo_id uuid NOT NULL REFERENCES public.cavalos_venda(id) ON DELETE CASCADE,
  caminho text NOT NULL,
  geracao smallint NOT NULL,
  nome text,
  registo text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT cavalos_venda_ascendentes_caminho_unico UNIQUE (cavalo_id, caminho),
  -- Uma linha sem nome e sem registo não é um antepassado, é uma linha vazia.
  CONSTRAINT cavalos_venda_ascendentes_nao_vazio
    CHECK (nome IS NOT NULL OR registo IS NOT NULL)
);

COMMENT ON TABLE public.cavalos_venda_ascendentes IS
  'Ascendência do cavalo anunciado. Uma linha por antepassado, identificado pelo caminho a partir do exemplar.';

-- O `UNIQUE (cavalo_id, caminho)` já dá o índice pelo qual a ficha procura;
-- não se acrescenta outro.

ALTER TABLE public.cavalos_venda_ascendentes ENABLE ROW LEVEL SECURITY;

-- As políticas espelham as de `cavalos_venda`: a árvore é tão pública quanto o
-- anúncio a que pertence, e nunca mais do que isso.
DROP POLICY IF EXISTS cavalos_venda_ascendentes_select_active ON public.cavalos_venda_ascendentes;
CREATE POLICY cavalos_venda_ascendentes_select_active
  ON public.cavalos_venda_ascendentes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cavalos_venda c
      WHERE c.id = cavalos_venda_ascendentes.cavalo_id
        AND c.status = 'active'
    )
  );

DROP POLICY IF EXISTS cavalos_venda_ascendentes_select_own ON public.cavalos_venda_ascendentes;
CREATE POLICY cavalos_venda_ascendentes_select_own
  ON public.cavalos_venda_ascendentes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.cavalos_venda c
      WHERE c.id = cavalos_venda_ascendentes.cavalo_id
        AND c.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS cavalos_venda_ascendentes_service_role ON public.cavalos_venda_ascendentes;
CREATE POLICY cavalos_venda_ascendentes_service_role
  ON public.cavalos_venda_ascendentes FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
