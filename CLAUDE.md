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
| Estado mau | `--erro`                                                                                                       |

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

**Não se usa `<select>` nativo.** A lista aberta é pintada pelo widget do
sistema — barra azul, tipo de letra do sistema, cantos direitos — e não há CSS
que lhe chegue. Usa-se `<Seleccao>` (`components/ui/Seleccao.tsx`), que tem a
mesma API (`value`, `onChange` com `e.target.value`, filhos `<option>`) e
desenha a lista em `.seleccao__lista`: vidro sobre preto, hairline fria,
escolha a branco. Guarda cá dentro um `<select>` a sério — é ele que submete o
formulário e que faz a validação do `required` —, e é a esse que a escolha
dispara um `change` verdadeiro.

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
   qualquer ecrã e o conteúdo actualiza-se sozinho. A `.marca` é a versão
   pequena da mesma ideia: barras e um acento que, em movimento, contam o
   que a frase do cartão diz por palavras.
4. **A Terra em 3D** (`<GloboTerra>`) — é o mapa da página `/mapa`, e não
   há outro. Texturas em `public/globo/` (569KB, mais 53KB de contornos
   comprimidos; só nesta página). Chegou a haver outros dois — ver o ponto
   6 —, e a regra é a mesma que vale para os ciclos infinitos: um motor de
   mapa a mais custa uma razão escrita, e não havia nenhuma. O que o faz
   funcionar:
   - **Órbita baixa**, a 0,05 raios sobre um ponto a sul de Portugal, a
     olhar para norte: o país enche o quadro e o horizonte entra em cima.
     Do espaço as vinte e nove coudelarias cabiam num borrão de dez pixéis.
   - **Contornos em vectorial** por cima da esfera. A textura tem 2048
     pontos para dar a volta ao planeta; vista de perto vira papa. As
     linhas vêm de outro lado e ficam nítidas a qualquer altura — é sobre
     elas que as etiquetas assentam.
   - **Etiquetas em HTML**, colocadas a cada quadro a partir da posição
     projectada. Só se escreve o que está virado para nós, e não se deixam
     duas sobreporem-se: cada uma tenta seis posições — acima à direita,
     que é onde o olho a procura, acima à esquerda, abaixo dos dois lados,
     e por fim ao lado à altura do ponto. Com só duas hipóteses perdiam-se
     nomes que cabiam bem um pouco mais abaixo. Quem não couber inteira
     encolhe para uma linha antes de desistir, e quem perde é a que estiver
     mais longe. Medido: zero sobreposições.
   - **O título da etiqueta é o nome da coudelaria, a localidade vem por
     baixo.** Ao contrário dava dois títulos «Ferreira do Alentejo» lado a
     lado com a coudelaria sussurrada por baixo: o que distingue duas
     coudelarias da mesma vila é o nome delas, e o sítio já está dito pelo
     ponto onde a etiqueta assenta. O dourado ficou no alfinete e no fio e
     saiu do texto — das onze etiquetas legíveis ao mesmo tempo, seis eram
     douradas, o que já não é um acento mas uma segunda cor de texto.
   - **O relevo da Ibéria vem de uma textura à parte** (`relevo.webp`,
     159KB, janela de −13…−2 de longitude e 35…45 de latitude). A textura
     global tem 19×30 texels para Portugal continental inteiro, esticados
     por ~290 pixéis de ecrã: a esta distância o terreno lia-se como uma
     fotografia fora de foco, ao lado de contornos vectoriais nítidos — e
     era esse contraste que denunciava tudo. O que falta não é contraste, é
     geografia, e por isso **não se inventa com ruído**: acrescentar
     estrutura que ali não existe é mentir sobre o terreno. Os dados são
     elevação a sério (AWS Terrain Tiles, 234m por amostra).
     O que se guarda não é uma sombra cozida: são as duas componentes da
     normal do terreno mais a altitude, e quem as acende é o `sol` da cena —
     assim o relevo roda com o globo e nunca briga com o terminador. A
     resolução é casada com o terreno e não quadrada (163 px/° de longitude
     contra 205 px/° de latitude), porque a longitude encolhe com o cosseno
     da latitude. O azul serve também de máscara de terra, com um vazio
     deliberado entre 0 e 24 para que a compressão com perdas não confunda
     costa ao nível do mar com mar. Medido: das 50 janelas que estavam lisas
     antes, as 25 de terra ganharam estrutura (100× a 990× na variância do
     laplaciano) e as 25 de mar e céu continuam lisas — não entrou
     batimetria no oceano.
   - **A atmosfera é uma casca só**, e o que ela desenha é a coluna de ar
     que cada raio atravessa. Eram duas — uma larga e ténue, outra apertada
     e forte — porque cada uma fazia um Fresnel com uma potência diferente,
     e um Fresnel só nunca dava ao mesmo tempo o véu sobre o terreno e a
     linha do horizonte. Com a coluna de ar a mesma conta dá as duas: a
     diferença entre elas é geometria (coluna curta contra coluna rasante),
     não um expoente à escolha. A esfera é maior do que o ar que desenha —
     1,08 contra 1,020 — de propósito: quem decide onde a atmosfera acaba é
     o shader, que descarta o pixel onde não há ar. Quando era a geometria a
     decidir, o remate contra o preto era uma linha quebrada com os cantos
     dos polígonos à vista.
   - **As sobras não ficam anónimas.** Nem todos os vinte e nove nomes cabem:
     em desktop escrevem-se treze, em telemóvel oito. Os que sobram juntam-se
     em manchas com um algarismo, e apontar uma abre a lista de quem lá está.
     As manchas calculam-se **depois** da colocação e só apanham as sobras —
     nunca podem tirar o nome a ninguém. Agrupam no ecrã e não no terreno, e
     por isso desfazem-se ao aproximar: quem mexe na roda tem recompensa
     visível. Medido: 29 de 29 com conta no ecrã, 0 sobreposições contando
     manchas e nomes juntos.
   - **As setas percorrem as vinte e nove**, por latitude, de norte para sul,
     e cada passo traz a coudelaria à vista antes de lhe dar o foco. A
     tabulação continua a passar só pelos nomes que se lêem: uma segunda rota
     por bolhas que mudam de sítio a cada arrasto seria uma rota pior, não uma
     a mais.
   - **A janela útil não é a lona.** O motor não escreve por baixo do que está
     fixo no ecrã — a barra de cookies, o cabeçalho. E não o faz sabendo que
     eles existem: pergunta ao browser quem está no caminho, com
     `elementFromPoint` a subir ao primeiro antepassado `fixed`. O globo não
     conhece classes de outros componentes.
   - **Uma excepção sem camada**, e a razão: a regra global
     `button:not([role="switch"]) { min-height: 44px }` esticava a caixa de
     cada nome de 28 para 44px em telemóvel — e a caixa do nome _é_ a caixa do
     teste de colisão, logo cada nome reservava 57% mais altura do que
     gastava. Como CSS sem camada ganha a qualquer `@layer`, a resposta tem de
     ser sem camada também. O alvo de toque não se perde: passa para um
     `::after` transparente, que não entra na medida do elemento.
   - **O ponteiro só se agarra a partir dos três pixéis de arrasto.** Com
     `setPointerCapture` no `pointerdown`, o browser entregava o `click` à
     lona: carregar num nome ou num alfinete não fazia nada num computador, e
     só o toque funcionava. Um clique nunca chega a pedir a captura.
   - **O alfinete diz três coisas, e mais nenhuma**: onde está, se está a
     ser apontado, e se ali há mais do que uma. Um disco branco de cinco
     pixéis com uma sombra de contacto em volta; uma argola apertada e
     sempre acesa onde há mais do que uma; uma argola mais aberta em quem
     está a ser apontado. O destaque fica no tamanho do ponto, que é a
     hierarquia mais fraca das três de propósito — é a que menos importa a
     quem está a apontar. Era um halo aditivo de dez pixéis com cauda: um
     brilho não é informação, e **aditivo não sabe escurecer**, por isso
     sobre o Alentejo ao sol o ponto branco desaparecia e sobre o mar de
     noite era uma bola. O mesmo alfinete lia-se com dois pesos conforme o
     chão. A mistura passou a normal e a sombra de contacto assenta o ponto
     no chão. «São duas» também deixou de ser «o ponto é 1,6× maior», que é
     uma grandeza e não um sinal — e a olho era indistinguível de um
     destaque. O carimbo tem sempre o mesmo lado; o que muda de estado é o
     desenho lá dentro.
   - **Escolher uma coudelaria é um movimento só.** Entre carregar num nome
     e a página mudar não acontecia nada: a ficha aparecia sem que nada
     tivesse dito qual dos vinte e nove pontos tinha sido escolhido. Agora
     há **um relógio**, e dele saem duas coisas que são a mesma afirmação
     vista dos dois lados — _este, e mais nenhum_: a argola do ponto
     escolhido abre-se e apaga-se, e tudo o resto (pontos, nomes,
     algarismos das manchas) recua para o preto. Não são dois movimentos
     com dois tempos: é o mesmo `t` com a mesma curva a mandar nos dois.
     Sem o recuo, a argola era adorno em cima de um quadro cheio; sem a
     argola, o recuo não dizia qual. A câmara não se mexe — aproximar seria
     prometer um sítio onde nunca se chega a ficar, porque a página
     seguinte é a ficha e não o mapa. A duração é o `--d-drill`, que é o
     token de _entrar num sítio_, o mesmo dos submenus e o mesmo da pilha
     de regiões: escolher uma coudelaria é entrar nela, não se inventa aqui
     um tempo próprio. Corre uma vez, e **larga-se sozinha** ao fim do
     dobro dessa duração — a mesma regra da cortina: se a página nunca
     chegar, o que não pode acontecer é ficar um globo apagado para sempre.
     Com `prefers-reduced-motion` não corre nada.
   - **A caixa da lona está em cache.** Era um `getBoundingClientRect` por
     `pointermove`, e um deles a meio de um gesto é a pior altura possível
     para o pedir: as etiquetas acabaram de ser reescritas, o layout está
     sujo, e o browser tem de o refazer inteiro antes de responder ao dedo.
     Quem a invalida é o rolo da página e o `ResizeObserver`, que são as
     duas únicas coisas que a podem mudar.
   - **A colocação não faz objectos por quadro.** Até duzentas caixas de
     teste por quadro eram outros tantos objectos de vida curta, e os três
     testes de colisão faziam um fecho novo por chamada com `.some`. As
     caixas passaram a depósitos com contagem, os testes a voltas à mão, e
     as posições comparam-se em números antes de se montar a cadeia do
     `translate3d`.
