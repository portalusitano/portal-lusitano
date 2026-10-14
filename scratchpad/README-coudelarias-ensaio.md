# `coudelarias-ensaio.json` — o que é verificado e o que é substituto

O `CLAUDE.md` nomeia este ficheiro como «o ficheiro de ensaio bom», e durante
algum tempo ele **não existia no repositório**: vivia num scratchpad temporário
e desapareceu com um reinício do contentor. Sem ele o `next build` gera zero
fichas de coudelaria — e como a ficha tem `dynamicParams = false`, uma lista
vazia publica-as **todas a 404 sem um aviso**. Está aqui para isso não voltar a
acontecer.

## De onde vem

Foi reconstruído a partir do que o próprio repositório traz: os seeds em
`supabase/*.sql`, carregados num PostgreSQL local e despejados como JSON. Não
há aqui uma linha inventada.

| campo                                                                                             | o que é                                                |
| ------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `nome`, `slug`, `descricao`, `localizacao`, `regiao`, `telefone`, `email`, `website`, `instagram` | **reais**, dos seeds — coudelarias portuguesas a sério |
| `num_cavalos`, `especialidades`, `status`                                                         | **reais**, dos seeds                                   |
| `coordenadas_lat` / `coordenadas_lng`                                                             | **reais** em 16 das 20; **nulas** nas outras quatro    |
| `historia`, `linhagens`, `premios`, `servicos`, `foto_capa`, `galeria`, `ano_fundacao`, …         | **nulos** — o seed que os traz não aplica (ver abaixo) |
| `id`                                                                                              | fabricado, sequencial                                  |

**São vinte, e não vinte e nove.** O `CLAUDE.md` fala repetidamente das «vinte
e nove verdadeiras» porque o banco anterior as tinha. Este tem vinte. Quem
medir contagens contra ele tem de saber disso — é exactamente o erro que este
repositório já pagou uma vez, quando um stub passou de mão em mão como se fosse
a base verdadeira.

## O que se descobriu ao reconstruí-lo

**Os seeds commitados já não aplicam contra as migrações commitadas.** Há três
gerações de esquema da tabela `coudelarias` no repositório e elas não se
alinham:

- `supabase/coudelarias.sql` cria a tabela sem `linhagens`, sem `historia`, sem
  `ano_fundacao` e sem coordenadas — mas com `logo` e `fotos`;
- `supabase/migrations/20260206000004_coudelarias_simple.sql` cria outra coisa;
- os seeds `seed-coudelarias-completo.sql` e `seed-coudelarias-novas-12.sql`
  escrevem colunas que nenhuma das duas tem;
- e a aplicação lê `coordenadas_lat` / `coordenadas_lng`, que é um terceiro
  vocabulário — os seeds escrevem `latitude` / `longitude`.

Medido: contra o esquema antigo carregam 20 linhas com 4 erros; contra as
migrações carregam **zero linhas com 17 erros**. Nenhum dos dois caminhos dá a
base que a aplicação lê.

Isto não é um problema do banco de ensaio — é um problema do repositório, e
fica aqui escrito porque foi aqui que se viu. Quem for arrumar isto tem de
decidir qual dos vocabulários é o verdadeiro e alinhar os outros dois.

## Como se usa

O `scratchpad/chat-ensaio/servidor.mjs` serve-o em `/rest/v1/coudelarias`:

```bash
PORTA=54995 node scratchpad/chat-ensaio/servidor.mjs
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54995 npx next build
```

Verificado: **21 ficheiros gerados** em `.next/server/app/directorio/`, contra
os zero que a lista vazia dava.
