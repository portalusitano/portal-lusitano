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
     encolherem a caixa —, em telemóvel oito. Os que sobram juntam-se
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
Custava **10 das 29 fichas com o contacto fora do ecrã em mais de metade do
percurso de leitura**; corrigido, o contacto está no ecrã em 82,6% do percurso
contra 58,9%. Quem corrige é `overflow-x: clip`, que é **mais** restritivo do
que o `hidden` — nem por programa deixa deslocar — e não cria contentor. Está
aplicado por página (`body:has(.fc-ficha)`) e não na origem, porque a regra é
de todo o site e a troca lá merece a sua própria medição. **A lição vale para
além do `sticky`: uma propriedade escrita não é uma propriedade a funcionar** —
o `getComputedStyle` dizia `position: sticky` e `top: 112px` nos dois casos.

**O que aparece em todas as fichas não convida: é papel de parede.** Saíram
três coisas que estavam em 29 de 29 — a caixa a tracejado «Ainda não há
avaliações» (140px de secção para escrever uma ausência, agora 58px, e quem
manda é `total === 0`, logo à primeira avaliação volta inteira), as coordenadas
em cru sob o mapa (12px a 3,45:1, e para ninguém — quem quer lá chegar tem o
«Como chegar», e o número continua a alimentar o mapa), e os 87 links de rodapé
que a barra fixa do telemóvel tapava sem rolo que lá chegasse, porque o rodapé
é irmão da ficha e não filho, e o `pb-28` do contentor não o alcança.

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
ter dois endereços. Antes disto, `/mapa?search=alter` devolvia as vinte e nove
**e apagava o parâmetro do endereço**, e `/directorio?q=alter` devolvia as
vinte e nove em silêncio — um link partilhado entre as duas páginas mentia sem
o dizer.

### A ordem por que se pergunta (`/vender-cavalo`)

São noventa e seis respostas e todas são obrigatórias — é uma decisão do dono,
escrita no commit `63b9210`, e não se desfaz aqui. O que se decide aqui é
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
uma resposta. Um toque escreve «Não classificado». **Os oito números de
registo de avós são o mesmo caso e continuam por resolver** — um Livro Azul
nem sempre os imprime.

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
- Migrações em `supabase/migrations/` têm de ser idempotentes e validadas
  contra um PostgreSQL local antes de irem para o repositório.