5. **Holofote na grelha** — `<GrelhaHolofote>` escreve a posição do rato em
   coordenadas de cada cartão (`--px`, `--py`) e o `.cartao-holofote` acende
   com ela a hairline e um halo. Como os cartões todos lêem a mesma luz, ela
   atravessa a grelha como se fosse uma folha de vidro só. As medidas ficam
   em cache e as escritas passam por um `requestAnimationFrame`; sem rato
   (`pointer: coarse`) o efeito nem se liga.
6. **O mapa das coudelarias** (`<GloboMapa>`) — o painel do directório e o
   «Onde fica» da ficha. É o segundo e último motor de mapa do site, e a
   fronteira entre os dois é de propósito: o `<GloboTerra>` é a página, este
   é o painel. Desenha-se em canvas 2D com o `d3-geo`, não depende de
   servidor nenhum, não abre worker, não pede WebGL e não regista um único
   ouvinte não passivo.
   - **Eram três motores, e o terceiro pagava-se caro.** Havia um globo de
     tiles do MapLibre sobre o OpenFreeMap com um despachante a cair para
     este quando os tiles falhassem. Medido no browser: abrir o mapa do
     directório custava 1 556 310 bytes em 120 pedidos, 114 deles a um
     servidor de fora; a ficha, para mostrar **um** alfinete num painel de
     220px, custava 1 621 402. E com o servidor inalcançável o caminho de
     recurso custava 1 987 601 — o MapLibre inteiro descarregado e deitado
     fora, mais oito segundos de vigia, e só então o segundo motor. O plano
     B saía mais caro do que os dois planos A somados. Ficaram 436 831 bytes
     no directório e 293 663 na ficha, e zero pedidos a servidores de fora.
     Ruas e nomes de aldeia perderam-se: nunca foram o que este painel
     mostra, e quem os quer tem o «Como chegar» da ficha, que abre a
     aplicação de mapas do telefone, e o `/mapa` no botão ao lado.
   - **O enquadramento sai dos dados.** Era um zoom fixo, e com ele Portugal
     ocupava dois por cento do quadro e as vinte e nove coudelarias cabiam
     numa mancha de dez pixéis — um globo bonito e um mapa inútil. Agora
     mede-se a caixa dos alfinetes e enquadra-se nela, sejam vinte e nove ou
     um só. A largura entra corrigida pelo cosseno da latitude, senão um
     conjunto largo e baixo enquadra-se de mais.
   - **Portugal a 1:10m** (`public/mapa-directorio.json`, montado por
     `npm run mapa:geometria`). A 1:110m tem **33 pontos**: é um polígono,
     não um país, e enquadrado a preencher o painel lia-se como um erro de
     desenho. Portugal e Espanha vêm os dois a 10m e saem da malha
     grosseira — partilham a fronteira, e assim não há greta entre eles nem
     um Portugal grosseiro a espreitar por fora do fino.
   - **O laço de pintura não refaz o que não muda.** Corria `geoCentroid` e
     `geoPath.bounds` para os 177 países **em cada quadro**, o que são duas
     passagens completas por dez mil pontos além da do desenho, para
     escrever meia dúzia de nomes; montava a grelha de meridianos de novo a
     cada quadro (2573 pontos alocados e deitados fora); pintava 260
     estrelas com `arc()` uma a uma; e lia as cores com um
     `getComputedStyle` mais quatro `getPropertyValue`, que é pedir estilo
     calculado a 60 Hz. Os centróides e as caixas passaram para o ficheiro,
     a grelha é uma constante do módulo, o céu é uma lona pintada uma vez e
     copiada com um `drawImage`, e as cores leem-se uma vez ao montar.
     Medido: 34 334 → 17 289 visitas a pontos por quadro, com 38× mais
     detalhe em Portugal.
   - **A roda não é do mapa.** Aproximar com a roda obriga a um ouvinte de
     `wheel` não passivo, e um desses proíbe o browser de deslocar a página
     no compositor enquanto o rato estiver por cima — num painel de 420px no
     meio de um directório que se percorre a rolar, é trocar o deslocamento
     de toda a gente pelo gesto de quem quer aproximar. Antes fazia as duas
     coisas ao mesmo tempo, porque o `onWheel` do React é passivo: a página
     descia e o globo aproximava-se sem ninguém pedir. Quem aproxima são dois
     botões, que também servem no telemóvel, onde roda não há.
   - **A caixa mede-se por evento, não por deslocamento.** Era um
     `getBoundingClientRect` a cada `pointermove`. Fica em cache; um ouvinte
     de `scroll` passivo, que não lê layout nenhum, só a marca como velha.

