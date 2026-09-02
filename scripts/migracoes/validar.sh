#!/usr/bin/env bash
#
# Corre uma migração de `cavalos_venda` contra um PostgreSQL local, sobre uma
# réplica do esquema vivo, antes de ela entrar no repositório — que é o que o
# `CLAUDE.md` exige e o que uma migração escrita à mão nunca dispensa.
#
# O que prova, e porquê cada coisa:
#
#   1. **Corre três vezes seguidas sem erro.** Idempotência não é um `IF NOT
#      EXISTS` escrito: é a migração a correr outra vez em cima de si própria.
#   2. **Corre sobre o esquema que produção tem**, não sobre um esquema
#      imaginado — é aí que um `ADD COLUMN` bate com uma coluna que já existe
#      com outro tipo.
#   3. **Escreve uma linha a sério.** Uma coluna criada e nunca escrita não
#      prova nada; o que se quer saber é se um anúncio com todos os blocos
#      entra, se o `false` do vendedor sobrevive à ida e volta pelo `jsonb`, e
#      se as restrições recusam o que devem recusar.
#
# Uso:
#   scripts/migracoes/validar.sh supabase/migrations/<ficheiro>.sql
#
# Precisa de um PostgreSQL local acessível por socket como `postgres`. Numa
# máquina limpa:  service postgresql start
#
set -euo pipefail

MIGRACAO="${1:?uso: validar.sh <caminho da migração .sql>}"
RAIZ="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BASE="$RAIZ/scripts/migracoes/esquema-vivo-cavalos-venda.sql"
DB="${DB_PROVA:-prova_lusitano}"
PSQL=(psql -h /var/run/postgresql -U postgres -v ON_ERROR_STOP=1 -q)

[ -f "$MIGRACAO" ] || { echo "migração não encontrada: $MIGRACAO" >&2; exit 1; }

echo "== base descartável: $DB =="
"${PSQL[@]}" -d postgres -c "DROP DATABASE IF EXISTS $DB;" >/dev/null
"${PSQL[@]}" -d postgres -c "CREATE DATABASE $DB;" >/dev/null
"${PSQL[@]}" -d "$DB" -f "$BASE"

antes=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='cavalos_venda';")
echo "colunas antes: $antes"

for passagem in 1 2 3; do
  echo "== migração, passagem $passagem =="
  "${PSQL[@]}" -d "$DB" -f "$MIGRACAO"
done

depois=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='cavalos_venda';")
echo "colunas depois: $depois"

echo
echo "== um anúncio com todos os blocos =="
"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.cavalos_venda
  (nome, slug, sexo, raca, peso_kg, anos_treino, uso_atual, prova_aptidao_apsl,
   morfologia, comportamento, saude, condicoes_venda)
VALUES
  ('Ulisses','ulisses-prova','Garanhão','Lusitano',512.5,7,
   ARRAY['Lazer','Competição'],true,
   '{\"cor_olhos\":\"Castanho\"}'::jsonb,
   '{\"apto_criancas\":false,\"habituado_campo\":true}'::jsonb,
   '{\"vacinacao_atualizada\":false}'::jsonb,
   '{\"exportacao_possivel\":true,\"preco_cobricao\":800}'::jsonb);" >/dev/null

"${PSQL[@]}" -d "$DB" -c "
INSERT INTO public.cavalos_venda_ascendentes (cavalo_id, caminho, geracao, nome, registo)
SELECT id, 'pai', 1, 'Rubi', 'PSL-1234' FROM public.cavalos_venda
WHERE slug='ulisses-prova';" >/dev/null

echo "o \`false\` do vendedor sobrevive à ida e volta:"
"${PSQL[@]}" -d "$DB" -At -c "
  SELECT '  apto_criancas=' || (comportamento->>'apto_criancas')
       || ' vacinacao=' || (saude->>'vacinacao_atualizada')
       || ' peso=' || peso_kg || ' usos=' || array_length(uso_atual,1)
  FROM public.cavalos_venda WHERE slug='ulisses-prova';"

echo
echo "== o que as restrições têm de recusar =="
if "${PSQL[@]}" -d "$DB" -c "
  INSERT INTO public.cavalos_venda_ascendentes (cavalo_id, caminho, geracao, nome)
  SELECT id, 'pai', 1, 'Outro' FROM public.cavalos_venda
  WHERE slug='ulisses-prova';" >/dev/null 2>&1; then
  echo "  FALHA: o caminho repetido foi aceite"; exit 1
fi
echo "  caminho repetido: recusado"

if "${PSQL[@]}" -d "$DB" -c "
  INSERT INTO public.cavalos_venda_ascendentes (cavalo_id, caminho, geracao)
  SELECT id, 'mae', 1 FROM public.cavalos_venda
  WHERE slug='ulisses-prova';" >/dev/null 2>&1; then
  echo "  FALHA: o antepassado sem nome e sem registo foi aceite"; exit 1
fi
echo "  antepassado vazio: recusado"

echo
echo "== apagar o anúncio leva a árvore atrás =="
"${PSQL[@]}" -d "$DB" -c "DELETE FROM public.cavalos_venda WHERE slug='ulisses-prova';" >/dev/null
restantes=$("${PSQL[@]}" -d "$DB" -At -c \
  "SELECT count(*) FROM public.cavalos_venda_ascendentes;")
[ "$restantes" = "0" ] || { echo "  FALHA: ficaram $restantes ascendentes órfãos"; exit 1; }
echo "  ascendentes restantes: 0"

echo
echo "TUDO VERDE — $antes → $depois colunas"
