# Verificação documental: o que se pode confirmar fora de nós

Investigação sobre a única pergunta que o nosso leitor de documentos ainda não
sabe responder — **«este cavalo está mesmo inscrito no Livro Genealógico?»** —
e sobre as quatro coisas que a tornariam respondível: uma consulta pública ao
stud-book, a lista oficial dos códigos de base de dados do UELN, a base
nacional de equídeos, e o vocabulário impresso no passaporte da UE.

Data da recolha: 4 de Setembro de 2026.

---

## A resposta curta

**A APSL é consultável.** Tem uma consulta pública ao stud-book, gratuita, sem
registo prévio, que pesquisa por **nome, número de registo (NIN), microchip e
UELN**. Não é uma API: é um formulário de página, feito para uma pessoa.

**E é a única que interessa consultar**, porque o Livro Genealógico do Puro
Sangue Lusitano é **um só em todo o mundo** e pertence ao Estado português. As
associações estrangeiras — Brasil, Espanha, França e mais dezasseis — não têm
livro próprio: intermedeiam a inscrição no livro da APSL. Cerca de metade dos
cavalos da raça nasce fora de Portugal e está na mesma base.

**Como o sei:** por pesquisa, e não por ter aberto a página. Ver a secção
seguinte, que é a mais importante deste documento.

---

## 1. Como esta investigação foi feita, e o que a limita

**Não abri uma única página.** A rede de saída deste ambiente está fechada por
política da organização, e não há maneira honesta de contornar isso. Todos os
pedidos, sem excepção, falharam antes de chegar ao destino:

| Endereço                                                                           | Ferramenta        | Resultado                                       |
| ---------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------- |
| `https://www.cavalo-lusitano.com/`                                                 | `curl`            | `curl (56) CONNECT tunnel failed, response 403` |
| `https://cavalo-lusitano.com/`                                                     | `curl`            | idem                                            |
| `https://www.cavalo-lusitano.com/robots.txt`                                       | `curl`            | idem                                            |
| `https://www.apsl.pt/`, `https://apsl.pt/`                                         | `curl`            | idem                                            |
| `https://www.ueln.net/ueln-code-database/`                                         | `curl`            | idem                                            |
| `https://eur-lex.europa.eu/…CELEX:32021R0963`                                      | `curl`            | idem                                            |
| `https://en.wikipedia.org/`, `https://example.com/`, `https://www.google.com/`     | `curl`            | idem                                            |
| `www.cavalo-lusitano.com`, `www.ueln.net`, `eur-lex.europa.eu`, `en.wikipedia.org` | leitor de páginas | `EGRESS_BLOCKED`                                |

O registo do proxy classifica todos como `connect_rejected` — «the egress proxy
denied the CONNECT (organization policy) or could not reach the destination».
Nenhum destes é um 403 do servidor de destino: **é o nosso lado que recusa
sair**, e o servidor da APSL nunca chegou a ser contactado. Não se conclui daqui
nada sobre a disponibilidade deles. Verificou-se também que não é selectivo:
`example.com` está bloqueado tal como os outros.

O que restou foi a pesquisa web, que devolve títulos, endereços e um resumo
escrito a partir do conteúdo indexado. Isso obriga a uma escala honesta, e a
escala pedida — _confirmado (vi a fonte)_ — não tem, a rigor, nenhuma entrada:

- **Confirmado** — o facto aparece em pesquisas independentes e está ancorado
  num endereço oficial que existe no índice (título de página, PDF do próprio
  organismo). **Continuo a não ter aberto a página.** É o mais forte que este
  ambiente permite, e não é a mesma coisa que ter visto.
- **Provável** — uma fonte afirma-o, sem corroboração independente, ou vem de
  um resumo cuja formulação não posso comparar com o original.
- **Não consegui saber** — está por responder.

Onde o resumo da pesquisa começou a produzir listas de dados estruturados —
códigos e nomes de organismos — parei de as usar. A secção 4 explica porquê,
com o exemplo concreto que me fez parar.

---

## 2. A APSL e a consulta pública ao stud-book

### Existe, é gratuita e não pede registo — confirmado

Há uma página dedicada, nas duas línguas:

- <https://www.cavalo-lusitano.com/pt/stud-book/acesso-publico-ao-stud-book>
- <https://www.cavalo-lusitano.com/en/stud-book/public-access-to-the-stud-book>