### Movimento

As durações e as curvas são medidas, não inventadas. Vivem em tokens no
`globals.css` e é por lá que se mudam.

| Curva                 | Valor                            | Onde                 |
| --------------------- | -------------------------------- | -------------------- |
| `--ease-out`          | `cubic-bezier(0,0,.2,1)`         | entradas de conteúdo |
| `--ease-in-out-cubic` | `cubic-bezier(.645,.045,.355,1)` | menu, cortina        |
| `--ease-header`       | `cubic-bezier(.215,.61,.355,1)`  | cabeçalho ao rolar   |

| Duração      | Valor  | Onde                           |
| ------------ | ------ | ------------------------------ |
| `--d-fast`   | 200ms  | hovers, botões                 |
| `--d-menu`   | 300ms  | abrir e fechar o menu          |
| `--d-drill`  | 320ms  | entrar e sair de um submenu    |
| `--d-header` | 230ms  | véu e hairline do cabeçalho    |
| `--d-reveal` | 1000ms | entrada ao entrar no ecrã      |
| `--d-nascer` | 700ms  | nascer sobre uma cena composta |

O `--d-nascer` é o sexto, e a razão: os nomes das coudelarias nascem por cima
de uma cena já composta, escalonados, quinze de cada vez. Não é o `--d-reveal`,
que é a entrada de um bloco inteiro ao entrar no ecrã — a um segundo cada, a
cascata deixava de se ler como cascata e passava a ler-se como a página a
carregar devagar. Era um `700ms` escrito à mão dentro do CSS do globo; agora
está onde os outros estão.

