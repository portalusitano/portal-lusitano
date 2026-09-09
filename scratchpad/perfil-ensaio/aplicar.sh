#!/bin/sh
# Aplica a migração do perfil duas vezes a uma base local e corre as provas.
# É o mesmo que o `__tests__/lib/perfil-rls.sql.test.ts` faz; existe à parte
# para se poder iterar sem passar pelo vitest.
set -e
BASE=${BASE:-perfil_teste}
P="psql -U postgres -h /var/run/postgresql -v ON_ERROR_STOP=1"

$P -d postgres -q -c "DROP DATABASE IF EXISTS $BASE"
$P -d postgres -q -c "CREATE DATABASE $BASE"

$P -d "$BASE" -q -f __tests__/sql/00-prelude.sql
$P -d "$BASE" -q -f supabase/migrations/004_user_auth_tools.sql 2>&1 | grep -v skipping || true
$P -d "$BASE" -q -f __tests__/sql/30-prelude-perfil.sql 2>&1 | grep -v skipping || true

for volta in 1 2; do
  echo "-- volta $volta"
  $P -d "$BASE" -q -f supabase/migrations/20260910000001_perfil_com_fotografia.sql 2>&1 |
    grep -v skipping || true
done

echo "=== PROVAS ==="
$P -d "$BASE" -f __tests__/sql/40-perfil.sql 2>&1 | tail -32
