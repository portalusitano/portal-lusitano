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

**O que flutua é vidro, e é um só.** `.vidro` para painéis e barras
(a de cookies, o convite a instalar a aplicação, a pastilha das línguas, o
painel de partilhar, as duas barras do formulário de anúncio); `.vidro-leve`
para um controlo pequeno, que muda só a sombra — a do `.vidro` diz «isto
flutua a vinte e quatro pixéis» e numa pastilha de trinta de altura isso é um
borrão. Serve para o que **flutua**; o que está assente na página é `.cartao`.

Os números foram medidos e não escolhidos. O véu é **68%** do
`--background-card`: pôs-se a superfície sobre um fundo claro e leu-se o
contraste do texto contra os pixéis renderizados — 68% é o degrau mais fino
que ainda passa 4,5:1 para a segunda linha (64% dá 4,27:1). O desfoque é 40px
e a saturação 200%, e é a **saturação** que se lê como vidro: sem ela a
superfície lava a cor do que tapa e fica cinzenta.

O único número que muda de superfície para superfície é o desfoque, e por isso
é o único que sai como botão: `--vidro-desfoque`. As duas barras do formulário
de anúncio baixam-no a 20px porque flutuam por cima de alguém a escrever.
Medido em 8 voltas alternadas na mesma sessão, a receita partilhada contra a
que essas duas barras tinham antes: **−0,2ms de mediana em desktop e +0,1ms em
telemóvel** por tecla — ou seja, nada. Uma primeira medição de 3 voltas dava 3
a 4ms, e é o mesmo erro que este ficheiro já conta noutro sítio: três voltas
não distinguem 3ms de ruído. Não havia mecanismo — as duas receitas são o
mesmo `blur` mais `saturate`, e o que difere são constantes.

Duas defesas obrigatórias, e nenhuma é decoração: `@supports not
(backdrop-filter: …)` devolve um fundo opaco, e `prefers-reduced-transparency:
reduce` também — sem desfoque por baixo, um véu translúcido é texto por cima de
texto.

**Uma superfície escondida não pede camada.** O farol do formulário só aparece
quando o topo sai do ecrã, e no estado escondido o `backdrop-filter` está
escrito a `none` de propósito: juntá-lo ao `.vidro` sem essa linha devolvia a
camada que ninguém vê — o mesmo defeito que as etiquetas do globo tiveram.

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
do item de navegação activo, o CTA de publicar anúncio, o `.selo-destaque`, os
graus «Ouro» e «Prata» do pedigree — nesse caso o dourado é o próprio dado — e
**o preço**.

O preço esteve fora desta lista durante todo o tempo em que a lista se
descreveu como fechada, e a omissão não era inocente: a `.preco` tem
`color: var(--gold)` desde sempre e é escrita em **sete** sítios, um deles o
`HorseCard`, que é o cartão de todas as grelhas do marketplace. Ou seja, o
elemento dourado **mais frequente do site inteiro** não estava na lista dos
sítios onde o dourado pode estar. Quem lesse a regra e fosse contar acharia que
ela estava a ser violada em cada ecrã.