**O `GloboTerra` lê os tokens do CSS em vez de os copiar.** `duracaoDoToken` e
`curvaDoToken` lêem `--d-drill` e `--ease-out` do documento à montagem — duas
consultas, não duas por quadro — e a curva do CSS é avaliada por bissecção.
Um número escrito à mão dentro de um componente é uma duração que ninguém
encontra e que ninguém muda quando as outras mudam.

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
- **Entrar num sítio usa esse mesmo idioma**, e não um segundo inventado: a
  `.pilha` do painel de regiões do `/mapa` é o mesmo movimento dos submenus
  (`--d-drill`, `--ease-in-out-cubic`). Escolher uma região não é marcar uma
  caixa numa lista, é entrar nela — e há caminho de volta. A altura da caixa é
  medida do nível activo e animada; sem isso, passar de cinco regiões para
  treze coudelarias dá um salto e o que está por baixo pula. Mede-se no
  `useLayoutEffect`, antes da pintura, e observa-se com um `ResizeObserver`,
  porque o conteúdo do nível também muda de altura sozinho. O nível que está
  fora leva `inert`: uma lista invisível a receber tabulações é pior do que
  não existir.
- Trocar de vista (`.vista-troca`): esbatimento com um resto de escala, e os
  cartões em cascata com tecto em dez. Passados dez, o atraso deixa de se ler
  como ordem e passa a leitura a conta-gotas. **A `key` no elemento é o que
  faz a animação repetir-se** — sem ela o React reaproveita o nó e a animação,
  que já correu, não volta a correr. E não se usa `<Revelar>` aqui: esse
  dispara ao entrar no ecrã, e ao trocar de vista o conteúdo já lá está.