O Estado descreve o mesmo serviço no portal gov.pt, em ficha própria —
**Consultar o stud-book da raça lusitana** —
<https://www2.gov.pt/servicos/consultar-o-stud-book-da-raca-lusitana>, que diz:
acessível a qualquer cidadão ou empresa pela internet, **gratuito**, disponível
a qualquer hora, e abrangendo todos os equinos inscritos no Livro Genealógico
com filiação confirmada em laboratório.

Existe também um **Acesso Privado ao Stud-book**
(<https://www.cavalo-lusitano.com/pt/stud-book/acesso-privado-ao-stud-book>),
separado, para criadores. A existência de dois acessos distintos é o que
sustenta que o público não exige credenciais.

### Por que campos pesquisa, e o que devolve — confirmado

Descrito em detalhe pela associação norte-americana, na página _Searching the
APSL Studbook_ (<https://uslusitano.org/searching-the-apsl-studbook/>), e
repetido de forma coincidente em várias pesquisas independentes:

**Pesquisa por:** nome do cavalo · **NIN** (número de identificação nacional,
que é o nosso `numero_registo`) · **microchip** · **UELN**. Além disso, listagem
por parâmetros: nota de classificação, estatuto de reprodutor de Mérito /
Recomendado / Funcional, idade, sexo e pelagem.

**Devolve:** criador · proprietário actual · data de nascimento · pelagem · NIN
· número de inscrição no Livro de Nascimentos (LN / LG N) e, se o cavalo foi
aprovado à reprodução, o número do Livro de Adultos (LA / LG A) com a
discriminação completa das notas · e a descendência.

Isto é **exactamente** a resposta à pergunta que nos falta, e devolve-a por
três dos quatro identificadores que o nosso leitor já extrai do documento.

### Endereço exacto do motor, parâmetros e formato — não consegui saber

As páginas acima são a porta; o motor de pesquisa em si (o endereço que recebe
o formulário, os nomes dos parâmetros, o formato da resposta) só se conhece
abrindo-as. Não os invento. Quem tiver um browser sem bloqueio obtém-nos em
dois minutos, e é o primeiro passo do plano da secção 8.

### Termos de utilização e robots.txt — não consegui saber, e é decisivo

- `https://www.cavalo-lusitano.com/robots.txt` → bloqueado à saída (acima).
- A **Política de Privacidade**
  (<https://www.cavalo-lusitano.com/pt/politica-de-privacidade>) existe e é do
  responsável pelo sítio — APSL, Centro Empresarial de Évora, com delegação na
  Av. Mem Ramires, 94, 2765-337 São João do Estoril. Não a li. É uma política
  de dados pessoais; **não é** um termo de utilização que autorize ou proíba
  consulta automática, e não encontrei nenhum documento que o faça.

**Consequência prática, e é uma decisão que não é minha:** não escrevi uma
única linha de código que consulte a APSL. Uma consulta ser pública e gratuita
para uma pessoa não é o mesmo que ser autorizada a um programa que a interroga
em nome de terceiros. Enquanto não se lerem o `robots.txt` e os termos — ou,
melhor, enquanto não houver uma palavra escrita da APSL —, um cliente
automático é uma decisão do dono do sítio, não um detalhe de implementação.

---

## 3. As congéneres, e a razão pela qual quase não importam

### Um livro só, no mundo inteiro — confirmado

O Livro Genealógico do Puro Sangue Lusitano **pertence ao Estado Português**,
através do Ministério da Agricultura, que atribuiu a gestão à APSL em 1989. É
**único** e funciona a partir de Portugal para todo o mundo
(<https://www.cavalo-lusitano.com/pt/apsl>).

As associações estrangeiras existem para **mediar processos** — apoiar os
criadores locais, acompanhar as inscrições, receber as delegações que julgam
concursos e admissões. Não mantêm um livro paralelo. A APSL lista-as em
<https://www.cavalo-lusitano.com/pt/apsl/associacoes-estrangeiras>: África do
Sul/Namíbia, Alemanha, Austrália, Bélgica, Brasil, Colômbia, Dinamarca, EUA,
Espanha, Equador, Finlândia, França, Grã-Bretanha, Holanda, Itália, México,
Noruega, República Checa, Suécia e Suíça. **Cerca de 50% da população da raça
está fora de Portugal** — e na mesma base.

**O que isto quer dizer para nós:** um Lusitano nascido no Brasil, em Espanha
ou em França **está no stud-book da APSL**. Não precisamos de integrar cinco
associações; precisamos de uma.

### Brasil — ABPSL — provável

A Associação Brasileira de Criadores do Cavalo Puro Sangue Lusitano
(<https://www.abpsl.com.br/>, também em `associacaolusitano.com.br`) mantém o
Serviço de Stud Book Brasileiro do PSL (SBBPSL), registado no Ministério da
Agricultura sob o número BR/54, com registo definitivo emitido após confirmação
de filiação por ADN. Há um acordo de reciprocidade com a APSL **desde 1991**,
que faz com que os cavalos inscritos no livro brasileiro fiquem igualmente
inscritos no livro português. O sítio tem uma secção «Consulta»; não consegui
saber se pesquisa animais ou se é outra coisa.

### Espanha — AEPSL — provável

Asociación Española de Criadores de Caballos de Pura Sangre Lusitano
(<https://aepsl.eu/>), criada em 2003, cerca de 100 criadores e mais de 1000
éguas inscritas. Publica no seu próprio sítio o **regulamento do livro
genealógico da APSL**
(<https://aepsl.eu/wp-content/uploads/2025/05/REGLAMENTO-APSL.pdf>), o que é a
confirmação mais limpa de que o livro é o mesmo. Não encontrei consulta pública
de animais. Nota para evitar confusão: a **ANCCE**
(<https://www.lgancce.com/>) é o livro do **Pura Raza Española**, que é outra
raça.

### França — provável, e com uma nota útil

Há associação francesa do Lusitano na lista da APSL, sem livro próprio. Mas
França tem coisa diferente e relevante: o **SIRE**, a base nacional de equídeos
do IFCE, com consulta pública de cavalos e um código UELN próprio — ver a
secção seguinte. É o exemplo do que uma base nacional aberta pode ser.

---

## 4. Os códigos de base de dados do UELN

Esta é a pergunta a que **não trago resposta utilizável**, e é preciso dizê-lo
sem rodeios.

### O que está confirmado sobre a estrutura

O UELN são 15 caracteres em três blocos (`620 015 004471234`): os três
primeiros são o país da base de dados que registou o animal, os três seguintes
identificam **a base de dados / organização**, e os nove últimos são o número
nacional atribuído por essa organização. É o que dizem o
[FEI](https://inside.fei.org/fei/your-role/veterinarians/passports/ueln), a
[WBFSH](https://wbfsh.com/ueln) e o próprio
[ueln.net](https://www.ueln.net/ueln-presentation/). O Regulamento 2021/963
manda que os meios de identificação electrónica tragam um código de país de
três algarismos compatível com a ISO 3166. **Confirmado**, e é o que o
`passaporte-ueln.ts` já diz.

### Onde a lista está publicada — confirmado

- **A base de códigos UELN**: <https://www.ueln.net/ueln-code-database/> — a
  ferramenta de consulta de organizações e códigos, com **mais de 500
  organizações** registadas, cada uma com código, morada e raças. É a fonte
  autoritativa.
- **Os códigos de país** que a acompanham:
  <https://www.ueln.net/ueln-code-database/iso-3166-country-codes>
- **Como se obtém um código**:
  <https://www.ueln.net/ueln-presentation/how-to-get-an-ueln-code> — atribuído
  pelo gestor UELN, contacto `contact@ueln.net`.
- **Um exemplo de lista nacional já tabelada**, útil como formato: o Anexo 1
  das _Minimum Operating Standards_ escocesas,
  <https://www.gov.scot/publications/horse-passports-minimum-operating-standards-mops-passport-issuing-organisations-pios/pages/26/>,
  que enumera os organismos emissores britânicos por código `826 xxx`.

### O que não trago, e porquê — não consegui saber

`ueln.net` está bloqueado à saída deste ambiente (secção 1). Nunca vi a lista.

E há um segundo motivo, mais importante do que o bloqueio. Quando insisti em
extrair códigos pelos resumos de pesquisa, o resumo devolveu-me primeiro três
entradas plausíveis (`826 002` Anglo-European Studbook, `826 003` British
Association for the Purebred Spanish Horse, `826 004` British Horse Society) e,
na mesma resposta, continuou a lista sozinho — `826 005`, `826 006`, `826 007`
— com nomes que nenhuma fonte tinha citado. **Uma lista assim é pior do que não
haver lista nenhuma**, e por duas razões distintas:

1. Um código atribuído ao organismo errado faz-nos dizer «este passaporte é da
   APSL» a um passaporte que não é. Isso é uma afirmação falsa sobre um
   documento, que é precisamente o que este sistema existe para não fazer.
2. Um código verdadeiro em falta, num sistema que tratasse o desconhecido como
   inválido, recusaria um passaporte verdadeiro.

Nem sequer o código da própria APSL consegui confirmar — e há uma razão
específica para desconfiar do palpite: em Portugal **quem emite o documento de
identificação e quem atribui o UELN é a DGAV** (secção 5), não a associação.
O bloco do meio de um Lusitano português pode muito bem ser o da base nacional
e não o de um livro genealógico. Escrever `620015 = APSL` seria inventar.

O único código que vi afirmado com um exemplo concreto foi o francês —
`250001` para o SIRE, no número `25000119013926N` de um espécime do IFCE. Um
código sozinho não é uma lista, e não vale um módulo.

### Por isso não escrevi `lib/documentos/ueln-bases.ts`

O ficheiro estava previsto **na condição de encontrar a lista**. Não a
encontrei — encontrei onde ela está. Um módulo com uma ou duas entradas
copiadas de um resumo não é uma lista de códigos: é uma aparência de
verificação, com o custo de fazer alguém confiar nela.

**O que fazer quando a rede permitir** (dez minutos de trabalho, e o desenho já
está decidido):

1. Abrir <https://www.ueln.net/ueln-code-database/> e extrair as entradas —
   pelo menos as dos países da secção 3, e sobretudo as `620`.
2. Escrever `lib/documentos/ueln-bases.ts` com a tabela `código → organização,
país`, e o endereço e a data da recolha em comentário no topo.
3. A função devolve **três** estados, nunca dois:
   `{ estado: "conhecida", organizacao, pais }` · `{ estado: "desconhecida" }`
   · `{ estado: "mal-formado" }` — e este último **só** para o que a estrutura
   garante (não ter três caracteres, por exemplo). Um código bem formado que
   não esteja na tabela é **`desconhecida`**, e `desconhecida` **nunca** é
   motivo de aviso ao utilizador nem de conflito: a lista é incompleta por
   construção e cresce sempre que uma organização nova recebe código. Exportar
   um `LISTA_INCOMPLETA = true` e a data da recolha, para que ninguém leia a
   tabela como fechada.
4. Testes em `__tests__/lib/ueln-bases.test.ts`, e o caso que mais interessa é
   o que garante que um código inexistente devolve `desconhecida` e não um
   erro.

É a mesma regra que o `passaporte-ueln.ts` já segue por escrito, e que o
`identificadores.ts` chama «na dúvida, não se encontrou nada».

---

## 5. Portugal: DGAV, RNE/GesEqus, e o microchip

### Quem emite e quem atribui o UELN — confirmado

A **DGAV** é a autoridade nacional de identificação animal e o **único
organismo emissor** do Documento de Identificação de Equídeos (DIE) —
<https://www.dgav.pt/animais/conteudo/animais-de-producao/equideos/identificacao-registo-e-movimentacao-animal/passaporte-documento-de-identificacao-de-equinos-die/>.
São os serviços da DGAV que atribuem o número UELN e que o registam no **RNE —
Registo Nacional de Equídeos**.

**Duas cores, e a distinção interessa-nos directamente:**

- **DIE azul** — equídeos inscritos em livro genealógico / stud-book reconhecido
  em Portugal pela DGAV. É o «Livro Azul».
- **DIE verde** — equídeos de produção e rendimento, não inscritos em livro
  genealógico.

Ou seja: **a cor do documento já é, por si, uma afirmação sobre a inscrição no
livro.** Um DIE verde apresentado como prova de que um cavalo é PSL registado é
uma contradição dentro do próprio documento. Isto é verificável a partir do que
já lemos, sem consultar ninguém.

### A plataforma — confirmado

O RNE corre hoje na plataforma **GesEqus**, lançada pela DGAV
(<https://www.dgav.pt/wp-content/uploads/2026/02/Press-Release_GesEqus.pdf>),
com perfis diferenciados para detentores, médicos veterinários, serviços
públicos, entidades com tarefas delegadas e associações gestoras de livros
genealógicos. O acesso faz-se pelo iDigital/SNIRA ou por registo no portal do
**IFAP** (<https://www.ifap.pt>). Apoio da DGAV em `rne@dgav.pt`.

### Um privado pode confirmar um transponder? — provável que não

Tudo o que encontrei descreve o RNE/GesEqus como plataforma **autenticada por
perfil**. Não encontrei consulta pública, anónima, de microchip. Não é o mesmo
que ter a certeza de que não existe: não consegui saber com segurança, e é a
segunda pergunta a fazer, depois da da APSL.

O que continua verdadeiro: a via prática para nós é a APSL, que **pesquisa por
microchip** e cujo acesso é público (secção 2).

---

## 6. O que o passaporte da UE traz impresso

### O quadro legal — confirmado

O **Regulamento de Execução (UE) 2021/963**, de 10 de Junho de 2021, fixa hoje
o modelo do documento de identificação dos equídeos, ao abrigo dos Regulamentos
(UE) 2016/429, 2016/1012 e 2019/6. Substituiu o **2015/262**. Aplica-se desde
7 de Julho de 2021, **mas o Anexo II — o que contém o modelo do documento — só
desde 28 de Janeiro de 2022**.

Texto integral (não consegui abri-lo; o endereço é este):
<https://eur-lex.europa.eu/legal-content/PT/TXT/HTML/?uri=CELEX:32021R0963>

### A estrutura que consegui apurar — provável

Ancorada em formulações que a pesquisa devolveu de forma consistente e que
citam o articulado:

- **Secção I** — identificação. Dividida em partes:
  - **Parte A** — os dados descritivos. O **ponto 3** é a descrição por
    palavras, e o regulamento manda **evitar abreviaturas**. O **ponto 5** é o
    código do transponder, e exige espaço para **pelo menos 15 algarismos** —
    o que casa exactamente com os 15 do nosso `microchip-iso.ts`.
  - **Parte B** — o **resenho** (a silhueta): marcas a tinta vermelha,
    redemoinhos a tinta preta, ou o equivalente se for preenchido
    electronicamente, seguindo as orientações da FEI ou da Weatherbys.
  - **Parte C** — o registo de **alterações** aos dados de identificação.
- **Secção X** — as **castanhas**, exigida apenas nos documentos de equídeos
  sem transponder nem marca auricular e que não tenham marcas, ou tenham no
  máximo três redemoinhos.
- O modelo consta da **Parte 1 do Anexo II**.
- Em França, o documento correspondente abre com o cabeçalho «Section I —
  DOCUMENT D'IDENTIFICATION d'un équidé», e o espécime está publicado pelo
  IFCE:
  <https://www.ifce.fr/wp-content/uploads/2018/10/SIRE-document-identification-trait-specimen.pdf>
- Em Portugal, a DGAV descreve o DIE como um livro (azul ou verde) com toda a
  informação do equídeo, incluindo **a descrição gráfica (resenho)**, o código
  do microchip e o respectivo **número único vitalício (UELN)**.

### O vocabulário campo a campo — não consegui saber

**E é por isso que não escrevi `lib/documentos/vocabulario-passaporte.ts`.**
O que se pedia era o vocabulário _copiado do regulamento_, e o regulamento é
precisamente o que não pude abrir. O que tenho é a estrutura acima, obtida por
paráfrase; não são os rótulos impressos. E um rótulo aproximado no leitor não é
neutro — cada palavra a mais na lista é uma hipótese a mais de apanhar o número
errado, como o `identificadores.ts` já diz por escrito. Substituir um
vocabulário inferido por outro vocabulário inferido não é a correcção que se
pediu.

**As três fontes de onde sai, em minutos, com um browser sem bloqueio:**

1. **Português e inglês, com força de lei** — o Anexo II do 2021/963 no
   EUR-Lex, alternando `/PT/` e `/EN/` no mesmo endereço CELEX acima. Dá os
   rótulos oficiais nas duas línguas, lado a lado, com a mesma numeração — que
   é exactamente a forma de que o módulo precisa.
2. **Inglês, em texto navegável e já anexo a anexo** — a versão retida do
   2015/262 no legislation.gov.uk:
   <https://www.legislation.gov.uk/eur/2015/262/annex/I/adopted/data.xht>.
   Está revogado, mas a Secção I manteve-se muito próxima e serve para
   confrontar.
3. **Um exemplar a sério, em francês** — o espécime do IFCE acima. Um exemplar
   impresso vale mais do que qualquer paráfrase, porque mostra a ordem e a
   grafia com que os rótulos aparecem na página, que é o que o leitor procura.

E, quando isso estiver feito, uma quarta que vale mais do que as três:
**digitalizar um Livro Azul português verdadeiro**, com o consentimento de um
vendedor. O que o leitor tem de reconhecer é o que a DGAV imprime, não o que o
regulamento redige.

---

## 7. Elementos de segurança do documento

**Confirmado:**

- O DIE é **único, vitalício e obrigatório**; sem ele o animal não está
  identificado. Emitido pela DGAV.
- A cor — **azul** para inscritos em livro genealógico, **verde** para produção
  e rendimento — é ela própria um sinal, e o mais barato de verificar
  (secção 5).
- Os meios de identificação electrónica trazem código de país de três
  algarismos compatível com a ISO 3166 e um código numérico individual
  (2021/963).
- Há **duplicados e substitutos**, pedidos ao DAV/NAV da área. Um duplicado é
  um documento legítimo com estatuto diferente do original — e é uma
  circunstância que o nosso leitor deve saber que existe antes de tratar dois
  documentos do mesmo cavalo como uma contradição.
- O 2021/963 trata também de **smart cards** como complemento ao documento em
  papel.

**Não consegui saber:** se o DIE português tem numeração sequencial visível,
holograma, selo branco, laminado de segurança, código de barras ou QR
normalizado, e o que um eventual código codificaria. Não encontrei nenhuma
fonte a descrevê-lo, e não é coisa que se adivinhe. Quem responde a isto é um
exemplar na mão — outra vez, o Livro Azul digitalizado.

---

## 7-b. O que se viu no formulário, a 4 de Setembro de 2026 — e muda a recomendação

O dono do site abriu a página do acesso público e mostrou-a. Duas coisas que
nenhuma pesquisa tinha dado, e que decidem o assunto:

### Há um reCAPTCHA

O selo do reCAPTCHA está no canto inferior direito da página da consulta.

**Isto fecha a porta à consulta automática, e fecha-a bem.** O `robots.txt` não
proibia nada — mas um CAPTCHA não é uma omissão nem uma opinião: é o operador a
dizer, na linguagem técnica mais clara que existe, que aquele formulário é para
pessoas. Contorná-lo seria hostil, quase de certeza contrário aos termos, e não
se faz.

**O interruptor `STUD_BOOK_APSL_ACTIVO` fica em baixo, e não é para subir.** O
cliente que está escrito continua a valer — o ritmo, o registo, o analisador de
três saídas — mas o que o vai alimentar não é um pedido nosso: é uma pessoa a
consultar e a registar o que viu. Ver a secção 8.

### O stud-book corre em software de terceiros: **Genpro, da Ruralbit**

Ao fundo da página: «Powered by Genpro - Ruralbit». O stud-book não é software
feito em casa pela APSL — é um produto de uma empresa portuguesa de software
para pecuária.

**É o melhor caminho que apareceu até agora**, e muda a quem se pede: não é só
à APSL, é à APSL **e** à Ruralbit. Quem faz software de genealogia pecuária tem
quase sempre uma via de integração, porque outros clientes já a pediram.

### Os campos do formulário

`Nome` · `Criador` · **`NIN / Chip / UELN`** · `Sexo` · `Idade` (intervalo, de
… a … anos) · `Pelagem` · `Pontuação` · `Título de Reprodutor`.

**`NIN / Chip / UELN` é um campo só.** Os três identificadores entram no mesmo
sítio, e não em três pesquisas diferentes — o que simplifica o desenho e
confirma que a ordem de preferência entre eles (número de registo, UELN,
microchip) é uma escolha nossa e não uma imposição do formulário.

Que existam `Pontuação` e `Título de Reprodutor` como critérios de pesquisa diz
também que esses dados estão no livro e são públicos — o que é relevante para o
que se pode confrontar com um anúncio.

---

## 8. Recomendação

### O que fazer, por ordem, e porquê essa ordem

**Primeiro, as três coisas que se resolvem com um browser e valem mais do que
todo o resto.** Não precisam da APSL, não precisam de acordo nenhum, e cada uma
melhora o leitor no dia seguinte:

1. Abrir <https://www.ueln.net/ueln-code-database/> e trazer os códigos. A
   secção 4 tem o desenho do módulo já decidido, incluindo a regra que impede
   que uma lista incompleta recuse um passaporte verdadeiro.
2. Abrir o Anexo II do 2021/963 no EUR-Lex, em PT e EN, e copiar os rótulos. A
   secção 6 tem as fontes e a ordem por que se devem confrontar.
3. Digitalizar um Livro Azul verdadeiro. É o que valida as duas anteriores e o
   que responde à secção 7.

**Segundo, a cor do documento.** Um DIE verde não pertence a um cavalo inscrito
no Livro Genealógico. É uma verificação que se faz com o que já lemos, sem
consultar ninguém, e apanha uma classe inteira de anúncios errados.

**Terceiro, e só então, a APSL.**

### Se se for pela consulta pública

Antes de escrever uma linha:

- Ler `https://www.cavalo-lusitano.com/robots.txt` e os termos de utilização.
  Se proibirem consulta automática, **acaba aqui** e passa-se ao acordo.
- Descobrir o endereço real do formulário e os nomes dos parâmetros, abrindo a
  página de acesso público.

Se for permitido, o que eu recomendaria:

- **Ritmo:** uma consulta por anúncio submetido, no momento da submissão, e
  nunca mais — não é um serviço a interrogar, é um documento a conferir uma
  vez. Um pedido de cada vez, nunca em paralelo, com um intervalo mínimo entre
  pedidos e um tecto diário. O resultado guarda-se com o anúncio; só se
  reverifica se o vendedor mudar o número.
- **Identificar-se:** um `User-Agent` que diga quem somos e um endereço de
  contacto. Quem consulta a coberto do anonimato está a assumir que não seria
  autorizado.
- **Quando não responde:** o anúncio **não** é bloqueado nem marcado. Fica «por
  confirmar», e tenta-se mais tarde. A indisponibilidade da APSL não pode virar
  um problema do vendedor — a mesma regra que o `identificadores.ts` já aplica:
  uma ausência não contradiz nada.
- **Quando devolve um número que não conhece:** também **não** é uma acusação.
  É `desconhecido`, e vai para revisão humana com o motivo escrito. Um cavalo
  antigo, um erro de transcrição, uma inscrição em curso e uma falsificação
  produzem todos o mesmo silêncio, e nós não conseguimos distingui-los. Só um
  **conflito** — a APSL devolve um cavalo e o nome, a pelagem ou a data não
  batem certo com o anúncio — é que é um sinal, e mesmo esse é para uma pessoa
  ver, não para recusar automaticamente.
- **O que se mostra:** «confirmado no Livro Genealógico» só quando a APSL
  confirmou. Nunca o inverso — nunca «não consta», que é uma afirmação sobre um
  cavalo que não temos como sustentar.

### Se não for permitido — e é o caminho que eu escolheria de qualquer modo

Pedir por escrito. **A quem:** APSL — Associação Portuguesa de Criadores do
Cavalo Puro Sangue Lusitano, por
<https://www.cavalo-lusitano.com/pt/apsl/contactos>; sede no Centro Empresarial
de Évora, delegação na Av. Mem Ramires, 94, 2765-337 São João do Estoril.

**O que pedir, por esta ordem de preferência:**

1. **Uma autorização escrita** para consultar o acesso público em nome de quem
   publica um anúncio, com um ritmo acordado por escrito. É o pedido mais
   pequeno e o mais provável de ser aceite.
2. **Um ponto de consulta próprio** — um endereço que aceite NIN, UELN ou
   microchip e devolva «existe / não existe» e os campos que a APSL entender
   públicos. Não é preciso mais do que isso para o que fazemos.
3. **Um selo.** É o que eu proporia primeiro numa conversa: em vez de nós
   consultarmos a base deles, um anúncio verificado passa a poder exibir que o
   foi. O interesse é dos dois lados — nós ganhamos a única verificação que
   conta, e a APSL ganha que o maior classificados de Lusitanos empurre os
   vendedores para documentação em ordem, que é literalmente a missão dela.

**O argumento a usar, e é honesto:** não queremos os dados deles nem os
queremos republicar. Queremos deixar de deixar passar cavalos que não estão no
livro. E, ao contrário de quase toda a gente que lhes bate à porta, temos um
sítio onde o resultado disso se vê.

**Enquanto não houver resposta**, o que temos continua a valer: incoerência
entre documento e formulário, formato do UELN e do microchip, cor do DIE, e o
próprio Livro Azul visível no anúncio. Nada disso responde à pergunta do Livro
Genealógico — e o sítio não deve dar a entender que responde.

---

## 9. Resumo por pergunta

| #   | Pergunta                                            | Resposta                                                    | Grau               |
| --- | --------------------------------------------------- | ----------------------------------------------------------- | ------------------ |
| 1   | A APSL tem consulta pública?                        | **Sim.** Gratuita, sem registo, por nome/NIN/microchip/UELN | Confirmado         |
| 1   | Endereço exacto do motor e parâmetros               | —                                                           | Não consegui saber |
| 1   | Termos e `robots.txt` permitem consulta automática? | —                                                           | Não consegui saber |
| 2   | As congéneres têm livro próprio?                    | **Não.** Livro único mundial, da APSL                       | Confirmado         |
| 2   | ABPSL / AEPSL têm consulta aberta?                  | Não encontrei                                               | Provável que não   |
| 3   | Onde está publicada a lista de códigos UELN?        | `ueln.net/ueln-code-database/`                              | Confirmado         |
| 3   | Quais são os códigos                                | —                                                           | Não consegui saber |
| 4   | Quem emite o DIE e atribui o UELN em Portugal       | **DGAV**, registo no RNE/GesEqus                            | Confirmado         |
| 4   | Consulta pública de microchip por um privado        | Não encontrei; a plataforma é autenticada                   | Provável que não   |
| 5   | Modelo legal do passaporte                          | Reg. (UE) 2021/963, Anexo II, desde 28-01-2022              | Confirmado         |
| 5   | Estrutura das secções                               | Secção I partes A/B/C; Secção X castanhas                   | Provável           |
| 5   | Rótulos impressos, campo a campo                    | —                                                           | Não consegui saber |
| 6   | Cor azul/verde como sinal                           | **Sim**, e é verificável já hoje                            | Confirmado         |
| 6   | Holograma, numeração, código de barras              | —                                                           | Não consegui saber |

---

## Fontes

**APSL**
<https://www.cavalo-lusitano.com/pt/stud-book/acesso-publico-ao-stud-book> ·
<https://www.cavalo-lusitano.com/en/stud-book/public-access-to-the-stud-book> ·
<https://www.cavalo-lusitano.com/pt/stud-book/acesso-privado-ao-stud-book> ·
<https://www.cavalo-lusitano.com/pt/apsl> ·
<https://www.cavalo-lusitano.com/pt/apsl/associacoes-estrangeiras> ·
<https://www.cavalo-lusitano.com/pt/apsl/contactos> ·
<https://www.cavalo-lusitano.com/pt/politica-de-privacidade> ·
<https://www.cavalo-lusitano.com/uploads/subcanais_conteudos_ficheiros/regulamento-lgrl-2023-pt.pdf>

**Estado português**
<https://www2.gov.pt/servicos/consultar-o-stud-book-da-raca-lusitana> ·
<https://www.dgav.pt/animais/conteudo/animais-de-producao/equideos/identificacao-registo-e-movimentacao-animal/passaporte-documento-de-identificacao-de-equinos-die/> ·
<https://www.dgav.pt/animais/conteudo/animais-de-producao/equideos/identificacao-registo-e-movimentacao-animal/> ·
<https://www.dgav.pt/wp-content/uploads/2026/02/Press-Release_GesEqus.pdf> ·
<https://www.dgav.pt/wp-content/uploads/2021/01/Manual_Eq-_atualizado_2015.pdf>

**UELN**
<https://www.ueln.net/ueln-code-database/> ·
<https://www.ueln.net/ueln-code-database/iso-3166-country-codes> ·
<https://www.ueln.net/ueln-presentation/> ·
<https://www.ueln.net/ueln-presentation/how-to-get-an-ueln-code> ·
<https://www.ueln.net/ueln-presentation/rules-of-attribution-of-the-ueln> ·
<https://inside.fei.org/fei/your-role/veterinarians/passports/ueln> ·
<https://wbfsh.com/ueln> ·
<https://www.gov.scot/publications/horse-passports-minimum-operating-standards-mops-passport-issuing-organisations-pios/pages/26/>

**Regulamento e modelo do documento**
<https://eur-lex.europa.eu/legal-content/PT/TXT/HTML/?uri=CELEX:32021R0963> ·
<https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=CELEX:32021R0963> ·
<https://www.legislation.gov.uk/eur/2015/262/annex/I/adopted/data.xht> ·
<https://food.ec.europa.eu/animals/identification/equine-animals_en> ·
<https://www.ifce.fr/wp-content/uploads/2018/10/SIRE-document-identification-trait-specimen.pdf> ·
<https://equipedia.ifce.fr/economie-et-filiere/reglementation/identification/procede-didentification-des-equides>

**Congéneres**
<https://www.abpsl.com.br/> · <https://aepsl.eu/> ·
<https://aepsl.eu/wp-content/uploads/2025/05/REGLAMENTO-APSL.pdf> ·
<https://uslusitano.org/searching-the-apsl-studbook/>

Nenhum destes endereços foi aberto a partir deste ambiente. Ver a secção 1.