Fica na lista pela razão que já justifica os graus do pedigree: **num
classificados o preço é o dado**, e o dourado ali não decora coisa nenhuma —
diz qual dos números da caixa é aquele por que se compara. E fica escrito o
método, porque foi assim que se apanhou: uma lista que se diz fechada verifica-se
contra o código, e não contra a memória de quem a escreveu.

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
   há outro. Texturas em `public/globo/` (569,3 KiB em cinco ficheiros, mais
   55,1 KiB de contornos comprimidos; só nesta página). O número esteve errado
   duas vezes, e as duas por boas razões: os «569KB» originais eram quatro
   ficheiros e o `cor.webp` juntou-se-lhes sem ninguém somar; medido, eram
   618,7 KiB. Encolher a máscara de mar devolveu-o a 569,3 — coincidência, e
   fica escrito para ninguém pensar que ninguém mexeu. Chegou a haver outros dois — ver o ponto
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

     **E vale também para um ponto que junta várias**, que era onde a regra
     estava escrita mas não aplicada: o título era a terra e os nomes iam
     sussurrados por baixo, a 10px e com reticências. Medido a 1400×950 com
     as vinte e nove verdadeiras, **duas etiquetas por carregamento acabavam
     em «…», e as duas eram destas** — e a linha cortada era a única que
     trazia informação. «Vila Viçosa» em cima, «Vila Viçosa · Jupiter
     Classical Dress…» por baixo: a mesma palavra em dois tamanhos e em dois
     papéis, com a resposta cortada. Agora **duas coudelarias ganham uma
     linha cada**, as duas com o peso de um nome — e o algarismo que se
     encostava ao título saiu do sistema, porque duas linhas contam-se de
     relance e «Alter do Chão 2» lia-se como o número da porta. **Três ou
     mais** não cabem em linhas legíveis, e aí a conta é a resposta honesta:
     o título passa a ser a conta e a terra desce para a segunda linha. A
     terra só se escreve quando é uma ou duas, e não se escreve de todo se um
     dos dois nomes já a disser. A regra é uma função pura em
     `lib/globo/ficha`, com testes sobre os quatro ajuntamentos que os dados
     verdadeiros fazem. Medido depois: **zero reticências nas três vistas**.
     Custou um nome em telemóvel (dez para nove): as etiquetas de par são
     mais altas, e quem sai passa a ser contado por uma mancha.

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
   - **A máscara de mar é uma máscara, e não uma fotografia.** O
     `brilho.webp` vinha a 2048×1024 como as outras texturas do planeta, mas o
     shader lê-lhe **um canal só** e usa-o para uma coisa apenas: um lóbulo
     especular de expoente 34 — largo e suave — onde o Sol bate de raspão no
     mar. Uma máscara que multiplica um lóbulo desses não precisa da resolução
     de uma imagem; precisa de saber onde acaba a terra com uma margem da
     ordem do próprio lóbulo. Custava **8 MiB de memória de vídeo para
     carregar um canal**, e no telemóvel é onde ela falta. Fica a 1024×512:
     2 MiB, e o ficheiro cai de 98,6 para 52,2 KiB. Medido antes de decidir,
     comparando a reduzida contra a original: 1024×512 dá erro médio de
     3,44/255 e 512×256 dá 5,34, todo ele na linha de costa — e escolheu-se o
     degrau conservador, porque a costa de Portugal é justamente a parte que
     se vê de perto. Medido depois, no ecrã: o mesmo quadro do globo com uma
     máscara e com a outra difere **no máximo 2/255 num subpixel**, com zero
     subpixéis acima disso. O guião está em
     `scripts/globo/encolher-brilho.mjs`.
   - **A camada dos nomes não é o custo do teste de acerto**, e isto fica
     escrito para o próximo não ir por aí. Uma auditoria apontou 409ms de
     `HitTest` num arrasto de quatro segundos a 390×700 e propôs tirar a
     camada do caminho do ponteiro durante o gesto. Fez-se, mediu-se, e **não
     comprou nada**: 7ms de `HitTest` antes e 7ms depois. Isolado o mecanismo,
     a camada custa **2 microssegundos por teste de acerto** — 422 nós, mas a
     esmagadora maioria já está com `pointer-events: none` pelo `data-oculta`.
     A dois microssegundos, sessenta vezes por segundo, são 0,12ms por
     segundo. A alteração foi revertida: uma mudança que não se prova não
     entra.
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
     em desktop escrevem-se catorze — eram treze antes de as etiquetas de par
     encolherem a caixa —, em telemóvel dez. (O número deste parágrafo esteve
     em «oito» e o de baixo em «dez para nove»: dois números diferentes no mesmo
     ficheiro, e nenhum certo. Medido em repouso, cookies aceites: **14 em 12 de
     12 carregamentos** a 1400×950 e **9,90 de média em 10** a 390×700.) Os que sobram juntam-se
     em manchas com um algarismo, e apontar uma abre a lista de quem lá está.
     As manchas calculam-se **depois** da colocação e só apanham as sobras —
     nunca podem tirar o nome a ninguém. Agrupam no ecrã e não no terreno, e
     por isso desfazem-se ao aproximar: quem mexe na roda tem recompensa
     visível.

     **E isto era mentira em cerca de 7% dos carregamentos.** A colocação de uma
     mancha tentava vinte e cinco sítios — o centro do ajuntamento e três anéis
     de oito, até 68px — e, se estivessem todos ocupados, **desistia em
     silêncio** (`if (!posta) continue`). Desistir ali não deixa um algarismo por
     escrever: **apaga todas as coudelarias que esse algarismo estava a contar**.
     Uma lista de vinte e cinco palpites não é uma procura, e onde ela se
     esgotava a promessa desta linha calava-se. O quadro que decide é um só —
     depois de a entrada assentar o ciclo pára —, por isso nunca havia segunda
     tentativa.

     A resposta já estava no ficheiro, noutro sítio: uma sobra sozinha não ganha
     mancha própria se houver uma ao lado — junta-se a ela, porque «a conta de
     uma zona vale mais do que duas contas ao lado uma da outra». A mesma regra
     fecha o buraco. **Um ajuntamento que não acha lugar é adoptado pelo mais
     próximo que achou**, e só se nada tiver sido posto é que se abre uma espiral
     à janela toda. A decisão mudou-se para `lib/globo/manchas.ts`, onde é uma
     função total sem um ramo que deite fora um membro, e onde duas invariantes
     estão fixadas por testes sobre 600 quadros apertados gerados ao acaso: **cada
     sobra é contada exactamente uma vez**, e **nenhum algarismo toca num nome,
     noutro algarismo ou na borda**. Há uma excepção, e é testada: se não existir
     uma única posição livre na janela inteira, devolve-se o que se conseguiu em
     vez de escrever por cima de um nome — um nome apagado é pior do que uma
     conta por escrever, e o quadro seguinte tenta outra vez.

     Medido: 29 de 29 com conta no ecrã, 0 sobreposições contando manchas e nomes
     juntos, em 40 carregamentos a 1400×950 e 40 a 390×700. Antes desta correcção
     o telemóvel dava 39 em 40.

     **E um algarismo «1» é um disco a tapar um nome.** A mancha existe para
     contar o que não coube; contar _um_ não conta nada — dá um disco igual
     ao que noutro sítio do mapa cobre nove, e obriga a apontá-lo para saber
     uma coisa que uma palavra dizia de graça. Medido: 0,8 discos destes por
     carregamento a 1400×950. Uma sobra que ficaria sozinha ganha por isso
     uma segunda oportunidade, e só ela: a regra que lhe barrou o caminho —
     nenhum nome pousa sobre outro alfinete — cede aqui pela mesma razão por
     que já cedia à etiqueta apontada, porque a dúvida que ela previne é
     menor do que a de um ponto que não diz nada, e o fio continua a apontar
     o alfinete. O que **não** cede é a colisão entre nomes. O resgate corre
     antes de os algarismos irem para o DOM, e o que sobrar recoloca-se
     contra a lista já com o nome novo lá dentro — nenhum algarismo aterra em
     cima do que se acabou de escrever. As sobreposições continuam em zero.

     **O número que aqui esteve estava na ponta optimista, e a lição é essa.**
     Escreveu-se «0,8 → 0,2» a partir de **seis** carregamentos, que não
     decidem nada: uma auditoria posterior mediu 0,50 em vinte, e uma terceira
     amostra de vinte deu 0,25. O honesto é **entre 0,2 e 0,5**, e o que os
     três números dizem em conjunto é que a variância entre carregamentos é
     maior do que a diferença que se estava a reclamar. Uma amostra de seis
     não distingue 0,2 de 0,5. Os que restam são o caso honesto — não havia
     sítio nenhum, e aí uma conta vale mais do que um silêncio.

     **E o painel aberto era escrito por cima.** A mancha fechada é um disco de
     22px, mas aberta o painel ocupa 170×255 no computador e 160×210 no
     telemóvel — e nada na colocação dos nomes sabia que ele existia. As
     manchas nascem à montagem e os nomes refazem-se a cada reagrupamento,
     logo em ordem de DOM cada nome vem depois de cada mancha e pintava por
     cima dela; o `z-index: 2` do próprio painel nunca podia responder, porque
     o `will-change: transform` faz da `.globo-mancha` um contexto de
     empilhamento e esse 2 só vale lá dentro. Perdiam-se os dois: texto a 12px
     sobre texto a 12px não é nenhum dos dois. Medido, abrindo todas as
     manchas de oito carregamentos por vista: **46 caixas por cima do painel
     em 16 painéis no computador e 73 em 24 no telemóvel** — cerca de três por
     painel.

     Dizer à colocação que ali há uma caixa ocupada era a saída errada, e por
     duas razões que o ficheiro já tinha escrito: os nomes saltariam no
     instante em que o painel abre — o alvo a fugir de debaixo do dedo de quem
     acabou de carregar —, e os que não achassem lugar novo cairiam nas
     sobras, ou seja **perdiam-se por causa de uma abertura**. A ficha rápida
     não empurra ninguém pela mesma razão, e esta é a mesma casa.

     A resposta são duas metades da mesma afirmação — _o painel está à
     frente_. Em CSS a mancha aberta sobe (`z-index: 3`, acima do 2 da
     etiqueta escolhida). E no motor, quem cai na caixa do painel recua a
     zero enquanto ele estiver aberto — nomes e algarismos, menos o algarismo
     dono do painel. Não é esconder informação: o painel é opaco e já os
     tapava. O que ele não sabe fazer é tapá-los **inteiros**, e meio nome à
     borda de um painel lê-se como um erro de desenho. Apagar é a mesma
     cobertura dita com franqueza, e o esbatimento de `--d-fast` que a
     etiqueta já tem trata da passagem — é o tempo dos hovers e dos botões,
     que é o gesto que abre isto.

     Nada disto toca na colocação: a etiqueta continua colocada, a caixa dela
     continua no depósito, e a caixa da mancha **fechada** não cresce um pixel
     — o `lib/globo/manchas` não foi tocado e os 600 quadros dos testes dele
     continuam de pé. Medido depois, nos mesmos 35 painéis: **0 caixas por
     cima do painel, 0 nomes deslocados por abrir, 0 sobreposições entre nomes
     e algarismos**, e ao fechar todos os nomes voltam ao mesmo pixel e à mesma
     opacidade. O painel é medido com a animação de abertura calada, como a
     ficha rápida já fazia: a 95% do tamanho a correcção de borda saía 4px
     curta e a caixa do véu 8×13 mais pequena do que o painel que se vê.

   - **As setas percorrem as vinte e nove**, por latitude, de norte para sul,
     e cada passo traz a coudelaria à vista antes de lhe dar o foco. A
     tabulação continua a passar só pelos nomes que se lêem: uma segunda rota
     por bolhas que mudam de sítio a cada arrasto seria uma rota pior, não uma
     a mais.

     **E a promessa da linha acima era falsa a meio do percurso.** Quem manda
     na etiqueta activa é `fixa ?? focada`, e o `fixa` — que serve para abrir
     a lista de um ajuntamento — era **posto e nunca limpo**. A partir do
     primeiro ajuntamento por que o percurso passasse, o `fixa` velho tapava o
     `focada` novo, e todas as etiquetas de uma coudelaria só que viessem a
     seguir deixavam de ser a activa.

     Não é um detalhe de estilo: a activa é a primeira a escolher lugar, é a
     única a quem a regra de não pousar sobre um alfinete cede, e é a única
     que fica onde estava em vez de procurar outro sítio. Sem isso, uma
     etiqueta com o foco pode não caber — e o foco fica num nome que ninguém
     vê. Medido a 1400×950, 32 passos: **três com o foco numa etiqueta a
     `opacity: 0`**, e a assinatura era exacta — os três eram de uma
     coudelaria só, os três sem `data-activo`, enquanto todos os membros de
     ajuntamento o tinham (para esses o `fixa` era posto de propósito) e o
     primeiro passo também (aí o `fixa` ainda era nulo).

     Uma linha: o `fixa` passa a ser **escrito a cada passo**, com o
     ajuntamento ou com nulo. Medido depois: **32 de 32 passos visíveis e
     activos**, a 1400×950 e a 390×700, com zero reticências e zero
     sobreposições. A lição de método é a que este ficheiro já repete: o
     sintoma era «o foco cai num nome invisível» e a causa era um `??` — e
     duas medições do sintoma não a tinham encontrado.

   - **A janela útil não é a lona.** O motor não escreve por baixo do que está
     fixo no ecrã — a barra de cookies, o cabeçalho. E não o faz sabendo que
     eles existem: pergunta ao browser quem está no caminho, com
     `elementFromPoint` a subir ao primeiro antepassado `fixed`. O globo não
     conhece classes de outros componentes.
   - **E a janela útil também manda na câmara.** A regra acima só valia para a
     colocação: quem apontava a câmara — o `centrarEm` do percurso pelas setas
     — punha a coudelaria no centro da **lona**. Com a barra de cookies em pé,
     que é o estado de qualquer primeira visita, oito dos trinta e dois passos
     davam o foco a um nome a `opacity: 0`. Medido a 390×700: a faixa útil é
     [118, 448] e o alfinete pousava a y≈327, **dentro** dela — não era o
     `prender` a limitar (zero dos 32 passos) nem o ponto a cair na parte
     tapada. Era a folga gasta do lado errado: uma etiqueta de ajuntamento
     aberta mede 286px de altura e a faixa tem 326 úteis, ou seja vinte pixéis
     de folga para cada lado, e centrar na lona punha o alfinete quarenta e
     quatro abaixo do centro da faixa. As oito hipóteses falhavam todas. No
     ajuntamento de cinco, que mede 241, falhava por **0,8px** — que é a
     assinatura de uma folga mal repartida e não de um limite. O centro da
     faixa é o sítio que deixa a maior folga **igual** dos dois lados, e é por
     isso o que dá mais hipóteses a uma etiqueta alta. A conta é iterativa pela
     mesma razão que a do zoom sobre o cursor: a `escala()` dá a derivada e
     três passos chegam a menos de um pixel. Corre por tecla, não por quadro, e
     continua sem animação. Nos quatro passos mais a sul o `prender` passa a
     limitar, e não custa nada — são nomes de uma linha, e quem precisa da
     centragem são os ajuntamentos, que estão no meio. Medido: **32 de 32
     passos visíveis e activos** nas duas vistas e nos dois estados da barra,
     contra 24 no pior.

   - **Travar a entrada é chegar já, não parar a meio.** O `aoDescer` punha
     `aEntrar = false` e mais nada, e a altura ficava no fotograma em que a
     viagem ia — que a meio caminho é o espaço: África no quadro e as vinte e
     nove coudelarias num borrão. Medido a 1400×950, com o carregar despachado
     no quadro certo: quatro nomes contra os catorze do repouso, e o
     espalhamento das etiquetas a cair de 489 para 141. Carregar em «Aproximar»
     **piorava** — dois nomes, 104 —, porque o zoom é multiplicativo e a partir
     de 2,0 seis dentes não chegam ao repouso. E ficava gravado: `h = 2,0000`
     no `sessionStorage`, uma coudelaria legível e espalhamento zero, durante
     meia hora e em todas as visitas ao mapa nesse separador. Três defesas,
     cada uma válida por si: o `aoDescer` pousa, o `guardarVista` recusa-se a
     guardar a meio de uma viagem — a promessa é sobre o que se guarda, não
     sobre quem chama —, e a chave passou a `globo-terra:vista:2` para desfazer
     o que ficou preso. Fica escrito que isto andava meio escondido por
     acidente: o `ResizeObserver` tem lá dentro um `alturaVoo = alturaRepouso`
     que o salvava sempre que a caixa mudasse de tamanho a seguir e ninguém
     tivesse tocado no zoom. Duas condições que não são garantia nenhuma — e a
     segunda desaparece assim que alguém aproxima.

     A lição de método é outra, e é para guardar: **uma optimização pode não
     criar um defeito e mesmo assim ser responsável por ele.** O
     pré-carregamento das texturas fez a lona compor-se cerca de um segundo e
     meio mais cedo, e com isso a viagem de entrada passou a estar a correr
     muito mais vezes no instante em que alguém toca pela primeira vez. O
     defeito era o mesmo desde sempre; o que mudou foi a probabilidade de o
     encontrar, e foi assim que ele chegou ao ecrã de quem usa o site.

   - **A roda é da página até alguém pegar no globo.** O `aoRodar` saía à
     cabeça quando a lona era o ecrã e havia página por baixo — e no `/mapa`
     isso é sempre verdade, com 380px por rolar a 1400×950 e 720px a 390×700,
     tudo rodapé. Ou seja, num computador a roda **nunca** aproximava: medido,
     seis dentes sobre o centro da lona, zero alteração no espalhamento, nas
     duas vistas e com e sem `prefers-reduced-motion`. A cedência não se desfaz
     — quem chega e rola para ler o que está por baixo não pode ficar preso a
     um globo que nunca pediu —; o que muda é **quando** ela acaba: à página
     até alguém pegar no globo, ao globo a partir daí, e ao sair do ecrã o
     globo devolve-a. Medido depois: antes de pegar a página desce os mesmos
     380px e há **zero** ouvintes bloqueantes; depois de pegar, seis dentes
     levam o espalhamento de 495 a 1116 e outros seis trazem-no a 496. O sinal
     é um `pointerdown` de rato ou caneta e os botões de aproximar, **nunca o
     dedo**: num ecrã táctil o gesto que pegaria no globo é o mesmo com que se
     rola a página, e ao `pointerdown` não há como distingui-los — prender o
     dedo pelo primeiro toque deixava a página sem maneira de descer a partir
     do segundo. Por isso o `touch-action` continua governado só pela
     geometria, e isto mexe numa coisa só: a roda, que é um órgão de rato. O
     ouvinte não passivo só passa a existir depois de alguém pegar — quem nunca
     pegou continua com zero, que é o que este ficheiro exige desde o Lenis.

   - **Um contexto perdido volta, e se não voltar refaz-se a cena.** É a causa
     do ecrã preto que o dono do produto via no telefone. Reproduzida de duas
     maneiras realistas a 390×700 — vinte lonas WebGL na mesma página (o tecto
     dos dezasseis do Chrome) e a perda com o separador escondido —, e nas
     duas o browser manda `webglcontextlost` **e mais nada, nem ao fim de seis
     segundos**: o `webglcontextrestored` só chega se alguém chamar o
     `restoreContext()`, e nenhum browser o chama sozinho. O código esperava
     por esse evento e a cena montava uma vez por vida do componente, logo um
     contexto que não voltasse não voltava nunca. O que se via: planeta preto,
     sete nomes a flutuar com os fios a apontar alfinetes que já não existem, e
     «VISTA 3D SUSPENSA» escrito **por cima** de «3 coudelarias» — os dois
     textos ilegíveis ao mesmo tempo.

     Três metades, e nenhuma chega sozinha: espera-se pela reposição do browser
     e, se não vier, **refaz-se a cena** — nunca num separador escondido ou fora
     do ecrã, três tentativas, com a conta a recomeçar ao fim de um minuto de
     vida sã; a caixa inteira — lona, nomes e comandos — **apaga-se junta**, em
     vez de a mensagem escrever por cima dos nomes; e leva `inert` enquanto não
     há cena, porque **vinte e sete ligações invisíveis e focáveis** é uma
     armadilha para quem só tem teclado. Medido em quatro cenários: a vista
     volta em todos, com uma lona e um contexto vivo, 29/29, zero
     sobreposições, zero rAF em repouso, e zero ligações invisíveis focáveis. À
     quarta perda seguida desiste, e a frase passa a dizer a verdade.

   - **O `ResizeObserver` não refaz o mundo para uma caixa do mesmo tamanho.**
     Com o palco escondido, ele disparava com a largura a zero — que o `|| 1`
     transformava em um — e corria a cadeia toda: `setSize`, `alturaParaCaber`,
     `prender`, `colocarCamara`, `reagrupar`, `pedirEstorvos`. Ao reaparecer
     corria tudo outra vez. A guarda é de assinatura, e o padrão já estava no
     ficheiro (o `medidaDaPrisao` do `verSePrende`): se a medida for a mesma,
     sai à cabeça; e uma medida degenerada não descreve caixa nenhuma. Medido
     em A/B intercalado sobre Mapa→Lista→Mapa: **4332 → 824ms** a 1400×950 e
     **3146 → 530ms** a 390×700. Rodar o ecrã continua a refazer o
     enquadramento, que é o que ele existe para fazer.

   - **A segunda linha da etiqueta ficou legível, e quem conta é a cor.**
     «Beja» sobre o Alentejo ao sol media 2,05:1 e via-se a olho numa
     fotografia do telefone. Medido: **47 de 47 abaixo de 4,5:1 → 0 de 70**,
     com o pior caso a passar de 2,03 para 4,53. E fica escrito o que **não**
     comprou nada: reforçar só a sombra leva o pior caso de 2,03 a 2,30 — cem
     por cento continuam abaixo do mínimo. Uma sombra espalha luz, não muda a
     tinta.

   - **Duas coisas que se mediram, não compraram nada e foram revertidas.**
     Arrancar a entrada no `revelar` (a viagem corre inteira atrás de uma caixa
     a `opacity: 0` — zero de nove quadros com imagem) baixa o percurso das
     setas para 27–29 em 32, porque a cascata de nascimento conta o atraso
     desde que o nó entra no DOM e tem `fill-mode: backwards`. E pôr uma
     transição no realce do alfinete — apontar um nome desenha **um quadro**,
     logo o ponto comuta enquanto o nome transita — custa o mesmo percurso.
     As duas estão escritas no ficheiro com a assinatura exacta, para não serem
     tentadas outra vez às cegas.

   - **E a lição de método que mais vale desta passagem: medir em sequência,
     numa máquina com carga, disfarça-se de regressão.** O percurso das setas
     media 30,5 contra 31,5 e parecia ter piorado; em A/B **intercalado**, com
     os dois builds servidos ao mesmo tempo, deu igual ou melhor em 8 de 8
     pares. O mesmo com os discos «1»: sequencial dava 0,75 contra 0,25,
     intercalado dá **0,00 contra 0,11 em nove cargas**. Quando a diferença que
     se procura é da ordem da variância da máquina, a ordem das medições **é**
     a medição.

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
     quem está a apontar.

     **E o alfinete tem agora um verbo próprio: o nome é «ir», o alfinete é
     «conta-me mais».** Carregar no nome continua a chegar à ficha num passo — é
     uma âncora a sério, com o botão do meio e o Ctrl —, e carregar no alfinete
     abre a ficha rápida por cima do globo. Antes o alfinete era um segundo botão
     para o mesmo destino: 44 pixéis de alvo a não dizer nada de novo. Dois
     alvos, dois verbos, e ninguém perde um passo — nem no telemóvel, onde
     apontar não existe.

     **A ficha rápida não pode empurrar um nome**, e isso não é uma esperança: é
     `position: absolute` dentro da caixa do próprio nome, tal como o painel da
     mancha está dentro do algarismo. Um filho absoluto não conta para o
     `offsetWidth`/`offsetHeight` do pai — e esses dois números **são** a caixa do
     teste de colisão. Também não precisa de ser vista pelo `medirEstorvos`,
     porque não flutua por cima de nada: é filha da camada que o motor já
     governa. Medido, de fichada fechada contra aberta: todos os nomes colocados
     no mesmo pixel, e 0 sobreposições nas duas. E o que se mostra lá dentro sai
     do que a base tem: sem `foto_capa` não há fotografia nem um rectângulo
     cinzento a fingir uma, e sem `num_cavalos` não há número nem um travessão.
     Uma fotografia por vez, e só a pedido — abrir o mapa custa cinco imagens,
     abrir uma ficha custa seis. Era um halo aditivo de dez pixéis com cauda: um
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

  **E esta regra tinha uma excepção escondida na página do globo.** O
  `medirEstorvos` — o que pergunta ao browser quem está fixo no caminho —
  corria uma sondagem completa **por evento de `scroll`**, e uma sondagem são
  até 36 `elementFromPoint`, cada um com o `getComputedStyle` da subida aos
  antepassados. Medido a 390×700, em dois segundos de rolo: **1296
  `elementFromPoint`**. Era a maior despesa de linha principal da página, e
  era exactamente o padrão que o parágrafo acima conta ter corrigido noutro
  sítio.

  Era também trabalho a dobrar, porque a resposta não podia ter mudado: um
  elemento `fixed` **não se mexe na janela quando a página rola** — é a
  definição. O que muda é onde a lona está, e isso é uma leitura e não trinta
  e seis. A rolar recalcula-se a partir das faixas que a última sondagem
  encontrou; um `sticky` é a excepção, porque esse mexe-se mesmo, e volta a
  perguntar. E as sondagens completas passaram a **travão de fim** e não de
  ritmo, tanto no rolo como no `transitionend`: uma transição não acaba uma
  vez, acaba uma vez por propriedade, e o cromado deste mapa transita várias
  ao mesmo tempo. A meio do gesto não se pergunta nada; a pergunta cai 160ms
  depois de tudo assentar.

  Medido, três corridas por vista, com a lona sempre no ecrã: **1296 → 108 a
  390×700** e **1251 → 747 a 1400×950**. O que resta no computador são seis
  sondagens em dois segundos, e são legítimas — a barra e o rodapé do mapa
  escondem-se ao rolar, e a lona útil muda mesmo. E o que a faixa existe para
  garantir continua garantido: **zero nomes debaixo de um estorvo fixo**, nas
  duas vistas, antes e depois.

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

  **No globo a regra é a mesma e a solução é a outra metade dela.** As
  etiquetas e as manchas pedem `will-change: transform, opacity` porque mudam
  mesmo de sítio a cada quadro enquanto alguém arrasta — o `.assente` não lhes
  serve, porque não são uma entrada que corre uma vez. Mas o pedido ficava de
  pé para as vinte e nove etiquetas e as vinte e nove manchas, sempre: medido,
  **48 camadas pedidas a 1400×950 com 16 elementos visíveis**, e 43 com 13 a
  390×700. Três dezenas de camadas a ocupar memória de vídeo para não animar
  nada — e no telemóvel é onde ela falta. Quem está escondido não está a
  animar, e há um sinal que já diz isso a cada quadro: o `data-oculta`. Medido
  depois: **16 pedidas para 16 visíveis, e 11 para 11**.

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