- Cortina de entrada (`.cortina`): pano da cor do fundo que sobe em 250ms,
  uma vez por carregamento. Quem a anima é o CSS; o JS só a retira do DOM.
  Se o script falhar, a cortina já saiu do ecrã à mesma — nunca fica um
  rectângulo opaco por cima do site. Entre rotas não corre: quem assinala
  essas é a barra de progresso.
- Dropdowns: `.anim-crescer`, 200ms, origem no topo. A `.seleccao__lista`
  usa a mesma animação, com a origem em baixo quando abre para cima.
- Painéis que se escrevem (`<PainelEscrito>`): o texto vai no HTML e o
  componente só o esconde e o repõe, letra a letra, ao entrar no ecrã. Sem
  JavaScript o painel lê-se na mesma. Dentro deles a cascata `ui-entrar`
  fica desligada — duas ideias de entrada ao mesmo tempo leem-se como
  confusão.
- Botões de contorno invertem no hover — fundo cheio, texto preto, 200ms.
  Mudar só a cor da borda quase não se via sobre preto.
- **Três ciclos infinitos em todo o site**, e não mais: o ponto verde da
  contagem de anúncios (`pulsar-ponto`), o muro de coudelarias
  (`.muro__pista`, 45s lineares) e os três previews da página inicial, que
  estão sempre a escrever-se — e sempre coisa diferente. Quem muda é **cada
  linha**, não o painel: escrever o painel todo de uma vez e segurar é
  sempre pausado, por muito que se apertem os tempos. Um relógio só bate de
  800 em 800ms e cada linha tem o seu, desencontrado do das vizinhas, de
  modo que a cada 800ms há uma a compor-se algures. Como as linhas se
  combinam livremente, cinco variantes por linha dão 3125 tabelas
  possíveis, não cinco. Medido no browser: 86% dos instantes com algo a
  mexer, pausa máxima de 0,2s, 65 tabelas distintas em 25 segundos. A razão escrita do terceiro: aqui o que se mexe é o
  conteúdo, não um adorno — um painel que mostra sempre as mesmas cinco
  linhas parece uma captura de ecrã, e a rodar lê-se como o produto a
  funcionar. Pára fora do ecrã, pára com o separador escondido e não
  arranca com `prefers-reduced-motion` (`usePassoVivo`). O muro pára ao
  passar o rato e é anulado por `prefers-reduced-motion`. A regra foi um só,
  depois dois, agora três — e cada degrau custou uma razão escrita. Um
  quarto custa outra.
  Foram contados, e havia dois a mais — nenhum dos dois com razão escrita, e
  nenhum dos dois visível. Um era o `.pro-border-active`, no
  `components/pro-section.css`: um gradiente cónico a rodar com um
  `@property --border-angle`, 4s lineares, para sempre. Uma propriedade
  registada dentro de um gradiente não é animável pelo compositor — cada
  quadro repintava a borda. A classe não era usada por ficheiro nenhum, e o
  ficheiro era importado pelo `MinhaContaContent` só para isso; saiu o
  ficheiro e saiu o `import`. O outro era um brilho a varrer o botão de
  submeter do `/registar`, com
  `animation: auth-shimmer 1.5s ease-in-out infinite` escrito **em linha** no
  JSX — e o `auth.css` já tinha desligado esse ciclo por escrito
  (`.animate-auth-shimmer { animation: none }`), só que um estilo em linha
  ganha sempre a uma classe. Ainda por cima ninguém o via: dependia de
  `group-hover/btn` e não há `group/btn` nenhum nessa página, logo a camada
  esteve a `opacity: 0` desde sempre. Infinito, invisível, e a animar
  `background-position`, que é pintura. Saiu. A lição dos dois é a mesma: uma
  regra desligada numa folha de estilo não fica desligada se uma página a
  puder reescrever em linha, e um ciclo que ninguém vê custa exactamente o
  mesmo que um que se vê.
  Os esqueletos de carregamento usam `animate-pulse` do Tailwind: são a
  excepção aceite, porque só existem enquanto o conteúdo não chegou.
  Os dois globos também não fazem excepção: o do directório fecha-se sobre
  os alfinetes e o da Terra sobre Portugal, cada um num movimento só que
  corre uma vez e pára. Os exemplos que lhes serviram de referência rodavam
  para sempre e tinham os pontos a pulsar; ficou tudo isso de fora.
