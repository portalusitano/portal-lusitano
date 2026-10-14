# Pôr o Portal Lusitano no ar

Guião para a publicação. Preparado e **ensaiado**; nada aqui foi executado em
produção.

## O que se passa hoje

O domínio não está avariado — **o projecto não tem produção nenhuma para
servir**. No Vercel: «No Production Deployment», «No Production Domain», e «To
update your Production Deployment, push to the **main** branch».

- O `main` não mexe desde **11 de Março de 2026**.
- Todo o trabalho está em `claude/lusitano-horse-marketplace-v5xmsz`, que o
  Vercel constrói **só como Preview** — 346 commits, 1466 ficheiros.
- Logo o `portal-lusitano.pt` não tem para onde apontar.

**Entretanto dá para ver o site**: no Vercel, no deployment mais recente do
ramo, o botão «Preview» abre-o a funcionar.

## A ordem importa: primeiro a base de dados, depois o código

O código novo **exige** colunas que a produção ainda não tem
(`marketplace_mensagens.destinatario_id`, `.entregue_at`) e traz as correcções
de duas falhas de segurança. Publicar o código antes das migrações deixa o chat
a dar erro **e as falhas abertas**.

### Passo 1 — as 17 migrações, por esta ordem

No editor de SQL do Supabase, uma a uma, por ordem de nome. Todas são
idempotentes: correr outra vez é seguro.

```
20260829000001_cavalos_venda_user_id.sql
20260829000002_marketplace_chat.sql
20260829000003_visualizacoes_denuncias.sql
20260829000004_alertas_pesquisa.sql
20260829000005_aviso_expiracao.sql
20260902000001_coudelarias_distrito_codigo_postal.sql
20260902000002_cavalos_venda_campos_do_formulario.sql
20260904000001_rls_fechar_tabelas_abertas.sql
20260904000002_documentos_cavalo.sql
20260904000003_storage_fechar_escrita_anonima.sql
20260904000004_documentos_em_dia_default_false.sql
20260904000005_stud_book_e_impressoes.sql
20260906000001_consulta_assistida.sql
20260907000001_avisos_de_recusa_retentados.sql
20260909000001_chat_tempo_real.sql
20260910000001_perfil_com_fotografia.sql
20260911000001_chat_escrita_do_cliente.sql
```

**As três últimas são as que fecham as falhas de segurança.** Se tiver de
parar a meio, pare **depois** de uma e não a meio dela.

**Ensaiado:** aplicadas por esta ordem contra um PostgreSQL 16 a sério, **três
voltas seguidas, zero erros nas três** — a segunda e a terceira provam que
repetir não estraga. Estado final verificado: as três tabelas do chat
presentes, `destinatario_id` e `entregue_at` presentes, e a política que
permitia o sequestro de conversas já não existe.

**Ressalva honesta:** a base de ensaio não é a sua. Reconstruí-a dos ficheiros
do repositório e tive de corrigir duas coisas que a produção tem e os ficheiros
não (`payments.stripe_session_id`, que o webhook do Stripe escreve desde
sempre, e a ordem `coudelarias` → `cavalos_venda`). **Não sei quais destas 17
já foram aplicadas à sua base.** Sendo idempotentes, reaplicar é seguro — mas
convém olhar para o resultado de cada uma.

### Passo 2 — o código

Fundir `claude/lusitano-horse-marketplace-v5xmsz` em `main` e empurrar. É isso
que dispara a construção de produção.

### Passo 3 — o domínio

Nas definições do projecto no Vercel, ligar `portal-lusitano.pt` (e o `www`) ao
deployment de **produção**.

## Depois de publicar, confirmar

1. A página inicial abre no domínio.
2. `/directorio` lista coudelarias e uma ficha abre (se der 404 em todas, o
   `generateStaticParams` não conseguiu ler a base na construção).
3. Entrar na conta e abrir `/minha-conta/mensagens`.
4. Enviar uma mensagem sobre um anúncio e confirmar que chega ao outro lado.

## O que fica por fazer, e é sabido

- **O Realtime entrega o UUID das duas pessoas ao browser.** Contradiz uma
  regra escrita nossa. Duas saídas possíveis, e é decisão sua — está descrito
  no `CLAUDE.md`.
- **O balde `avatares` aceita escrita directa de qualquer autenticado**, sem
  passar pelo cano que tira o EXIF. Proposta: apagar as três políticas de
  escrita; todas as escritas reais usam a chave de serviço.
- **Os ficheiros de esquema do repositório contradizem-se** — duas definições
  de `cavalos_venda`, três de `coudelarias`, e o `schema.sql` desactualizado
  quanto à `payments`. Não afecta a publicação, mas torna qualquer ensaio
  futuro mais difícil do que devia.