### A ficha de uma coudelaria

**O `sticky` desta casa não prende, e a razão está no `body`.** A regra
«Prevent horizontal scroll on mobile» põe `overflow-x: hidden` no `html` e no
`body`, e o `hidden` no `body` faz dele um contentor de deslocamento — um
`position: sticky` prende ao contentor mais próximo, e o do `body` nunca se
desloca. A ficha teve um `lg:sticky lg:top-28` letra morta: medido a 1400×950,
a rolar 0→2400px o topo da coluna ia de 577 a −1823, pixel a pixel com o rolo.
**Os números que aqui estiveram não se reproduzem, e um deles é
aritmeticamente impossível.** Dizia-se «10 das 29 fichas com o contacto fora do
ecrã em mais de metade do percurso» e «82,6% contra 58,9%». Refeita a medição
sobre as vinte e nove, 201 posições de rolo cada, com o mesmo A/B na mesma
página: **83,4% contra 74,8%**, e **0 de 29** fichas com o contacto fora em mais
de metade — nos dois braços. E o par não podia estar certo: o que a correcção
compra é exactamente `curso` pixéis de rolo, logo o ganho em pontos percentuais
é `curso ÷ maxScroll`. O curso medido nas vinte e nove vai de **0 a 302px**
(oito fichas têm ≤ 39px e quatro têm zero), portanto 23,7 pontos exigiriam um
documento de ≤ 2224px — e o próprio parágrafo fala de rolar 0→2400px, que
implica um documento ≥ 3350px e um tecto de 12,6 pontos. Uma página mais alta só
**encolhe** o ganho. O ganho é real e é pequeno. Quem corrige é `overflow-x: clip`, que é **mais** restritivo do
que o `hidden` — nem por programa deixa deslocar — e não cria contentor. Está
aplicado por página (`body:has(.fc-ficha)`) e não na origem, porque a regra é
de todo o site e a troca lá merece a sua própria medição. **A lição vale para
além do `sticky`: uma propriedade escrita não é uma propriedade a funcionar** —
o `getComputedStyle` dizia `position: sticky` e `top: 112px` nos dois casos.

