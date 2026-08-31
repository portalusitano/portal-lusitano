# Portal Lusitano

Classificados de cavalos Lusitanos. Next.js (App Router), Supabase, Stripe,
Vitest + Playwright.

## Sistema visual — vale para tudo o que se escrever a partir daqui

O site tem **um** sistema visual. Qualquer página, componente ou ecrã novo
segue-o; não se abre uma excepção sem uma razão escrita.

### Cor

Tokens em `app/globals.css`. Nunca escrever cores literais numa página.

| Papel      | Token                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Fundo      | `--background` (preto puro no tema escuro)                                                                     |
| Cartão     | `--background-card`                                                                                            |
| Elevado    | `--background-elevated`                                                                                        |
| Texto      | `--foreground`, títulos `--foreground-strong`, secundário `--foreground-secondary`, ténue `--foreground-muted` |
| Hairline   | `--border` (activo), `--border-soft` (inactivo), `--border-hover`                                              |
| Elevação   | `--elevate-1`, `--elevate-2`                                                                                   |
| Acento     | `--gold` — **um só em todo o site**                                                                            |
| Estado bom | `--ok`                                                                                                         |

As hairlines levam um toque de azul (`rgba(214,235,253,·)`) de propósito: luz
fria sobre preto lê-se como vidro, branco puro lê-se como uma caixa desenhada.

O acento é do tamanho de um ícone. Usá-lo em cada botão gasta-o e deixa de
assinalar seja o que for. O botão principal é branco (`.btn-primario`); o
dourado (`.btn-acento`) fica para publicar anúncio e pouco mais.

### Tipografia

Geist e Geist Mono, e mais nenhuma. Peso 400 em quase tudo, títulos grandes
incluídos — é a moderação do peso que dá o ar caro. A mono é para números,
identificadores e dados tabelados, que assim alinham em coluna.

`font-serif` está mapeado para a Geist no `@theme`; não é para usar em código
novo.

Classes: `.titulo-gradiente` (títulos grandes), `.titulo-pagina`,
`.titulo-seccao`, `.rotulo`, `.rotulo-forte`, `.meta`, `.preco`.

**Não escrever `text-[9px]` nem `tracking-[0.4em]`.** Se apetecer, falta uma
classe no sistema — acrescenta-se lá.

### Componentes

`.btn` + `.btn-primario` / `.btn-acento` / `.btn-secundario` / `.btn-subtil`,
`.btn-sm`. `.campo` para entradas. `.chip` / `.chip-activo` para filtros.
`.selo` + `.selo-destaque` / `.selo-novo` / `.selo-neutro` / `.selo-forte` para
distintivos sobre fotografia. `.cartao` para superfícies simples.

**Estado escolhido é branco, não dourado.** Vale para o filtro activo
(`.chip-activo`), para as caixas de selecção e interruptores, para o botão por
omissão, para o dia de hoje no calendário, para a página actual na paginação e
para os contadores de favoritos e mensagens por ler. O `.rotulo-forte` também
deixou de ser dourado: numa página com seis rótulos destes o acento deixava de
ser acento. Sobre preto, quem assinala uma escolha é o contraste.

O `.selo-destaque` é o dourado, e é para o que é raro — um plano recomendado,
um evento em destaque. Num distintivo que aparece em quase todos os cartões de
uma grelha usa-se `.selo-forte`, branco.

Onde o dourado fica, e mais em lado nenhum: a ferradura da marca, o sublinhado
do item de navegação activo, o CTA de publicar anúncio, o `.selo-destaque`, e
os graus «Ouro» e «Prata» do pedigree — nesse caso o dourado é o próprio dado.

Vivem em `@layer components` **de propósito**: as utilidades do Tailwind estão
numa camada posterior, por isso um `pl-11` ou um `h-12` numa página ganham
sempre à classe. Fora da camada, o `padding` do `.campo` calava o `pl-11`.

### As três receitas que dão identidade

1. **Cartão assinatura** — `.cartao-seco` com `.cartao-seco__costura` (risco de
   luz de 150px no topo) e `.cartao-seco__esbatido` (gradiente que dissolve as
   laterais no fundo). Sem borda em baixo. O cartão emerge do preto em vez de
   estar colado a ele.
2. **Costura entre secções** — `.separador-brilho` mais margem negativa, canto
   redondo e `border-t`. As secções encaixam umas nas outras.
3. **Previews em HTML, nunca capturas de ecrã** — `.cabeca-ui`, `.linha-ui`,
   `.ponto` compõem tabelas e painéis a 10–11px. Pesam zero, ficam nítidos em
   qualquer ecrã e o conteúdo actualiza-se sozinho.

### Movimento

As durações e as curvas são medidas, não inventadas. Vivem em tokens no
`globals.css` e é por lá que se mudam.

| Curva                 | Valor                            | Onde                 |
| --------------------- | -------------------------------- | -------------------- |
| `--ease-out`          | `cubic-bezier(0,0,.2,1)`         | entradas de conteúdo |
| `--ease-in-out-cubic` | `cubic-bezier(.645,.045,.355,1)` | menu, cortina        |
| `--ease-header`       | `cubic-bezier(.215,.61,.355,1)`  | cabeçalho ao rolar   |

