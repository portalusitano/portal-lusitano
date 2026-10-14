# Banco de ensaio do chat

Serve para medir a caixa de entrada e o fio de conversa
(`/minha-conta/mensagens`) com dados a sério em cima.

## O que isto resolve

O stub que serve o globo (`coudelarias`) responde `200 []` a todas as outras
tabelas. Contra ele, o chat mede-se assim:

- a caixa de entrada está **sempre vazia**, e
- nem lá se chega: `app/minha-conta/mensagens/page.tsx` faz
  `redirect("/login")` porque `supabase.auth.getUser()` não devolve ninguém.

Um banco que responde `200 []` é pior do que um que rebenta, porque parece que
funciona. É o defeito que o `CLAUDE.md` já conta noutro sítio, com a mesma
lição: **antes de escrever «isto está vazio», confirma que o banco o traz.**

## Correr

```bash
# 1. o banco (PostgREST + GoTrue de mentira)
node scratchpad/chat-ensaio/servidor.mjs                 # porta 54992
PORTA=54995 node scratchpad/chat-ensaio/servidor.mjs     # outra porta
PORTA=54995 VAZIO=1 node scratchpad/chat-ensaio/servidor.mjs   # caixa vazia

# 2. o site, construído a apontar-lhe
#    (NEXT_PUBLIC_* é embutido na construção — não chega pôr no `next start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54995 npx next build
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54995 npx next start -p 3000
```

## Entrar na sessão

O `@supabase/ssr` guarda a sessão num cookie chamado
`sb-<primeiro rótulo do host>-auth-token` — para `127.0.0.1` é
**`sb-127-auth-token`** — com o valor `base64-` + base64 do JSON da sessão:

```bash
COOKIE=$(curl -s -X POST "http://127.0.0.1:54995/auth/v1/token?grant_type=password" -d '{}' \
  | python3 -c "import sys,json,base64; print('base64-'+base64.b64encode(json.dumps(json.load(sys.stdin),separators=(',',':')).encode()).decode())")

curl -s -H "Cookie: sb-127-auth-token=$COOKIE" http://127.0.0.1:3000/api/conversas
```

Em Playwright, `context.addCookies([{ name: "sb-127-auth-token", value: COOKIE,
domain: "127.0.0.1", path: "/" }])`.

## O que é verificado e o que é substituto

**Isto é um substituto, inteiro.** Ao contrário do
`scratchpad/coudelarias-ensaio.json`, que traz as vinte e nove coudelarias
verdadeiras tal como a base as devolve, aqui não há uma única linha real — não
há acesso à base verdadeira, e conversas de pessoas a sério não sairiam dela
para um banco de ensaio de qualquer maneira.

O que este banco garante **não é fidelidade aos dados**. É **cobertura da
gama** — e é por isso que serve para medir a interface e **não** serve para
concluir seja o que for sobre o produto (quantas conversas existem, que
percentagem tem fotografia, o que as pessoas escrevem).

O que ele **não** é: uma base de dados. Não há transacções, não há RLS, não há
`CHECK` e não há chaves estrangeiras. As garantias que a migração escreve
verificam-se contra um PostgreSQL a sério, nunca aqui. E o token que emite não
é verificado — é um JWT com a forma certa e uma assinatura que não quer dizer
nada.

## A gama que cobre

| eixo     | valores                                                                                                                                                                                                           |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fios     | 1 mensagem · 3 · 6 · 400                                                                                                                                                                                          |
| corpos   | 1 caractere · uma frase · **4000** (o limite do `CHECK`) · com quebras de linha · com um endereço de email · com um número de telefone · com emoji · uma palavra de 200 letras sem espaços · uma ligação comprida |
| nomes    | «Ana» · 96 caracteres · **nulo** (exercita o `nomeOutraParte`)                                                                                                                                                    |
| anúncios | com fotografia e sem · com preço e sem · vendido · **apagado** (a conversa fica órfã e a rota escreve «Anúncio removido»)                                                                                         |
| por ler  | 0 · 1 · 12                                                                                                                                                                                                        |
| papéis   | a comprar **e** a vender, na mesma caixa                                                                                                                                                                          |
| datas    | hoje · ontem · esta semana · há meses                                                                                                                                                                             |

Total: **30 conversas, 445 mensagens, 14 por ler.**

Um banco com cobertura perfeita e sempre a mesma frase não reproduz nada — é a
outra metade da lição do `CLAUDE.md`, e é por isso que cada eixo aqui tem os
extremos e o meio, e não só um valor plausível.