**A troca na regra global foi medida e não entra.** O parágrafo acima dizia que
a regra é de todo o site e que a troca lá merecia a sua própria medição. Fez-se.
Primeiro confirmou-se o mecanismo de forma independente, com um A/B sobre o
`sticky` **verdadeiro** da ficha, ligando e desligando a regra na mesma página e
na mesma sessão: com `hidden` o elemento **acompanha o rolo pixel a pixel** (de
577 para −1176 num rolo de 1753), com `clip` deixa de o acompanhar. A causa
estava certa.

Depois foi-se ver quem mais no site tem um `sticky` a ganhar com isso, e a
resposta é **ninguém que se alcance**. Há catorze menções a `sticky` no código:
duas são do motor do globo e do cromado do mapa, uma é a coluna desta ficha, uma
é um comentário no `/comprar/[id]` que descreve um `lg:fixed` e não um `sticky`,
e as **duas** restantes são painéis de páginas de administração, atrás de
autenticação. Medido em dez rotas e três vistas: **zero páginas com deslocamento
horizontal** antes da troca, e os únicos dois `sticky` alcançáveis são os desta
ficha, que a regra por página já cobre. Trocar `hidden` por `clip` na origem não
compraria um pixel a ninguém — e não é de graça: só na página inicial há **31
elementos a passar da janela, o pior por 2837px**, que é precisamente o que a
regra existe para conter. Arriscar isso por um ganho medido de zero é o
contrário do que esta casa faz.

**E ficou a saber-se onde está o resto do problema.** Com o `clip` a coluna
prende — mas prende pouco: a caixa que a contém mede 1210px e ela mede 1048,
logo tem **162px de curso**, ao lado de um artigo de 2095px. Medido: com
`hidden` a coluna acaba a −1176, com `clip` a −1032. A diferença são os tais
162px, e depois disso ela sai do ecrã à mesma, porque um `sticky` nunca passa do
bloco que o contém. Quem quiser a barra lateral a acompanhar a leitura inteira
tem de dar altura ao bloco que a contém, e isso não é um `overflow` — é a
composição da grelha.

**O que aparece em todas as fichas não convida: é papel de parede.** Saíram
três coisas que estavam em 29 de 29 — a caixa a tracejado «Ainda não há
avaliações» (140px de secção para escrever uma ausência, agora 58px, e quem
manda é `total === 0`, logo à primeira avaliação volta inteira), as coordenadas
em cru sob o mapa (12px a 3,45:1, e para ninguém — quem quer lá chegar tem o
«Como chegar», e o número continua a alimentar o mapa), e os 87 links de rodapé
que a barra fixa do telemóvel tapava sem rolo que lá chegasse, porque o rodapé
é irmão da ficha e não filho, e o `pb-28` do contentor não o alcança.

**Um comentário que descreve uma ordem não a garante.** O cabeçalho do
componente diz «o que fazem → os factos e como lhes chegar → as provas», e no
telemóvel os serviços e o «Onde fica» caíam **depois de todas as provas, em 29
de 29** — a 57% e 60% da altura da página. A razão escrita para isso ser
aceitável era falsa, e mediu-se: «o "Como chegar" está na barra fixa» — a barra
só o mostra sem telefone nem website, e há telefone em 29/29; medida, escreve
«Enviar email | Telefonar» em 29 de 29 e «Como chegar» em zero. Corrigido:
serviços 2640 → 1448px, «Onde fica» 2769 → 1578px. No computador não se mexe um
pixel. **E um muro só é um muro se tiver alguma coisa atrás**: a «História» é a
única secção sem tamanho (97 a 1973px, sete das 29 acima de um ecrã) e estava em
segundo lugar, com os cavalos, os prémios e os testemunhos por baixo. Passa a
ser a última das provas, e as secções de prova atrás de mais de um ecrã de prosa
caem de 12 (em 7 fichas) para zero.

**O que o `overflow-x: clip` corta, corta em silêncio.** Abaixo dos `sm`, a
grelha das «Coudelarias mais próximas» não declarava coluna nenhuma, e um item
em faixa implícita `auto` leva `min-width: auto`: não encolhe abaixo do
min-content, que aqui é 493px dentro de um contentor de 358. Medido a 390×780:
**18 fichas e 54 dos 87 cartões passavam da borda direita, até 187px**, com a
morada cortada a meio de uma palavra. Não havia barra de deslocamento a
denunciá-lo, porque o `clip` que esta página põe no `body` — pela boa razão de
fazer o `sticky` prender — corta **sem deixar deslocar**. Os `sm:grid-cols-2`
nunca tiveram o problema, e é essa a assinatura: o Tailwind escreve-os
`repeat(n, minmax(0, 1fr))`. **A defesa de uma regra pode esconder o defeito de
outra: depois de pôr um `clip` num contentor, o que se mede deixa de ser o
deslocamento e passa a ser a caixa.**

**E o «curso de 0 a 302px» do `sticky` era o retrato de um banco pobre.**
Remedido no elemento verdadeiro com a prosa dos seeds do repositório, o curso
vai de **0 a 1766px, mediana 303** — 939 de mediana nas catorze fichas cujo
artigo passa de 1400px. Não há composição de grelha a corrigir: o bloco que
contém a coluna já é a coluna do artigo em 27 das 29. O que sobra são as duas
fichas em que a barra é **mais alta** do que o artigo, e essas são exactamente
as duas do buraco da coluna esquerda — curso zero de um lado e vazio do outro
são o mesmo facto visto duas vezes. **Antes de concluir que uma barra lateral
não acompanha a leitura, confirma que o banco de ensaio tem leitura para
acompanhar.**

A `.fc-nota` é a irmã da `.vc-nota`: tamanho de legenda, papel de texto. As três
linhas desta página que respondem a uma pergunta — a ressalva «Distâncias em
linha recta», a terra de cada cartão de vizinho e o sítio sob «Onde fica» —
escreviam-se com a tinta da `.meta`, 3,45–3,66:1 nos pixéis; passam a
7,89–8,37:1. A ressalva não é decoração: das 87 distâncias que as 29 fichas
escrevem, **dezassete passam dos 50 km e duas dizem 121 e 129 km**.

**Do recorte da fotografia de topo ficou um «não comprou nada» medido.** A
janela de 2,92:1 mostra 52% da altura da fotografia mediana e 23% na pior. A
correcção óbvia — subir o `object-position` — foi ensaiada em sete valores
sobre a energia do laplaciano por linha das 28 capas: o centróide fica em
0,511, a meio, e a posição que retém mais energia é justamente os 50% por
omissão (57,2% contra 53,9% a 20%). **Subir piora.** O que ajudaria era uma
janela menos achatada, e isso troca primeiro ecrã por fotografia numa página de
classificados — não entrou por não se provar.

**E uma nota sobre bancos de ensaio que a secção das regras de trabalho não
diz:** desconfiar também da **cobertura**. Um banco com `historia` em 29/29 mas
a mesma frase de 69 caracteres nas vinte e nove tem cobertura perfeita e não
consegue reproduzir os doze parágrafos que o defeito descreve. Foi contra um
banco desses que entrou aqui uma coluna única para «fichas sem provas», apoiada
em «12 das 29 não têm galeria nem história nem prémios»; um segundo banco deu
história em 29/29, o ramo era código morto, e foi revertida.

### O directório das coudelarias

