#!/bin/sh
# O site construído a apontar ao banco de ensaio, para o `ponta-a-ponta.mjs`.
#
# Porta própria (54996 / 3100) e não a do README do chat: outro agente pode ter
# o banco dele a correr na 54992, e um ensaio que atropela o de outra pessoa
# mede as duas coisas ao mesmo tempo.
export NEXT_PUBLIC_SUPABASE_URL=${NEXT_PUBLIC_SUPABASE_URL:-http://127.0.0.1:54996}
export NEXT_PUBLIC_SUPABASE_ANON_KEY=chave-de-ensaio-anon
export SUPABASE_SERVICE_ROLE_KEY=chave-de-ensaio-servico
export RESEND_API_KEY=re_ensaio
export STRIPE_SECRET_KEY=sk_test_ensaio
export STRIPE_WEBHOOK_SECRET=whsec_ensaio
export NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_ensaio
export CRON_SECRET=ensaio
exec npx next start -p "${PORTA_SITIO:-3100}"