| Duração      | Valor  | Onde                        |
| ------------ | ------ | --------------------------- |
| `--d-fast`   | 200ms  | hovers, botões              |
| `--d-menu`   | 300ms  | abrir e fechar o menu       |
| `--d-drill`  | 320ms  | entrar e sair de um submenu |
| `--d-header` | 230ms  | véu e hairline do cabeçalho |
| `--d-reveal` | 1000ms | entrada ao entrar no ecrã   |

- Entrada ao entrar no ecrã: `<Revelar>` — 2rem de deslocação, 1000ms,
  `--ease-out`, dispara uma vez. `direccao` aceita `up` (omissão), `down`,
  `left` e `right`; a distância é sempre a mesma, muda só o eixo.
- O observador usa `rootMargin: 0px 0px -10% 0px` e **`threshold: 0`**. O
  limiar fica em zero de propósito: exigir uma percentagem do elemento
  visível é uma armadilha para secções altas — mil pixels de ecrã não são
  15% de trinta mil, e a página nunca revelava. A margem já dá o atraso.
- Stagger: 100ms por cartão em grelhas; 120ms nas grelhas de seis.
- Cabeçalho: entra a descer 500ms; ao rolar ganha véu e hairline em 230ms
  com `--ease-header`. Com o menu aberto sai de cena — o painel é
  translúcido e a barra atravessava-o por trás da marca que ele já mostra.
- Menu de ecrã inteiro: **não desliza**, anima só opacidade em 300ms. O peso
  vem do fundo a 64% com desfoque de 24px. As entradas não são escalonadas —
  quem abre um menu quer navegar, não ver uma lista a compor-se.
- Submenus: os níveis empilham-se no mesmo sítio. O submenu entra da direita
  uma largura inteira enquanto o nível de cima fica quieto e só se apaga; são
  os dois ao mesmo tempo que se leem como profundidade.
- Cortina de entrada (`.cortina`): pano da cor do fundo que sobe em 250ms,
  uma vez por carregamento. Quem a anima é o CSS; o JS só a retira do DOM.
  Se o script falhar, a cortina já saiu do ecrã à mesma — nunca fica um
  rectângulo opaco por cima do site. Entre rotas não corre: quem assinala
  essas é a barra de progresso.
- Dropdowns: `.anim-crescer`, 200ms, origem no topo.
- Botões de contorno invertem no hover — fundo cheio, texto preto, 200ms.
  Mudar só a cor da borda quase não se via sobre preto.
- **Dois ciclos infinitos em todo o site**, e não mais: o ponto verde da
  contagem de anúncios (`pulsar-ponto`) e o muro de coudelarias
  (`.muro__pista`, 45s lineares). O muro pára ao passar o rato e é anulado
  por `prefers-reduced-motion`. Antes a regra era um só; passou a dois
  quando o muro deixou de ser uma grelha parada. Um terceiro precisa de
  razão escrita.
  Os esqueletos de carregamento usam `animate-pulse` do Tailwind: são a
  excepção aceite, porque só existem enquanto o conteúdo não chegou.
- Entrada anterior (`fadeSlideIn`) ainda em várias páginas: mesma família de
  movimento, alinhada na distância. Diferença que fica: dispara ao carregar,
  não ao entrar no ecrã. Em código novo usar `Revelar`/`data-revelar`.
- Há um bloco `prefers-reduced-motion: reduce` que anula tudo isto. Manter.
- Preferir transição CSS a tween em JS: com dezenas de blocos, deixar opacidade
  e transform ao compositor não disputa a thread principal.

A classe `.js` que arma o estado inicial das animações é posta pelo script
inline em `app/layout.tsx`, **antes da primeira pintura**. Posta na
hidratação, o conteúdo acima da dobra aparecia e voltava a desaparecer.

Quase tudo o que é componente vive em `@layer components`. As duas excepções
estão comentadas no sítio e são pela mesma razão: **CSS sem camada ganha a
qualquer `@layer`**, e as utilidades do Tailwind estão numa camada posterior.
O alvo de toque de 44px em telemóvel é a regra sem camada que esticava os
interruptores; o esmorecer do grupo de navegação tem de ser sem camada porque
a cor de base das entradas está numa utilidade no JSX.

### Densidade

É um classificados: o que conta é caberem anúncios no ecrã. Grelhas de 2 a 5
colunas, cartões compactos, preço primeiro (`.preco` tem `tabular-nums` para
os dígitos alinharem entre cartões, que é o que permite comparar de relance).

## Regras de trabalho

- Verificar com `npx tsc --noEmit`, `npx eslint`, `npx vitest run` e
  `npx next build` antes de commitar.
- O `next build` local precisa de segredos de exemplo (Supabase, Resend,
  Stripe, `CRON_SECRET`); sem eles falha a recolher dados das páginas.
- Para ver o site a sério: `next build` + `next start` e Playwright com
  `executablePath: "/opt/pw-browsers/chromium"` (o binário que o projecto pede
  não está instalado neste ambiente).
- Migrações em `supabase/migrations/` têm de ser idempotentes e validadas
  contra um PostgreSQL local antes de irem para o repositório.