**As duas metades da página falavam vocabulários diferentes.** A gaveta escreve
sete pastilhas de actividade — a taxonomia do `lib/especialidades`, que junta
«Toureio» com «Tauromaquia» e «Equitação de Trabalho» com «Working Equitation»
— e a caixa de procura, ao lado, varria só o texto em bruto da base, que está
todo em português. Escrever na caixa o que estava escrito na pastilha dava,
medido sobre as vinte e nove e nas três línguas — vinte e uma pastilhas —,
**zero resultados em treze**: seis das sete em inglês, seis das sete em
espanhol. A única que escapava era «Dressage», e só porque se escreve igual nas
três. É a mesma falha que já estava escrita para «coudelaria alentejo» — zero
resultados com a resposta na base, que é a pior coisa que uma caixa de procura
pode fazer, porque não há nada no ecrã a que culpar — mas desta vez **a palavra
que não achava nada estava impressa ao lado dela**. O texto pesquisável passa a
incluir os rótulos das actividades nas três línguas, porque o site tem selector
de língua e quem chega de fora escreve na sua: treze zeros → zero, e onde a
conta ainda difere da pastilha a procura devolve **mais**, nunca menos — é o
filtro que arruma, não é a procura que apaga. Os rótulos estão escritos à mão
porque os três dicionários somam 366 KiB e este módulo entra no pacote do
cliente; quem impede a deriva é um teste contra as chaves `activity_*`.

**A mono é para os números, e «Desde» não é um número.** A linha do ano e do
efectivo estava toda em Geist Mono e por isso mais larga do que precisava:
medido a 390×844, «Desde 1836 · 150 cavalos» pede 166px e a coluna dá 147, e
**quinze dos vinte e três** cartões com este dado partiam «150 / cavalos» ao
meio — em espanhol, que escreve «caballos», pior. Com os algarismos em mono e
as palavras na Geist pede 132px: zero linhas partidas nas três línguas. E os
dois números passaram a ter **casa fixa**, porque oito das vinte e nove não
declaram ano e nesses o efectivo escorregava para o sítio onde o vizinho tem o
ano. É a razão pela qual o `.preco` tem `tabular-nums`: números que se comparam
têm de aterrar no mesmo sítio.

**A coluna `especialidades` tem linhagens lá dentro**, em quatro das vinte e
nove, e o cartão escrevia-as como se fossem actividades — o da Herdade do
Azinhal dizia «Linhagem Andrade, …» e, duas linhas abaixo, «LINHAGENS ·
Andrade»: o mesmo dado duas vezes no mesmo cartão, com a primeira a gastar o
lugar de uma especialidade que ficava cortada. Não se apaga, muda-se de sítio.
Zero linhagens perdidas, uma ganha — «Xaquiro», que não estava em mais lado
nenhum.

**Vinte e nove numa página.** O `POR_PAGINA` eram 24, herdados do marketplace,
e partiam o directório em 24 + 5 — e não em qualquer vista: só na de partida,
porque qualquer filtro já cabe numa página. O único ecrã com paginação era
aquele em que ninguém pediu para estreitar nada. Passa a 36; a paginação fica,
porque um directório que só funcione enquanto for pequeno é um directório com
prazo. Os 14% e 23% de altura que a passagem anterior custou foram devolvidos e
mais um pouco: **−10,5% e −7,2% por coudelaria**, com 21% mais coudelarias na
página.

**E uma coisa que se mediu e não se mudou: a ordenação.** A `destaque` é a
primeira chave de «Recomendadas» e está a `true` em 20 das 29 — 69%, o mesmo
número que fez o distintivo deixar de se escrever —, e medida contra o que o
cartão mostra não distingue nada (5,55 campos preenchidos contra 5,44). Mas **o
banco de ensaio não pode decidir esta pergunta**: o `ordem_destaque` das vinte
e nove é 0…28 por ordem alfabética e o `views_count` é 120 a descer de três em
três pela mesma ordem — valores fabricados. Uma ordenação medida contra dados
fabricados é uma ordenação inventada. **Antes de decidir contra o banco de
ensaio, olha para os valores e pergunta se alguém os inventou.**

### O cromado do `/mapa`

**O cromado do mapa não se escreve por baixo de quem chegou depois.** A regra
que o motor do globo já cumpre — não perguntar ao código de fora quanto espaço
ocupa, mas perguntar ao browser quem está no caminho — passa a valer também
para as peças flutuantes do próprio mapa. Na primeira visita o aviso de cookies
tapava o gatilho «Explorar Regiões» a **cem por cento** nas duas vistas e
comia-lhe o clique (`elementFromPoint` devolvia o aviso; um `click()` esgotava
o tempo com `aria-expanded` em `false`), e como o aviso é vidro a 68% o que se
via era «Explorar Regiões» a atravessar «Escolher». Apaga-se em vez de se
subir, e a conta é do próprio motor: um estorvo acima de 40% da lona é
descartado como cortina, e a 390×700 o aviso sozinho já ocupa 36% — com o
rodapé por cima passaria a 49,4% e os nomes voltavam a ser escritos por baixo
dos dois.

**A dica do globo era a única peça flutuante com texto sem chão**, e lia-se a
2,88:1 contra os 15,47:1 da fila de estado, que é a mesma coisa no mesmo papel
— a diferença era só o vidro. Ganhou o `.vidro`, e o véu certo com a tinta
errada continuou a não dar: o `.meta` escreve em `#666`, que sobre preto puro
dá 3,66:1 e nunca poderia chegar aos 4,5. Com a tinta secundária para que os
68% foram medidos: **5,98:1**, e custa 8px que não custam um nome.

**O anúncio das texturas vive na `page` e não no `layout`**, e é por isso que a
frase «só nesta página» voltou a ser verdade. O que está no layout entra na
carga de pré-busca de quem tem um link para o `/mapa`, e o `/directorio`
descarregava **569,3 KiB em 6 pedidos** de um globo que não tem — um `<Link>`
pré-busca só até à fronteira de `loading`, e a `page` é dinâmica. Medido dos
dois lados ao mesmo tempo, que é a única maneira de saber o que se trocou: o
directório passa a 0 pedidos e 0 KiB, e a última textura do `/mapa` fica onde
estava (219ms contra 465, dentro do ruído, e os dois braços no regime «com
preload»). Não se pagou nada.

**E o que se escreve não tem de andar ao mesmo passo do que se filtra.** Cada
tecla na caixa de pesquisa refazia os alfinetes do globo: p95 de quadro
**1077ms**, 34 de 110 quadros acima de 32ms. Com `useDeferredValue` a caixa
fica com o valor imediato e o resultado inteiro — globo, lista, painel e
contagem — com o adiado: **306 quadros entregues onde se entregavam 110**, p95
de 1077 para 133ms, e a letra de 36 para 29ms de mediana.

**O nome canónico da pesquisa é `q`**, porque é o que o `/mapa` já escreve e é
o que está nas ligações já partilhadas. Cada página aceita o nome da outra como
sinónimo de entrada e continua a escrever o seu, senão a mesma pesquisa passa a
ter dois endereços. **Isto esteve escrito antes de ser verdade dos dois lados**:
o `comSinonimos` existia só no mapa e `/directorio?q=alter` continuou a devolver
as vinte e nove em silêncio até alguém ir medir. E faltava a outra metade, que é
a que as pessoas usam: os dois links entre as páginas — «Mapa completo» no
directório e «Ver lista» no mapa — eram endereços secos e **deitavam fora o
filtro**, o que fazia do caminho real o único que não beneficiava da correcção. Antes disto, `/mapa?search=alter` devolvia as vinte e nove
**e apagava o parâmetro do endereço**, e `/directorio?q=alter` devolvia as
vinte e nove em silêncio — um link partilhado entre as duas páginas mentia sem
o dizer.

### O cromado do `/mapa` — segunda passagem

**O vidro do mapa é um só, e não é o `.vidro`.** Eram quatro receitas escritas à
mão — pílula, fila de estado, gatilho e painel — com a mesma linha copiada em
quatro sítios. A primeira leitura foi que deviam passar a `.vidro` com o botão
do desfoque, como a `.mapa-dica` já faz; mediu-se antes de o fazer e a medição
diz o contrário. Sobre a chapa clara com que os 68% foram medidos, o `.vidro`
tirava um ponto e meio a **todas** as leituras: o chip inactivo caía de 4,46:1
para 2,75, o nome da região de 11,09 para 6,65. A causa é o `--elevate-1` do
`.chip`, branco a 4%, que assenta por cima do véu e levanta o chão local — os
68% foram medidos para texto **directamente** sobre o véu, e aqui não é esse o
caso. **Um número medido num contexto não é o mesmo número noutro.** Os 82%
ficam; o que estava mesmo em falta eram as duas defesas obrigatórias, que estas
quatro não tinham: medido com `prefers-reduced-transparency: reduce`, três das
quatro continuavam translúcidas e com desfoque. Contra a intuição, tirar o
desfoque quase não mexe no contraste (4,46 → 4,40) — desfocar uma chapa lisa não
muda um pixel; o que o desfoque impede é que a estrutura do que está por baixo se
leia como letras. Quem mexe no contraste é a defesa: com chão opaco o chip vai a
6,72:1.

**Um comando é para comandar o que está no ecrã.** A regra «sai quem deixa de ter
o mapa por baixo» é a certa para a peça encostada ao fundo e quase sempre
verdadeira para a encostada ao topo: basta um pixel de lona. Medido a 390×700,
descendo os 832px do rolo, a lona a 0,49 da janela já perdera metade dos nomes e
a pílula continuava pousada até aos 0,07, sem um único nome legível por baixo,
durante quinhentos pixéis de rolo. Segunda condição, e o número sai da tabela e
não de um gosto: **o cromado sai quando o mapa deixa de ser a maior parte do
ecrã.** No computador nada muda — lá a lona nunca desce dos 0,60.

