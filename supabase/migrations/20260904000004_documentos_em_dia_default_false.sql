-- `documentos_em_dia` afirmava por omissão aquilo que só o vendedor pode
-- declarar.
--
-- A coluna tinha `DEFAULT true`: um anúncio que nunca respondesse à pergunta
-- lia-se como «documentos em dia». O nome tem forma de facto verificado, o
-- dado é uma resposta de sim ou não que o vendedor dá sobre si próprio, e o
-- default acrescentava-lhe uma terceira camada — dizer que sim por ninguém ter
-- dito nada.
--
-- Até `6bc51db` (1 de Setembro de 2026) o webhook escrevia
-- `formData.documentosEmDia || true`, o que dava `true` sempre. Nas linhas
-- escritas antes dessa data não haveria como distinguir «respondeu que sim» de
-- «nunca respondeu»: a informação era destruída na escrita. Verificado antes de
-- aplicar: a tabela tem **zero linhas**, por isso não há passado a corrigir e
-- não se corre nenhum backfill — que seria sempre assimétrico, a apagar «sim»
-- verdadeiros para apanhar os falsos.
--
-- O lado da escrita já estava corrigido; isto fecha o lado do esquema.
--
-- Idempotente.

alter table public.cavalos_venda
  alter column documentos_em_dia set default false;
