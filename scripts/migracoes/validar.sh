#!/usr/bin/env bash
#
# Corre uma migração deste repositório contra um PostgreSQL local, sobre uma
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
#      prova nada; o que se quer saber é se os dados entram, se sobrevivem à
#      ida e volta, e se as restrições recusam o que devem recusar.
#
# As provas do ponto 3 **são de cada migração**, e por isso vivem num ficheiro
# com o nome dela em `scripts/migracoes/provas/`. Estavam escritas aqui dentro
# e eram sobre `cavalos_venda`: qualquer outra migração que passasse por este
# guião falhava não por estar errada, mas por não ter tabela de ascendentes
# nenhuma para escrever. Um harness que só sabe validar uma migração é um
# harness que a migração seguinte contorna.
#
# Uma migração sem ficheiro de provas corre à mesma e diz-se que assim foi: os
# pontos 1 e 2 valem por si, e mentir que houve provas de escrita quando não
# houve seria pior do que não as ter.
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

NOME_MIGRACAO="$(basename "$MIGRACAO" .sql)"
PROVAS="$RAIZ/scripts/migracoes/provas/$NOME_MIGRACAO.sh"

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

depois=$("${PSQL[@]}" -At -d "$DB" -c \
  "SELECT count(*) FROM information_schema.columns
   WHERE table_schema='public' AND table_name='cavalos_venda';")
echo "colunas depois: $depois"

if [ -f "$PROVAS" ]; then
  echo
  echo "== provas de $NOME_MIGRACAO =="
  # O ficheiro de provas herda `DB` e `PSQL`, e `set -e` com ele: qualquer
  # comando que falhe lá dentro derruba o guião inteiro, que é o que se quer.
  export DB
  # shellcheck source=/dev/null
  source "$PROVAS"
else
  echo
  echo "(sem provas de escrita para $NOME_MIGRACAO — só idempotência e esquema)"
fi

echo
echo "TUDO VERDE — $antes → $depois colunas"
