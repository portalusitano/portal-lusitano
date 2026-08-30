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
`.selo` + variantes para distintivos sobre fotografia. `.cartao` para
superfícies simples.

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

- Entrada ao entrar no ecrã: `<Revelar>`, com `duracao` 500ms (cartões) ou
  600ms (cabeçalhos), `cubic-bezier(.25,.1,.25,1)`, dispara uma vez.
- Stagger: 100ms por cartão em grelhas; 120ms nas grelhas de seis.
- Cabeçalho: entra a descer 500ms; ao rolar ganha véu (150ms) e hairline (200ms).
- Dropdowns: `.anim-crescer`, 200ms, origem no topo.
- **Um só ciclo infinito em todo o site** — o ponto verde da contagem de
  anúncios. Com vários, o site fica inquieto.
- Há um bloco `prefers-reduced-motion: reduce` que anula tudo isto. Manter.
- Preferir transição CSS a tween em JS: com dezenas de blocos, deixar opacidade
  e transform ao compositor não disputa a thread principal.

A classe `.js` que arma o estado inicial das animações é posta pelo script
inline em `app/layout.tsx`, **antes da primeira pintura**. Posta na
hidratação, o conteúdo acima da dobra aparecia e voltava a desaparecer.

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