**E o que apaga o cromado tem de apagar o atalho que aponta para ele.** O
`data-tapada` é `visibility: hidden`, e o browser recusa-se a focar um alvo
invisível: o atalho «Saltar o globo e ir às regiões» deixava o foco no `<body>` e
a tabulação seguinte aterrava no rodapé do site — à letra o defeito que o atalho
existe para evitar. Não era um estado, eram três: o aviso de cookies (toda a
primeira visita), a página rolada até ao fundo, e uma pesquisa sem resultados,
onde o alvo nem existe.

**O globo não se desfaz para se trocar de vista.** Trocar para «Lista» e voltar
era o motor 3D a nascer outra vez: cinco voltas intercaladas entre dois
servidores, soma das tarefas longas por troca, **3799ms → 1379** no computador e
**3283 → 1006** no telemóvel. O palco fica no documento com `hidden`, e é o
`display: none` que faz o `IntersectionObserver` do próprio motor parar o ciclo —
zero rAF em repouso nas três alturas. O que fica de fora do palco escondido é o
cromado, senão há dois `<h1>` e dois `id="mapa-procura"`. E quem chega à lista
não paga um globo: só se monta quando alguém o pede.

**Um distintivo decide-se sobre o conjunto, não sobre o que sobrou do funil.** O
selo «Destaque» calculava a proporção sobre os visíveis, com a justificação
escrita de que «filtrar por uma região onde só uma é destaque faz o distintivo
voltar». Medido: a proporção é 69% no total e **54–100% em cada uma das cinco
regiões** — nenhuma o faz. E o conjunto mudava a cada tecla: a escrever «veiga»,
`vei` acendia um selo e `veig` apagava-o. Enumerados os 4096 subconjuntos de uma
colecção com esta proporção, **40 — um por cento — davam a resposta contrária à
do conjunto todo**, e é a raridade que faz disto um defeito e não uma regra: um
por cento é pouco de mais para se ler como sinal e muito para nunca se ver.
**Antes de escrever «assim o distintivo volta quando distinguir», enumera os
estados que a página pode mesmo alcançar e conta em quantos ele volta.**

**Sem JavaScript o `/mapa` era um vazio com comandos mortos por cima.** A página
renderiza — quem a revela é o `html:not(.js) div[hidden][id^="S:"]` —, e o que
ficava no ecrã era uma caixa de pesquisa que não pesquisa, um interruptor que não
troca, um gatilho que não abre e «Arraste para rodar» para um globo que não
existe, com **zero ligações para uma coudelaria** no documento. As vinte e nove
passam a estar lá dentro de um `<noscript>`, que é o preço certo: zero nós e zero
paragens de tabulação para quem tem JavaScript, contra as 29 que uma lista
`sr-only` custaria a toda a gente.

**E uma afirmação minha que era falsa:** escrevi que a página não rola por cima
da lona. Rola — seis dentes de roda no centro descem os 380px inteiros no
computador, e um arrasto de dedo desce 185–225px no telemóvel. O que estava
partido era a transição do cromado, não o deslocamento.

### A ordem por que se pergunta (`/vender-cavalo`)

São **noventa e oito** campos no catálogo, dos quais **noventa** são exigidos —
oito passaram a opcionais por decisão do dono (ver mais abaixo). A regra de que
o resto é todo obrigatório vem do commit `63b9210` e não se desfaz aqui. O que se decide aqui é
**quando** se pergunta cada uma, e isso mede-se.

**Primeiro o cavalo, depois a factura.** Das nove primeiras perguntas, seis
eram sobre quem paga, e o nome do cavalo era a décima — 946px de rolo a
1400×950 e 1309px a 390×700. Os cinco campos da factura passaram para o passo
4, entre o valor a pagar e a caixa dos termos: 709px e 880px, quatro caixas
antes em vez de oito, e a altura somada dos quatro passos inalterada
(8 506 → 8 419 e 12 436 → 12 425). Mover não é tirar, e a conta por passo
`[27,47,20,1] → [24,46,20,5]` tem a mesma soma de propósito, fixada por um
teste para não encolher em silêncio.

**O documento chega antes das perguntas que ele responde.** A secção da
identificação dizia «está tudo no Livro Azul, que anexa no passo seguinte» —
doze perguntas, mais catorze na ascendência, e só depois o anexo: 1 558px e
2 842px de distância, com uma fronteira de passo pelo meio. Agora são 307px e
344px no mesmo ecrã, e o tecto do `passoSeguro` do rascunho foi com ele.

**Onde a resposta honesta é «não tem», tem de haver maneira de a dar.** A
pontuação morfológica APSL era caixa de texto obrigatória com o exemplo «78.5
pontos», e um cavalo só a tem depois de ir a uma classificação — um poldro
nunca foi, por definição. Quem não tivesse nenhuma inventava um número ou não
publicava. É a mesma armadilha que as vinte e sete perguntas de sim/não
existem para não repetir: obrigatório quer dizer **respondido**, e «não tem» é
uma resposta. Um toque escreve «Não classificado».

**E a terceira geração foi pelo mesmo caminho, por decisão do dono.** São oito
campos — **quatro nomes e quatro registos**, não «oito números de registo», que
foi como aqui esteve escrito — e passaram a poder ficar em branco, porque um
Livro Azul nem sempre imprime os avós e para quem não os tem «obrigatório»
queria dizer não publicar ou inventar. Continuam desenhados e dizem
`(opcional)` no rótulo: num formulário onde noventa perguntas levam asterisco, o
silêncio lê-se como um asterisco esquecido, não como «podes saltar». A conta por
passo passou de `[24, 46, 20, 5]` para `[24, 38, 20, 5]`, e a diferença de oito
está travada por dois testes que se cobrem um ao outro — um exercita por
exclusão, o outro afirma por inclusão.

E obrigou a separar o que estava junto: a secção chamava-se «Avós, linhagem e
coudelaria de origem» e a conta do cabeçalho dizia **«0 / 2» por cima de dez
caixas**, porque só contava as duas que ainda são exigidas. Um número verdadeiro
no sítio errado lê-se como um número errado. São duas secções, pela mesma regra
que este formulário já tinha aplicado à facturação: um cabeçalho que precisa de
um «e» para caber duas coisas está a dizer que ali estão duas secções. E **uma
secção que não exige nada não escreve conta nenhuma** — escrevia «0 / 0», que é
pior do que o silêncio; quem lhe conta a história é a nota do cabeçalho.

**No passo que cobra, a tecla Enter não paga.** O `onSubmit` do formulário é
um só e no passo 4 chama o checkout; medido, uma tecla Enter com a caixa dos
termos em foco disparava um `POST /api/vender-cavalo/upload` sem ninguém ter
carregado em nada. Era um risco de gabinete enquanto aquele passo era só a
caixa; com os campos da factura lá dentro passa a ser o hábito de toda a gente
— escrever o NIF e carregar em Enter. A regra tem de ser sobre **o foco** e
não sobre o `submitter` do `SubmitEvent`: numa submissão implícita o browser
activa o botão por omissão do formulário, que _é_ o botão de pagar, e o
`submitter` não distingue os dois casos. Vive em
`components/vender-cavalo/tecla-enter.ts`, é uma função pura e tem testes,
porque o que ela impede é uma cobrança que ninguém pediu. Nos passos 1 a 3
nada muda: Enter continua a avançar.

As notas dos cabeçalhos de secção deste formulário usam `.vc-nota` e não
`.meta`: são instruções e não legendas, e a `.meta` mede 3,45–3,66:1 nestas
superfícies contra os 7,89–8,37:1 do `--foreground-secondary`, que é o token
com que os `<label>` já estão escritos.

### O rodapé

**Três faixas, e cada uma responde a uma pergunta.** Era uma grelha de quatro
listas e mais nada: quem chegasse ao fim da página encontrava dezanove ligações
sem uma linha a dizer onde tinha chegado. As faixas respondem, por ordem, ao
que se pergunta nesse sítio — **o que é isto**, **por onde começo**, **onde
está o resto**.

A frase da esquerda não repete a barra de navegação, e é essa a razão de a
marca ter voltado depois de o letreiro grande ter saído: a barra diz o **nome**
do site em todas as páginas e nunca diz o que ele **é**. Não é o mesmo elemento
a voltar; é a legenda que faltava, com o nome do tamanho de uma assinatura. A
faixa do meio absorveu o convite a publicar anúncio que ocupava uma linha
inteira — o mesmo destino, agora ao lado do outro sítio por onde se começa.

**Os cabeçalhos das colunas mentiam.** As quatro listas estão comentadas no
código, uma a uma, como «Comprar», «Vender», «Descobrir» e «Portal» — e
escreviam-se no ecrã como «Navegação», «Lusitano», «Ferramentas» e «Portal». Só
a última coincidia. «Lusitano» por cima de _Vender cavalo · Os meus anúncios ·
As minhas mensagens_ não é um cabeçalho vago: é um cabeçalho **falso**, e num
índice o cabeçalho é a única coisa que evita ler a coluna toda. As três chaves
antigas não eram lidas por mais ninguém e saíram do dicionário.

**E a tinta.** As dez ligações do índice, as cinco da linha legal, as três das
redes, o aviso de direitos e os cinco cabeçalhos — **vinte e quatro elementos**
— escreviam-se com `--foreground-muted` (`#666`), que sobre o preto puro do
fundo dá **3,66:1**, num rodapé que aparece em todas as páginas do site. Uma
ligação não é uma legenda: é o próprio destino. Passam para
`--foreground-secondary`, **8,37:1**, que é a decisão que este ficheiro já
tinha tomado para a `.fc-nota` e para a `.vc-nota`.

**E um número meu que era de cor, escrito aqui para não voltar.** A mensagem de
commit desta alteração diz «33 textos a passar dos 4,5:1» e esse número não sai
de medição nenhuma — contei-o de memória e nem sequer bate certo com o
ficheiro, que tem **dez** ligações de índice e não onze. O que se mediu no
browser foi tirado já **a meio** da correcção, com as ligações do índice
mudadas e os cabeçalhos ainda por mudar: 9 de 37 abaixo do mínimo por vista,
dos quais 4 eram os separadores `·`. Ou seja: os cabeçalhos custavam 5 por
vista, e no fim ficam **0 reais** nas duas. Não há um «antes» completo medido
no browser, e não se inventa um — o que se afirma é o que se contou no
ficheiro (24 elementos) e o que se mediu no fim (0).