- Entrada anterior (`fadeSlideIn`) ainda em várias páginas: mesma família de
  movimento, alinhada na distância. Diferença que fica: dispara ao carregar,
  não ao entrar no ecrã. Em código novo usar `Revelar`/`data-revelar`.
- Há um bloco `prefers-reduced-motion: reduce` que anula tudo isto. Manter.
- Preferir transição CSS a tween em JS: com dezenas de blocos, deixar opacidade
  e transform ao compositor não disputa a thread principal.
- **O deslocamento é o nativo, e não há motor nenhum a substituí-lo.** Havia:
  o site montava o Lenis em todas as páginas, no `ClientShell`. Medido, isso
  custava um `requestAnimationFrame` em cadeia que nunca parava — 240 chamadas
  em 4 segundos com a página completamente parada, em todas as páginas, com ou
  sem alguém a rolar — e três ouvintes em `window` registados com
  `passive: false` (`wheel`, `touchmove` e `scroll`). São esses três que
  proíbem o browser de deslocar a página no compositor: com eles, cada volta
  da roda e cada arrasto do dedo espera que a linha principal corra
  JavaScript antes de a página se mexer, e é essa espera que se sente como
  «lag». Eram também eles que disputavam a roda com o `<GloboTerra>` do
  `/mapa`, que a escuta para aproximar.
  O que se ganhava era uma curva de desaceleração. O deslocamento nativo já
  tem uma, corre no compositor, respeita as definições do sistema operativo e
  não custa nada. As âncoras internas, a outra coisa que o Lenis fazia, ficam
  a cargo de duas linhas de CSS: o `scroll-behavior: smooth` que já cá estava
  (dentro de `prefers-reduced-motion: no-preference`, logo já respeita quem
  não quer movimento, sem uma linha de JavaScript — o Lenis anulava-o com um
  `scroll-behavior: auto !important`) e um `scroll-padding-top: 5rem`, que faz
  o que o `offset: -80` fazia à mão e vale para tudo o que desloca o
  documento, não só para os cliques que um ouvinte apanhasse.
  Medido depois: **zero chamadas de rAF em repouso em todas as páginas**, e
  zero ouvintes de `wheel` e `touchmove` não passivos.
