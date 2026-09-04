# Validação do RLS

Os três ficheiros aqui não são migrações e **não** correm sozinhos. São a prova
que acompanha `supabase/migrations/20260904000001_rls_fechar_tabelas_abertas.sql`.

O que provam: que a chave anónima — a `NEXT_PUBLIC_SUPABASE_ANON_KEY`, que vai
no JavaScript entregue a toda a gente — lia e escrevia tabelas que não devia, e
que depois da migração deixa de o fazer sem que nada do que o site precisa se
perca.

| Ficheiro                 | O que é                                                                                                                                                      |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rls-esquema-actual.sql` | Reproduz o estado de produção: papéis do Supabase, tabelas, GRANTs por omissão e as políticas como `pg_policies` as mostra, com os nomes trocados incluídos. |
| `rls-prova-antes.sql`    | Operações feitas como `anon`. Antes da migração passam todas.                                                                                                |
| `rls-prova-depois.sql`   | As mesmas operações, mais o que **tem** de continuar a funcionar.                                                                                            |

## Correr

Precisa de um PostgreSQL local — não toca na base de produção.

```sh
initdb -D /tmp/pgval/data -A trust
pg_ctl -D /tmp/pgval/data -o "-k /tmp/pgval -p 55432 -h ''" -w start
export PGHOST=/tmp/pgval PGPORT=55432

createdb val
psql -v ON_ERROR_STOP=1 -f supabase/validacao/rls-esquema-actual.sql val

# Antes: tudo passa.
psql -f supabase/validacao/rls-prova-antes.sql val

# A migração, duas vezes, para provar que é idempotente.
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20260904000001_rls_fechar_tabelas_abertas.sql val
psql -v ON_ERROR_STOP=1 -f supabase/migrations/20260904000001_rls_fechar_tabelas_abertas.sql val

# Depois: 25 «bloqueado», zero «AINDA PASSA».
psql -f supabase/validacao/rls-prova-depois.sql val
```

## O que se mede

`rls-prova-depois.sql` distingue duas coisas, e é essa distinção que interessa:

- **25 «bloqueado»** — cada uma das operações que `anon` conseguia fazer, mais
  a segunda entrega do mesmo pagamento a bater no índice único. Qualquer linha
  `AINDA PASSA` é uma falha da migração.
- **O que continua a funcionar** — as quatro tabelas que o site lê mesmo com a
  chave anónima (`coudelarias` activas, `cavalos_venda`, `eventos`, e
  `reviews` só as aprovadas), e o `service_role`, por onde o resto do site todo
  lê, a continuar a passar à frente do RLS.

Repare-se em `reviews_por_aprovar_visiveis = 0`: a migração é mais apertada do
que o estado actual, não só diferente. Hoje uma avaliação pendente ou rejeitada
é legível de fora; depois não é.

Uma migração que fechasse tudo e partisse o mapa não seria uma correcção; seria
outro defeito. Por isso a prova mede as duas coisas e não só a primeira.