Os cabeçalhos ficam com a **caixa** da `.rotulo` — 11px, versaletes, o mesmo
`tracking` — e trocam a **tinta**, porque um cabeçalho é texto como outro
qualquer por muito que o papel dele seja de legenda. A classe `.rotulo` não se
mexe: é de todo o site, e trocá-la na origem merece a sua própria medição,
noutro sítio que não um rodapé.

Medido na página inicial, cookies aceites, 457px de altura no computador e
1074px no telemóvel, zero elementos a passar da borda. Os quatro textos que a
sonda ainda conta são os separadores `·`, que são `aria-hidden` e decorativos;
e o único alvo de toque abaixo dos 44px é o email dentro da frase de contacto,
que é uma âncora em linha no meio de um parágrafo — a excepção que a própria
regra dos alvos prevê.

**E o rodapé não entra em todas as páginas.** As páginas de entrada já corriam
sem ele; agora o `/mapa` também. Quem decide é `lib/rotas-sem-rodape`, com
testes, e a razão está na secção do mapa.

### O `/mapa` é só o mapa

O palco do globo é `100dvh` — a página **é** o mapa. O que estava por baixo era
o rodapé e mais nada: 380px por rolar a 1400×950 e 720px a 390×700, tudo ele.
A única coisa que aquela página oferecia a quem rolasse era o índice do site,
debaixo de um mapa que ocupa o ecrã inteiro.

E o ganho a mais não estava à vista. O `GloboTerra` cede a roda à página
enquanto a lona cobrir o ecrã **e ainda houver documento para descer** —
`prende = cobreOEcra && scrollHeight - innerHeight > 24`. Essa cedência existe
para quem chega e rola para ler o que está por baixo, e está certa. Sem nada
por baixo, a condição é **falsa por construção**: a roda passa a ser do globo
ao primeiro dente, o `touch-action` volta ao `touch-none` por omissão e o dedo
arrasta o planeta. Não se mexeu numa linha do motor — quem já decidia isto era
ele, a partir da altura do documento.

Medido, `next build` + `next start`, nas duas vistas e nos dois estados da
barra de cookies: documento igual à janela (950/950 e 700/700), **0px por
rolar**, e três dentes de roda **sem ninguém pegar no globo** a mudarem o
alcance dos alfinetes de 776 para 1110 a aproximar e para 524 a afastar no
computador. O `CLAUDE.md` regista que antes disto seis dentes num computador
não mexiam nada.

**E uma lição de método sobre a métrica.** A primeira medição do telemóvel usou
o espalhamento dos **nomes** e deu 87 → 45 a aproximar, o que se lia como o
sinal trocado. Não era: um nome que sai pela borda deixa de contar, e a métrica
encolhe com a caixa em vez de com o mundo. Medido no alcance dos **alfinetes**,
que não desaparecem, o sinal está certo nas duas vistas. Uma métrica que a
própria mudança pode apagar não mede a mudança.

**E a frase dos cookies deixou de apontar para o rodapé.** Dizia «pode mudar de
ideias a qualquer momento **no rodapé**», o que era verdade em todas as páginas
até esta perder o dele — e é justamente aqui que muita gente vê o aviso pela
primeira vez, porque o `/mapa` é uma página de entrada. Mandar alguém a um
sítio que não existe naquele ecrã é pior do que não dizer onde é: quem procura
o rodapé e não o encontra fica a achar que a definição não existe. A frase
passa a nomear **o que** se procura — as definições de cookies — em vez de
**onde**, o que é verdade em todas as páginas e continua a dizer que a porta
existe. A porta não se perdeu: está no rodapé de todas as páginas que o têm. Um
teste liga as duas pontas, para não se separarem outra vez.

### O chat, e as fotografias de perfil

A página inicial promete: «Fale com o vendedor sem publicar o seu número. O
contacto só é partilhado se quiser.» O chat existia e cumpria a segunda metade;
o que não cumpria era a primeira — **parecia um formulário com histórico**. Uma
mensagem enviada por uma pessoa só aparecia do outro lado se essa pessoa
recarregasse a página.

**Ter conta é obrigatório, e não é a interface a exigi-lo**: o
`comprador_id UUID NOT NULL REFERENCES auth.users(id)` da própria tabela. O que
estava mal era **como** se encontrava essa parede — quem não tinha sessão abria
a caixa no anúncio, escrevia a mensagem toda, carregava em enviar e só então
era atirado para o login, perdendo o que tinha escrito. Diz-se antes, e o
rascunho sobrevive à ida e volta (`sessionStorage`, pelas razões que o
`components/chat/rascunhos.ts` já escreve). Havia um segundo defeito no mesmo
caminho: a ligação escrevia `?redirect=` e a página de login lê `returnUrl` —
quem chegasse a entrar aterrava na página inicial.

**O tempo real não se escolheu por gosto, escolheu-se por uma constante que já
cá estava.** O `middleware.ts` permite 60 pedidos/minuto por IP em `/api/*`.
Uma sondagem de período `T` dá uma espera mediana de `T/2`, logo dois segundos
de mediana exigem `T = 4s` — **15 pedidos/minuto por separador aberto**, só
para o distintivo. Dois separadores e um fio aberto gastam metade do orçamento,
e uma casa atrás de um IP apanha 429 a navegar. O `T = 60s` que lá estava
significava **trinta segundos de mediana**, que é a queixa do dono dita por
outras palavras. Medido do nosso lado: dez minutos de página parada passam de
dez pedidos a **zero**, o separador escondido larga a ligação, e uma rajada de
cinco mensagens é **uma** reconciliação.

**Três estados de entrega, e só os três que a base sabe provar** — `enviada`
(a linha existe), `entregue` (o servidor **disse ao destinatário** que ela
existe), `lida`. Não há um quarto: «a escrever…» não vive numa tabela.

**E o encontro das duas metades trouxe o defeito mais instrutivo.** A interface
declarava quatro estados e derivava-os de `m.lida`, escrevendo «Entregue» a
**tudo o que não estivesse lido** — ou seja, afirmava entrega a partir da
ausência de leitura, que não é a mesma coisa e que a base nunca soube. Uma
mensagem para alguém que fechou o portátil aparecia como entregue.

**A fotografia de perfil, e a coluna que existia sem nunca ter sido escrita.**
O `user_profiles.avatar_url` está lá desde a migração `004` e nada no site lhe
tocava. Ponta a ponta: **1 765 894 → 17 948 bytes** (98×) e **322 bytes de EXIF
→ 0**. O EXIF não é detalhe: uma fotografia de telemóvel traz GPS, e num
retrato que **sai de uma pessoa e chega a outra** isso é publicar a morada de
casa. O caminho do ficheiro **não é o UUID de ninguém** — esse endereço viaja
numa resposta de API até à outra pessoa, e a vista pública deixou de devolver o
`id` precisamente para isso. E o cliente não pode escrever o `avatar_url` à
mão: só o nome. Caso contrário apontava-se o avatar para qualquer endereço da
internet, servido a partir da caixa de entrada de outra pessoa como se fosse
dela.

**Quem não tem fotografia não ganha um rectângulo cinzento**, pela regra que a
ficha de coudelaria já escreve. São iniciais, e sem cores geradas por hash —
este site tem **um** acento e não uma paleta. Um rótulo não é um nome: «Comprador
interessado» não dá «CI», porque duas maiúsculas num disco leem-se como o
logótipo de uma empresa e porque as quatro conversas com esse rótulo levariam
todas **o mesmo carimbo**, que é a única coisa que um retrato nunca pode fazer.
Esses levam um ícone de pessoa.

**E um retrato que não carrega volta a ser iniciais.** Sem isso, um `src` que
falha deixava a caixa **vazia** — um disco do tamanho de uma cara, sem nada lá
dentro — porque o ramo das iniciais só corre quando não há `src`. As causas em
produção não são raras: um ficheiro apagado, o balde fora do ar, um endereço
fora do `remotePatterns` (esse devolve **400**, não uma imagem), ou estar sem
rede a meio do carregamento. Guarda-se **qual** o endereço que falhou e não um
sim/não: assim quem troca a fotografia tem a nova tentada de graça, porque a
comparação deixa de bater — e não é preciso um efeito a repor estado, que seria
uma renderização em cascata a pagar por uma coisa que a comparação já diz.

**Um conselho que não pode resolver o problema gasta a única acção que a pessoa
tinha.** O cliente juntava o 401 e o 403 e os dois escreviam «A sessão expirou.
Volte a entrar.» Para o 401 é o conselho certo; para o 403 é um beco, porque o
403 é a resposta a quem **está autenticado** e mesmo assim foi recusado — sair e
voltar a entrar dá a mesma recusa, e quem seguir o conselho perde a sessão que
tinha para voltar ao mesmo sítio.

**O número que se promete tem de ser o que se guarda.** O navegador recorta e
envia 512; o servidor guarda 256. As duas escolhas têm razão escrita e nenhuma
está errada por si — mas o ecrã dizia a quem envia «guarda-se um quadrado de
512 pixéis», nas três línguas, e isso é uma promessa sobre a fotografia de
outra pessoa que ninguém pode verificar sem ir ao balde.

**E os 256 mediram-se, e ficam.** A pergunta era se 256 fica curto, e a
resposta é um degrau limpo: o erro por subpixel contra o melhor que aquele ecrã
podia mostrar é **~3/255 quando o lado guardado chega aos pontos do
dispositivo** e **~8/255 quando fica abaixo**. Medido sobre a mesma fotografia,
com o recorte feito **uma vez** — 112px a 3× pede 336 pontos:

|            | 256²   | 320²   | 384²   | 512²   |
| ---------- | ------ | ------ | ------ | ------ |
| 112px a 2× | 3,94   | 3,35   | 2,96   | 2,77   |
| 112px a 3× | 8,11   | 8,11   | 3,39   | 2,85   |
| bytes      | 17 394 | 24 512 | 35 952 | 56 006 |

