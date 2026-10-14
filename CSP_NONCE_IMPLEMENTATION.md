# CSP: não há nonces, e a razão

> Este documento descrevia uma implementação de nonces por pedido que **não
> existe no código**. Não é uma diferença de detalhe: um documento de segurança
> que promete uma defesa que não está lá é pior do que não haver documento
> nenhum, porque a próxima pessoa a auditar dá o `script-src` por resolvido e
> vai procurar noutro sítio. Foi reescrito para dizer o que se passa.

## O que está a acontecer

O CSP é montado uma vez, ao carregar o módulo, em `middleware.ts` (`CSP_STRING`)
e aplicado por `applySecurityHeaders`. O `script-src` é:

```
script-src 'self' 'unsafe-inline' [+ 'unsafe-eval' em desenvolvimento] …
```

Não há geração de nonce, não há cabeçalho `x-nonce`, não existe `lib/nonce.ts` e
nenhum componente pede um nonce. O comentário em `next.config.js` que dizia «CSP
é agora gerido no middleware.ts com nonces por request» também estava errado, na
parte dos nonces.

O que o documento anterior descrevia — `generateNonce()`, `buildCSPString(nonce)`,
`getNonce()`, ficheiros em caminhos de uma máquina que já não existe — ou foi
revertido ou nunca chegou a ser aplicado a este ramo.

## Porque é que está assim

A razão está escrita no próprio `middleware.ts` e é boa: o App Router do Next.js
injecta `<script>` em linha para a carga RSC e para os dados de hidratação, e
esses não podem levar nonce quando a página é servida de cache estática
(ISR/SSG) — o nonce é por pedido, a página é a mesma para toda a gente. E um
CSP que traga um nonce faz os browsers modernos **ignorarem** `'unsafe-inline'`,
por isso a mistura das duas coisas não é um recurso: é o pior dos dois mundos,
porque bloqueia os scripts do Next e a página nunca hidrata.

Ou seja: com ISR e App Router, ou se abdica do nonce, ou se abdica da cache
estática. Escolheu-se a cache.

## O que isto custa, e o que se faz em consequência

Custa a protecção que o `script-src` daria contra XSS: com `'unsafe-inline'`,
qualquer HTML injectado numa página executa. **A consequência prática é que a
CSP não é a rede de segurança do XSS neste site — a escapagem na origem é.**

Em concreto, os dados estruturados JSON-LD vão para dentro de um `<script>` e
são compostos com nome de coudelaria e descrição de anúncio, que vêm de fora.
`JSON.stringify` não escapa `<`, portanto `</script>` no meio de um valor fecha
o bloco de dados e abre um de código, e o `'unsafe-inline'` deixa-o correr. É
por isso que existe `lib/json-ld.ts` e é por isso que **nunca** se escreve
`JSON.stringify` dentro de um `dangerouslySetInnerHTML`.

## O resto dos cabeçalhos

Estes existem mesmo, em `next.config.js`:

`Strict-Transport-Security` (2 anos, `includeSubDomains`, `preload`),
`X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy:
strict-origin-when-cross-origin`, `Permissions-Policy` (câmara, microfone e
geolocalização desligados), `X-Permitted-Cross-Domain-Policies: none`. O
`middleware.ts` acrescenta `Content-Security-Policy`, `Content-Language` e
`X-Download-Options`.

Duas directivas que o CSP não tem e podia ter, e nenhuma delas depende de
nonces:

- **`frame-ancestors 'none'`** — o `X-Frame-Options: DENY` já cobre o
  essencial, mas é o cabeçalho antigo e não se aplica a `<embed>`/`<object>`.
- **`form-action 'self'`** — impede que um HTML injectado submeta um formulário
  para fora.

## Se um dia se quiser mesmo o nonce

Não é uma questão de escrever `generateNonce()`. É preciso primeiro decidir que
páginas deixam de ser estáticas, porque uma página com nonce tem de ser
renderizada por pedido. Enquanto essa decisão não estiver tomada, acrescentar um
nonce ao cabeçalho parte o site — e parte-o de uma maneira difícil de
diagnosticar, porque a página serve-se e fica a carregar para sempre.