- **Um só componente de entrada ao entrar no ecrã**, o `<Revelar>`. Havia
  três a fazer o mesmo — `AnimateOnScroll`, `ui/RevealOnScroll` e este —, com
  distâncias, durações e margens ligeiramente diferentes, o que se lia como
  duas ideias de movimento na mesma página. Os dois primeiros não eram
  importados por ficheiro nenhum; saíram, e com eles quatro componentes de
  deslocamento igualmente órfãos (`ParallaxSection`,
  `HorizontalScrollGallery`, `AnimatedCounter` e o hook `useInViewOnce`).
- **Nada varre a página a cada deslocamento.** O `ObservadorRevelar` tinha um
  ouvinte de `scroll` que corria um `querySelectorAll` por toda a página e um
  `getBoundingClientRect` em cada bloco por revelar — 1663 leituras forçadas
  de layout em dois segundos de roda na página inicial, e uma leitura de
  layout a meio de um deslocamento obriga o browser a refazer o layout antes
  de responder à roda. Quem entra no ecrã é o `IntersectionObserver`; quem
  aparece depois (paginação, filtros) é apanhado por um `MutationObserver`,
  que dispara quando o DOM muda em vez de perguntar a cada deslocamento se
  mudou. O mesmo vale para o `<GrelhaHolofote>`, cuja cache de medidas passou
  a estar em coordenadas do documento e por isso não caduca ao rolar. Medido:
  1663 → 67 leituras na página inicial, 325 → 15 no directório.
- **O `will-change` acaba quando a animação acaba.** O estado inicial do
  `[data-revelar]` pede `will-change: opacity, transform`, e é isso que põe a
  entrada no compositor — mas ficava pedido para sempre, uma camada por bloco
  a ocupar memória de vídeo muito depois de a última animação ter corrido.
  O observador marca cada bloco como `.assente` quando a entrada dele acaba e
  a folha devolve o `will-change` a `auto`. Quem marca é um temporizador e
  não um `transitionend`: um bloco revelado no mesmo quadro da primeira
  pintura nunca chega a transitar, logo nunca haveria evento — acontecia a 3
  dos 20 blocos da página inicial —, e um `transitionend` delegado no
  documento acordaria a cada hover da página, que é trocar trabalho contínuo
  por trabalho contínuo.
- **A rede de segurança dos quatro segundos deixou de ser um interruptor.**
  Revelava a página inteira, sempre — o que, com o observador a funcionar,
  não é uma rede: é desligar a entrada ao entrar no ecrã e acender de uma vez
  tudo o que está por baixo. Agora só o faz se o observador nunca tiver dado
  sinal, que é o caso que a rede existe para cobrir; se deu, faz uma única
  varredura da janela para fechar a única lacuna real da margem de −10%
  (conteúdo nos últimos 10% do primeiro ecrã, numa página curta de mais para
  se rolar, nunca intersecta a janela encolhida). A garantia mantém-se: nunca
  fica um bloco invisível. Medido em cinco páginas, 63 blocos, zero
  invisíveis.

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