O que decide não é a tabela, é **onde o retrato aparece**: o `xl` de 112px
existe num sítio só — a pré-visualização da própria fotografia dentro do
editor. Tudo o que o resto do site desenha é 28, 44 e 64, que a 3× pedem 84,
132 e 192 pontos — todos dentro dos 256 com folga. Dobrar os bytes de **todos**
os retratos do site para afiar a pré-visualização da minha própria fotografia,
num ecrã, é a troca errada. Fica escrito o degrau para quem um dia puser um
avatar de 112px numa página pública: aí a conta muda, e 384 é o primeiro
tamanho que a serve.

**E a primeira medição desta tabela saiu não monótona** — 384² pior do que 256²
a 2× —, o que é impossível para perda de reamostragem. A causa era o
`position: "attention"` do `sharp`: o recorte depende do tamanho de saída, e
portanto cada coluna comparava uma **fotografia diferente**, não uma resolução
diferente. Recorta-se uma vez e só depois se varia a resolução. Um resultado
não monótono onde a física exige monotonia é o aparelho a falar, não o mundo.

### Densidade

É um classificados: o que conta é caberem anúncios no ecrã. Grelhas de 2 a 5
colunas, cartões compactos, preço primeiro (`.preco` tem `tabular-nums` para
os dígitos alinharem entre cartões, que é o que permite comparar de relance).

## Regras de trabalho

- Verificar com `npx tsc --noEmit`, `npx eslint`, `npx vitest run` e
  `npx next build` antes de commitar.
- O `next build` local precisa de segredos de exemplo (Supabase, Resend,
  Stripe, `CRON_SECRET`); sem eles falha a recolher dados das páginas. **E
  precisa de uma base que responda mesmo** — não chega a URL de exemplo: o
  `generateStaticParams` das fichas de coudelaria rebenta a construção quando
  não consegue perguntar, de propósito (ver `app/directorio/[slug]/page.tsx`),
  porque com `dynamicParams = false` uma lista vazia publica as vinte e nove
  fichas a 404 sem um aviso. Localmente aponta-se o
  `NEXT_PUBLIC_SUPABASE_URL` ao PostgREST de mentira antes de construir. Uma
  construção que falha aqui está a fazer o que lhe foi pedido.
- Para ver o site a sério: `next build` + `next start` e Playwright com
  `executablePath: "/opt/pw-browsers/chromium"` (o binário que o projecto pede
  não está instalado neste ambiente).
- **Um banco de ensaio é uma afirmação sobre o produto, e verifica-se como
  qualquer outra.** Nesta casa mede-se contra um PostgREST de mentira, porque
  não há acesso à base verdadeira. O stub que se montou para medir o mapa
  servia **doze das vinte e oito colunas** da tabela das coudelarias — para o
  globo só interessam o nome, as coordenadas e a localidade —, e passou de mão
  em mão como se fosse «as vinte e nove verdadeiras». Quem o herdou para medir
  o directório concluiu, com números, que `especialidades`, `linhagens` e
  `ano_fundacao` estavam vazias nas vinte e nove, escreveu-o no código e na
  mensagem de commit, e desenhou a partir daí. Estão preenchidas 29, 29 e 21.
  Remedido sobre os dados verdadeiros, a correcção que valia «17 de 26
  procuras devolvem mais» valia **2 de 16**. Antes de escrever «isto está
  vazio», «isto nunca aparece» ou «esta coluna não tem dados», confirma que a
  coluna existe no esquema **e** que o que o stub serve a traz. O ficheiro de
  ensaio bom fica em `scratchpad/coudelarias-ensaio.json`, e diz de si próprio
  o que é verificado e o que é um substituto.
- **Uma optimização pode não criar um defeito e ainda assim ser responsável por
  ele.** Ver o que o pré-carregamento das texturas fez à entrada do globo, na
  secção do `<GloboTerra>`: o defeito era o mesmo desde sempre e o que mudou
  foi a probabilidade de o encontrar. Quando uma alteração muda tempos, vale a
  pena perguntar que corridas passam a ganhar-se e a perder-se por causa dela.
- **Um banco que responde `200 []` é pior do que um que rebenta.** O stub que
  serve o globo só sabe responder a `/rest/v1/coudelarias`; às três tabelas do
  chat respondia `200 []`, e não tinha autenticação nenhuma, por isso a página
  do chat fazia `redirect("/login")`. Contra ele, qualquer número sobre a caixa
  de entrada saía de uma caixa vazia — e **parecia** que funcionava: as
  etiquetas apareciam, o carregamento acabava. O banco do chat está em
  `scratchpad/chat-ensaio/` e fala PostgREST **e** GoTrue; o do perfil, em
  `scratchpad/perfil-ensaio/`. Os dois dizem de si próprios o que é verificado
  e o que é substituto, e o que garantem **não é fidelidade aos dados** — é
  cobertura da gama, com os extremos e o meio em cada eixo.
- **E a guarda de um banco tem de cobrir a gramática, não só o vocabulário.**
  O `chat-ensaio` já atirava quando lhe chegava um operador PostgREST
  desconhecido, em vez de devolver `[]`. Mas repartia o `or=(…)` com um `split`
  por vírgulas, e a paginação por cursor usa dois níveis —
  `or=(created_at.lt."X",and(created_at.eq."X",id.lt.Y))`. O `split` partia
  aquilo em três, sendo o terceiro `id.lt.Y)`; numa disjunção, um pedaço a mais
  que calhe ser verdadeiro deixa passar a linha da fronteira. Percorrer um fio
  de 400 mensagens devolvia **413 linhas para 400 distintas**, sem um erro em
  lado nenhum. A guarda estava no sítio errado: o operador desconhecido dava
  erro, a gramática mal repartida dava uma **resposta plausível**.
- **Duas metades bem feitas podem não se encontrar, e o compilador não o diz.**
  O chat e o perfil foram construídos em paralelo, e em cada caso as duas
  metades escolheram nomes diferentes para a mesma coisa: `estado` obrigatório
  de um lado e ausente do outro; `fotografia` contra `avatar` em **quatro**
  sítios — o campo do perfil, o caminho da rota, a chave do `FormData` e a
  chave na conversa. No segundo caso o `tsc` ficou verde e os testes todos
  passaram, porque cada uma daquelas leituras é defensiva **de propósito**: a
  chave é opcional, um 404 é silêncio, e o ecrã sabe desenhar a ausência. O
  produto teria desenhado iniciais para sempre, em toda a gente, sem um erro.
  Um tipo partilhado não teria chegado: o que não coincide é o **nome escrito
  na ligação**, e um caminho de rota e uma chave de `FormData` são texto, que
  nenhum compilador verifica. Por isso o `__tests__/lib/perfil-costura.test.ts`
  **lê os ficheiros** — e verificou-se ao contrário, repondo o desencontro, que
  fica vermelho.
- **A RLS decide que linhas, não que colunas.** A `user_profiles` tinha RLS
  ligada com `auth.uid() = id` nas três políticas — que parece responder à
  pergunta certa — e o `GRANT` era sobre a tabela inteira. Nessa linha vivem o
  `tools_subscription_status` e o `stripe_customer_id`. Reproduzido contra
  PostgreSQL local, com a chave anónima e a própria sessão: `UPDATE 1`, e a
  conta ficava em `active` com um `stripe_customer_id` forjado. É uma
  subscrição paga oferecida a si mesmo. Quem corrige é o `GRANT`, que sabe
  falar de colunas. **A forma do erro é o que importa reter: as três políticas
  estavam certas e bem escritas, e é isso que faz este defeito sobreviver a uma
  revisão — ninguém olha duas vezes para uma tabela que tem RLS.**
- **Uma prova verifica-se ao contrário.** Antes de aceitar «a RLS está
  provada», estragou-se a política de propósito: com `USING (true)`, três das
  seis provas ficam vermelhas; reposta, verdes. Uma migração que se aplica
  **duas vezes** no mesmo teste é a idempotência a ser testada em vez de
  alegada.
- **Um servidor de ensaio que sobrevive a uma construção nova serve o que já
  não existe.** `next start` continua de pé enquanto o `.next` é substituído
  por baixo dele, e o sintoma é um `ChunkLoadError` com MIME `text/plain` —
  ou seja, **o JavaScript do cliente não corre**, e tudo o que dependa dele
  parece partido. Duas medições desta sessão foram gastas a perseguir defeitos
  que eram isto. Matar a porta e voltar a arrancar **antes** de acreditar em
  qualquer leitura.
- **Uma métrica que a própria mudança pode apagar não mede a mudança.** O
  espalhamento dos nomes do globo encolhe quando um nome sai pela borda, o que
  fez uma aproximação parecer um afastamento. Mediu-se no alcance dos
  alfinetes, que não desaparecem.
- **Duas medições que concordam perfeitamente não estão por isso certas.** Um
  A/B de bytes deu «+197 KB em todas as páginas», estável entre voltas — e era
  o mesmo build medido duas vezes, com assinatura exacta: rotas com diferença
  zero **ao byte**. Zero de variância prova que o aparelho é determinista, não
  que está a medir duas coisas diferentes. O que apanhou o erro foi um número
  sem sentido físico: uma mudança de 770 KB numa página que ninguém tinha
  tocado.
- **Uma sonda tem de saltar o que está inerte e o que está escondido.** Duas
  leituras desta sessão foram falsos positivos: «6 textos abaixo de 4,5:1» eram
  as pastilhas de não lidas, que são **preto sobre pastilha branca — 21:1**, o
  máximo possível, e a sonda assumia fundo preto para tudo; «2 elementos a
  passar da janela» eram o nível parqueado da `.pilha`, `inert` e `aria-hidden`,
  deslocado uma largura inteira de propósito, numa página que não rola na
  horizontal. Verificar cada linha antes de a escrever como taxa.
- Migrações em `supabase/migrations/` têm de ser idempotentes e validadas
  contra um PostgreSQL local antes de irem para o repositório.
