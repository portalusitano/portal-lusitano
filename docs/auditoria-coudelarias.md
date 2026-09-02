# Auditoria das coudelarias

Auditoria de conteúdo às **35 linhas** da tabela `coudelarias` em produção
(projecto `yrfcepsagtzkxwnnrztd`), pedida nestes termos: _«verificar se toda a
informação que está nas coudelarias é verdadeira e não é inventada»_.

O que se segue é um levantamento, não uma correcção. **Nenhuma frase deste
relatório substitui texto do site por outro texto inventado.** Onde uma
afirmação não se sustenta, fica listada com a razão, para o dono decidir entre
apagar e pedir à coudelaria.

## Como ler isto

Cada afirmação leva um de três estados:

| Estado            | Quer dizer                                                           |
| ----------------- | -------------------------------------------------------------------- |
| **Confirmado**    | Encontrou-se fonte pública que o diz. **Sempre com o link.**         |
| **Por confirmar** | Não se encontrou fonte. Não quer dizer falso — quer dizer sem prova. |
| **Contradito**    | Encontrou-se o contrário, ou o próprio registo contradiz-se.         |

Nunca se escreveu «confirmado» sem link. Uma contradição interna — o registo a
discordar de si próprio, ou uma conta que não fecha — conta como **contradito**
sem precisar de fonte de fora: a prova está no próprio registo, e vai citada.

### Limites deste levantamento, ditos à cabeça

- **A rede externa está fechada** neste ambiente, tirando um motor de pesquisa.
  Não foi possível abrir uma única página — nem a da APSL, nem a de nenhuma
  coudelaria. O que se cita são **excertos de resultados de pesquisa**, com o
  URL de onde vieram. É indício com origem, não é a fonte lida de ponta a
  ponta.
- **A base é de leitura apenas.** Não se escreveu nada. O que se propõe vai em
  ficheiro de migração, para o dono correr se quiser.
- **Não se descarregou nem se acrescentou uma única fotografia.** Republicar
  fotografias do sítio ou do Instagram de uma coudelaria num site comercial sem
  autorização é um problema legal antes de ser um problema técnico. O que se
  entrega é a lista do que falta e a quem é preciso pedir.
- A verificação externa parou a meio, por limite de sessão do motor de
  pesquisa. As coudelarias que ficaram sem tentativa de confirmação estão
  marcadas com **(sem tentativa)**, para não se confundirem com as que se
  procurou e não se achou.

---

## Resumo: o que está pior

### 1. Metade das fotografias do site não existe

**85 das 166 ligações de imagem guardadas na base apontam para ficheiros que
não estão no repositório** — 51%. São **20 coudelarias em 35** cuja galeria
está inteiramente morta.

O padrão é nítido e tem uma explicação só: a base guarda galerias em
`imagem-02.webp` … `imagem-09.webp`, e **não existe um único ficheiro `.webp`
em `public/images/coudelarias/`**. Só há `capa.jpg` e `galeria-N.jpg`. Alguém
gravou na base o nome que os ficheiros teriam depois de convertidos, e a
conversão nunca chegou a acontecer.

| Coudelaria                   | Ligações mortas | O que resta em disco |
| ---------------------------- | --------------: | -------------------- |
| `quinta-dos-cedros`          |               8 | só a capa            |
| `morgado-lusitano`           |               7 | só a capa            |
| `quinta-lusitania`           |               7 | só a capa            |
| `coudelaria-manuel-veiga`    |               6 | só a capa            |
| `henrique-abecasis`          |               6 | só a capa            |
| `vila-vicosa`                |               6 | só a capa            |
| `luis-bastos`                |               5 | só a capa            |
| `malhadinha-nova`            |               5 | só a capa            |
| `coudelaria-sa`              |               4 | só a capa            |
| `jupiter-classical-dressage` |               4 | só a capa            |
| `lago-alva`                  |               4 | só a capa            |
| `coudelaria-andrade`         |               3 | **nada** (nem pasta) |
| `ferraz-da-costa`            |               3 | só a capa            |
| `quinta-da-hermida`          |               3 | só a capa            |
| `veiga-teixeira`             |               3 | só a capa            |
| `luis-folgado`               |               3 | só a capa            |
| `herdade-do-azinhal`         |               2 | só a capa            |
| `joao-lynce`                 |               2 | só a capa            |
| `pedro-passanha`             |               2 | só a capa            |
| `torres-vaz-freire`          |               2 | só a capa            |

Só **seis** coudelarias têm galeria a sério em disco: `ortigao-costa` (13),
`monte-velho` (11), `joao-pedro-rodrigues` (11), `cavalos-na-areia` (8),
`alter-real` (5) e `companhia-das-lezirias` (5).

E **nove ficam sem uma única fotografia própria para lá da capa, ou nem
isso**: `casa-cadaval` (a mais antiga do directório, e tem só a capa),
`flor-do-lis`, `lusitanos-datela`, `santa-margarida`,
`fundacao-eugenio-almeida`, `herdade-do-pinheiro`, `mascarenhas-cardoso`,
`quinta-madre-de-agua` e `dressage-plus` — destas, as cinco últimas não têm
sequer capa própria.

### 2. Uma capa que é fotografia de banco de imagens

`dressage-plus` tem por capa
`https://images.unsplash.com/photo-1534307671554-9a6d81f4d629?w=1200`. É uma
fotografia genérica de um cavalo, comprada a metro, apresentada como sendo
daquela casa. É o caso exacto de «imagem genérica em vez de ser daquela
coudelaria», e é a única ligação de imagem para fora do repositório em toda a
tabela.

### 3. Três capturas de ecrã a fazer de fotografia

`coudelaria-andrade` tem por capa e galeria três ficheiros chamados
`Captura de ecrã 2026-02-23 215720.png`, `…215752.png` e `…215758.png`. São
capturas de ecrã — pelo nome, do sítio de outra pessoa —, e ainda por cima a
pasta `public/images/coudelarias/coudelaria-andrade/` **não existe**, pelo que
as três dão 404.

### 4. Um telefone que é um espaço reservado

`joao-pedro-rodrigues` tem `telefone = "+351 243 558 XXX"`. Está em produção.
Não é um número mal formatado: é um número por preencher, com os últimos três
dígitos escritos à letra `X`.

### 5. Seis coudelarias invisíveis, e são das melhores

Seis linhas têm `status = 'inactive'`, e são **exactamente** as mesmas seis que
não têm `coordenadas_lat`/`coordenadas_lng`:

`coudelaria-andrade`, `mascarenhas-cardoso`, `dressage-plus`,
`fundacao-eugenio-almeida`, `herdade-do-pinheiro`, `quinta-madre-de-agua`.

O `/directorio` e o `/mapa` filtram ambos por `status = 'active'`
(`app/directorio/page.tsx`, `app/mapa/page.tsx`), e é daí que sai o «29
coudelarias» do mapa: 35 − 6. Duas consequências:

- Entre as escondidas está a **Fundação Eugénio de Almeida**, criadora do
  GUIZO — o primeiro Lusitano a ganhar uma medalha olímpica. É provavelmente o
  registo mais notável da tabela inteira, e não se vê.
- A **Mascarenhas Cardoso** é a única linha com `regiao = 'Algarve'`. Como
  `regioesDisponiveis` conta a partir das linhas que a página recebe
  (`lib/directorio-filtros.ts`), e essa linha nunca lá chega, **o Algarve nunca
  aparece no filtro**. O filtro não está errado; falta-lhe a linha. Ou a
  coudelaria passa a activa, ou o Algarve não existe no site.

### 6. Duas colunas de coordenadas que discordam entre si

A tabela tem `coordenadas_lat`/`coordenadas_lng` **e** `latitude`/`longitude`.
As páginas lêem as primeiras; as segundas ficaram para trás e **discordam** em
seis casos:

| Coudelaria               | Distância entre as duas colunas |
| ------------------------ | ------------------------------: |
| `pedro-passanha`         |                     **17,8 km** |
| `torres-vaz-freire`      |                     **13,0 km** |
| `malhadinha-nova`        |                     **13,0 km** |
| `herdade-do-azinhal`     |                          6,8 km |
| `companhia-das-lezirias` |                          6,3 km |
| `cavalos-na-areia`       |                          4,0 km |

Dezassete quilómetros de diferença entre duas colunas da mesma linha querem
dizer que pelo menos uma está errada, e nada no esquema diz qual. Enquanto as
duas viverem lado a lado, qualquer código novo pode escolher a errada.

### 7. Coordenadas de povoação a fingir de coordenadas de coudelaria

Nove das 29 coordenadas terminam em fracções de minuto exacto (`.1167`,
`.6667`, `.9833`…). Isso é conversão de graus e minutos, ou seja **o centro da
povoação com precisão de cerca de 900 metros**, não a morada:

`casa-cadaval`, `companhia-das-lezirias`, `ferraz-da-costa`,
`joao-pedro-rodrigues`, `coudelaria-manuel-veiga`, `ortigao-costa`,
`quinta-da-hermida`, `vila-vicosa`, `monte-velho`.

E duas coincidem ao metro com a tabela de localidades do próprio repositório
(`lib/coordenadas-coudelarias.ts`), o que prova que foram resolvidas a partir
do nome da terra e não da morada:

- `joao-lynce` = `tabela["santarem"]`, morada «Santarém».
- `luis-folgado` = `tabela["montemor-o-novo"]`, morada **«Monte Mayor, EN 114
  Km 145.5, 7050-704 Montemor-o-Novo»** — uma herdade concreta, num
  quilómetro concreto de uma estrada nacional, apontada ao centro da vila.

As que ficam mais longe da terra que dizem ser (haversine contra a tabela do
repositório): `flor-do-lis` 15 km, `malhadinha-nova` 13 km, `torres-vaz-freire`
12 km, `quinta-dos-cedros` 11,2 km, `herdade-do-azinhal` 8,1 km,
`pedro-passanha` 7,9 km.

> **O que se tentou e não deu:** verificar se cada ponto cai dentro de Portugal
> com o polígono a 1:10m de `public/mapa-directorio.json`. O teste dá
> `morgado-lusitano` fora — mas dá **a própria Alverca também fora**, porque a
> 1:10m o estuário do Tejo é cortado com generosidade. O teste não serve junto
> ao estuário e o resultado **não** conta como achado. Fica dito para ninguém o
> repetir.

### 8. Uma coluna inteira por preencher, e outra escondida dentro de um texto

- **`distrito` é `NULL` nas 35 linhas.** A coluna existe e nunca foi usada.
- **`codigo_postal` é `NULL` nas 35 linhas** — mas **oito** linhas têm o código
  postal escrito lá dentro do campo `localizacao`: `2100-047`, `2050-041`,
  `2090-222`, `7050-704`, `7800-601`, `2615-365`, `3440-126`, `7440-201`. Todos
  com a forma portuguesa `NNNN-NNN` correcta. O dado existe; está no sítio
  errado.

### 9. Campos de prémios com coisas que não são prémios

O campo `premios` é uma lista de distinções. Em várias linhas guarda frases de
publicidade:

- `monte-velho`: `["Resort equestre de referência", "Instrução de Dressage de
classe mundial"]` — os dois. Nenhum é um prémio.
- `ortigao-costa`: `"Maior coudelaria privada de exportação internacional"`,
  `"Especialização única em cavalos pretos desde 1963"`.
- `torres-vaz-freire`: `"Propriedade familiar há mais de 200 anos"`,
  `"Linhagem preservada desde as éguas fundadoras Garça e Negaça"` — e o
  **prémio a sério** que a `historia` conta, o Troféu Gaston Santos de 1996,
  não está na lista.
- `vila-vicosa`: `"25+ anos de experiência"`.
- `quinta-dos-cedros`: `"Exportação para múltiplos países"`, `"Presença em
rankings FEI"`.
- `alter-real`: `"Património Cultural de Portugal"`, `"Integrada na Fundação
Alter Real"` — o segundo é um facto administrativo, não uma distinção.
- `malhadinha-nova`: `"Relais & Châteaux"` é uma associação a que se pertence,
  e `"Best Luxury Rural Hotel"` não tem ano nem quem o deu.

E ao contrário: `luis-bastos` diz na `descricao` que foi **«Melhor Criador
Lusitano Cascais 2016»** e tem `premios = []`.

### 10. Números relativos que envelhecem sozinhos

Quatro registos datam-se por diferença em vez de por ano, o que faz com que a
página fique mais errada a cada ano que passa:

- `luis-folgado`: «Há 25 anos no Alentejo» — e `ano_fundacao` é `NULL`. Não há
  como saber a partir de quando se contam os 25.
- `coudelaria-manuel-veiga`: «há mais de 220 anos» — `ano_fundacao` `NULL`.
- `vila-vicosa`: «mais de 25 anos», com `ano_fundacao = 1995`, que em 2026 dá
  **31**.
- `casa-cadaval`: «mais de 375 anos de criação» na `descricao`, «mais de 400
  anos» na `historia`, e 1648 no `ano_fundacao`.

### 11. Ortografia a duas normas

O site inteiro escreve em pré-Acordo (`actual`, `objectivo`, `projecto`). Duas
linhas fogem: `quinta-da-hermida` («projeto», «objetivo», nos dois campos) e
`companhia-das-lezirias` («Atualmente»). É sinal de texto colado de origens
diferentes.

### 12. Um endereço que não é da coudelaria

`vila-vicosa` tem por `website`
`https://lusitanohorsefinder.com/breeder-site-coudelaria-vila-vicosa-homepage/`
— a página dela num directório de terceiros, não o sítio dela. É o único
`website` da tabela que aponta para casa alheia. `torres-vaz-freire` é o único
em `http://` simples.

---

## O que **não** está mal, e vale a pena dizer

Duas suspeitas fortes foram levantadas e **caíram** depois de medidas. Ficam
escritas para não voltarem a ser levantadas:

1. **As histórias não saíram de um molde.** Comparadas todas contra todas — por
   frase inteira e por sequência de seis palavras —, **não há um único
   parágrafo partilhado** entre coudelarias. As onze sequências repetidas que
   apareceram são todas factos genuinamente comuns («Firme … produziu
   Novilheiro, Nilo, Neptuno e Opus», «Dr. Ruy d'Andrade (1880-1967)»,
   «Reserva Natural do Estuário do Sado»), e aparecem em registos que **têm
   mesmo** essa história em comum. Se estes textos foram gerados, não foi a
   partir de um molde único — e a semelhança de vários deles com o texto do
   sítio da própria coudelaria (verificada em `quintadabroa.com` e
   `herdadedoazinhal.com`) aponta para cópia da fonte, não para invenção.
   **Isso resolve a veracidade e levanta uma questão de direitos de autor**, que
   é outra conversa e é preciso tê-la.

2. **Xaquiro não é uma contradição.** Três registos chamam-lhe «ferro Quina» e
   o `pedro-passanha` diz-se berço dele. Parecia conflito; não é. «Quina» ali é
   a **linhagem**, e o criador é mesmo o Pedro Passanha —
   [pedropassanha.pt/pt/xaquiro.html](http://www.pedropassanha.pt/pt/xaquiro.html)
   confirma as duas coisas ao mesmo tempo.

---

## Relatório por coudelaria

Trinta e cinco secções, por ordem alfabética do nome. Cada uma lista o que o
registo afirma e em que estado fica. Onde só há uma nota de forma (um campo
vazio, um formato), não se abre linha de estado — os defeitos de forma estão
todos no resumo lá em cima.

---

### Casa Cadaval — `casa-cadaval`

`Muge, Salvaterra de Magos` · Ribatejo · 1648 · 15 cavalos · **activa**

| Afirmação                                                        | Estado            | Fonte / razão                                                                                                                  |
| ---------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Propriedade de 5.400 hectares                                    | **Confirmado**    | [grandesescolhas.com](https://grandesescolhas.com/casa-cadaval-a-nobreza-num-copo-de-vinho/) — «5400-hectare estate»           |
| Na família Cadaval desde 1648                                    | **Confirmado**    | [grandesescolhas.com](https://grandesescolhas.com/casa-cadaval-a-nobreza-num-copo-de-vinho/); ducado criado a 26.04.1648       |
| Das mais antigas coudelarias da Península Ibérica                | **Confirmado**    | [grandesescolhas.com](https://grandesescolhas.com/casa-cadaval-a-nobreza-num-copo-de-vinho/) — «one of the oldest in Iberia»   |
| Teresa Schönborn-Wiesentheid é a actual proprietária/gestora     | **Confirmado**    | [grandesescolhas.com](https://grandesescolhas.com/casa-cadaval-a-nobreza-num-copo-de-vinho/) — «current Chairman of the board» |
| «gerida por mulheres ao longo de **cinco** gerações»             | **Contradito**    | a mesma fonte diz **quatro** gerações consecutivas geridas por mulheres                                                        |
| «mais de 375 anos de criação de Lusitanos»                       | **Contradito**    | a própria `historia` data a manada fundadora de **1660** (366 anos), e noutro parágrafo fala em «mais de 400 anos»             |
| Campeões do Mundo em Atrelagem; Campeão Europeu em Eq. Trabalho  | **Por confirmar** | prémio sem ano, sem nome de cavalo e sem prova encontrada                                                                      |
| Palácio foi residência da Rainha D. Leonor de Áustria (séc. XVI) | **Por confirmar** | (sem tentativa)                                                                                                                |
| «efectivo médio de 15 éguas»                                     | **Por confirmar** | a fonte fala em ~60 animais no total; 15 pode bem ser só as éguas — não se contradizem, mas o site mostra 15 como «cavalos»    |

**Fotografias:** só a capa. É a coudelaria mais antiga do directório e tem uma
única imagem. **É a primeira a quem pedir.**

---

### Cavalos na Areia — `cavalos-na-areia`

`Torre, Comporta` · Alentejo · 2011 · 70 cavalos · **activa**

| Afirmação                                                                   | Estado            | Fonte / razão                                                                               |
| --------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------- |
| Fundada em 2011 por José Ribeira, na Torre (Comporta)                       | **Por confirmar** | (sem tentativa)                                                                             |
| Melhor Empresa de Animação Turística do Alentejo 2017                       | **Por confirmar** | (sem tentativa) — é um prémio com ano e entidade, logo verificável                          |
| Começou com doze cavalos, hoje mais de setenta                              | **Por confirmar** | (sem tentativa)                                                                             |
| Estudo de impacto ambiental de quase um ano concluiu impacto insignificante | **Por confirmar** | afirmação cara e sem quem o fez nem quando                                                  |
| Preços dos quatro programas (€70–€799)                                      | **Por confirmar** | preços não datados envelhecem sozinhos — ver a nota geral abaixo                            |
| Coordenada                                                                  | **Contradito**    | 3,5 km do centro da Comporta, e **4,0 km** de distância da coluna `latitude` da mesma linha |

**Nota:** este é o registo com mais preços do directório — quatro programas e
nove serviços com valor em euros, nenhum datado. Um preço errado numa página
pública é uma promessa que a coudelaria não fez. Ou levam data, ou saem.

**Fotografias:** 8 em galeria, todas vivas. Um dos seis registos sãos.

---

### Coudelaria Andrade — `coudelaria-andrade`

`Coruche` · Ribatejo · 1894 · **inactiva, sem coordenadas, sem contactos**

Este é **o pior registo da tabela**, e o único onde uma data é impossível.

| Afirmação                                                                        | Estado            | Fonte / razão                                                                                                                                                                                                                     |
| -------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «formada em 1894 por Dr. Ruy d'Andrade (1880-1967)»                              | **Contradito**    | duas provas: a aritmética do próprio registo dá-lhe **14 anos** em 1894; e a coudelaria foi fundada pelo **Arq. Alfredo d'Andrade** — [herdadedoazinhal.com/a-coudelaria](https://www.herdadedoazinhal.com/a-coudelaria/)         |
| «com éguas de criadores espanhóis de sangue Cartujano puro» (em 1894)            | **Contradito**    | as éguas Cartujanas foram adquiridas por Ruy d'Andrade em **1901** — [herdadedoazinhal.com](https://www.herdadedoazinhal.com/a-coudelaria/); o mesmo facto está certo no registo `herdade-do-azinhal` desta mesma tabela          |
| Firme cruzado com éguas Veiga produziu «Novilheiro, Nilo, Neptuno e **Opus II**» | **Contradito**    | o cavalo chama-se **Opus 72**, nascido em 1972, irmão inteiro do Novilheiro — [herdadedoazinhal.com/lusitanos](https://www.herdadedoazinhal.com/lusitanos/), [lusitanocollection.com](http://www.lusitanocollection.com/novi.htm) |
| Ruy d'Andrade viveu 1880–1967                                                    | **Confirmado**    | [herdadedoazinhal.com](https://www.herdadedoazinhal.com/a-coudelaria/)                                                                                                                                                            |
| Firme viveu 1956–1978 e é pai de Neptuno, Nilo, Novilheiro e Opus 72             | **Confirmado**    | [herdadedoazinhal.com/lusitanos](https://www.herdadedoazinhal.com/lusitanos/) — «Firme was born in 1956 … father of Neptuno, Nilo, Novilheiro and Opus 72»                                                                        |
| Ruy d'Andrade salvou a linha Alter Real da extinção                              | **Confirmado**    | [herdadedoazinhal.com](https://www.herdadedoazinhal.com/a-coudelaria/); o registo `alter-real` desta tabela conta o mesmo, com os garanhões «Regedor» e «Vigilante» cedidos por ele                                               |
| «Salvação da linha Alter Real (1938)» — o ano                                    | **Por confirmar** | o registo `alter-real` data a recuperação de **1942**; nenhuma fonte encontrada dá 1938                                                                                                                                           |
| Ruy d'Andrade descobriu o cavalo Sorraia (1920)                                  | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                   |
| «Ganhou mais Campeonatos de Criação do que qualquer outra»                       | **Por confirmar** | superlativo absoluto, sem quem conta nem em que período                                                                                                                                                                           |
| Campeão Ibérico de Criação 1970 e 1972                                           | **Por confirmar** | o registo `herdade-do-azinhal` atribui esses dois títulos à Coudelaria d'Andrade sob Fernando Sommer d'Andrade — coerente, mas não confirmado por fonte externa                                                                   |

**Fotografias:** três, todas mortas, todas capturas de ecrã, e a pasta não
existe. Ver o ponto 3 do resumo.

**Recomendação:** este registo tem duas datas erradas, um nome de cavalo
errado, um superlativo sem dono e três imagens que são capturas de ecrã de
outra pessoa. E o texto certo já existe na mesma tabela, no
`herdade-do-azinhal`. Não se corrige inventando: ou se apaga, ou se pede à
casa — mas não pode ficar como está.

---

### Coudelaria CL — Companhia das Lezírias — `companhia-das-lezirias`

`Samora Correia` · Ribatejo · 1836 · 150 cavalos · **activa**

| Afirmação                                                    | Estado            | Fonte / razão                                                                                                                                                                        |
| ------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Companhia das Lezírias fundada em 1836                       | **Confirmado**    | [en.wikipedia.org/wiki/Companhia_das_Lezírias](https://en.wikipedia.org/wiki/Companhia_das_Lez%C3%ADrias)                                                                            |
| Maior exploração agro-pecuária do país, ~18.000 hectares     | **Confirmado**    | [en.wikipedia.org](https://en.wikipedia.org/wiki/Companhia_das_Lez%C3%ADrias), [coudelaria.cl.pt](https://coudelaria.cl.pt/en/history/)                                              |
| Dedica-se exclusivamente ao Puro Sangue Lusitano             | **Confirmado**    | [coudelaria.cl.pt/en/history](https://coudelaria.cl.pt/en/history/)                                                                                                                  |
| `ano_fundacao = 1836` **para a coudelaria**                  | **Contradito**    | a própria `historia` diz apenas «A Coudelaria foi criada no século XIX», sem ano. 1836 é a data da **empresa**, não da coudelaria — e é essa que a ficha mostra como ano de fundação |
| Sócia n.º 46 da APSL                                         | **Por confirmar** | não encontrado nos resultados                                                                                                                                                        |
| 16 éguas de ventre                                           | **Por confirmar** | e discorda de `num_cavalos = 150`, que conta outra coisa                                                                                                                             |
| 1.º lugar no Concurso Nacional de Coudelarias, Santarém 2017 | **Por confirmar** | (sem tentativa)                                                                                                                                                                      |
| ZINQUE — Campeão Mundial Equitação de Trabalho 2018          | **Por confirmar** | (sem tentativa)                                                                                                                                                                      |
| HASA — Campeã de Campeões Festival Internacional 2014        | **Por confirmar** | (sem tentativa)                                                                                                                                                                      |
| QUEFINA — Campeã de Campeões Holanda 2010                    | **Por confirmar** | (sem tentativa)                                                                                                                                                                      |
| Coordenada                                                   | **Contradito**    | **6,3 km** de distância da coluna `latitude` da mesma linha; e é conversão de graus e minutos (centro de povoação)                                                                   |

**Forma:** «Atualmente» — única linha, com a `quinta-da-hermida`, fora da norma
ortográfica do site.

**Fotografias:** 5 em galeria, todas vivas.

---

### Coudelaria de Alter Real — `alter-real`

`Alter do Chão` · Alentejo · 1748 · 200 cavalos · **activa**

O registo mais bem sustentado da tabela.

| Afirmação                                                           | Estado            | Fonte / razão                                                                                                                                                                                                           |
| ------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundada em 1748 por vontade de D. João V                            | **Confirmado**    | [pt.wikipedia.org/wiki/Coudelaria_de_Alter](https://pt.wikipedia.org/wiki/Coudelaria_de_Alter), [revive.turismodeportugal.pt](https://revive.turismodeportugal.pt/pt-pt/coudelaria-alter)                               |
| Instalada na Coutada do Arneiro, ~800 hectares                      | **Confirmado**    | [pt.wikipedia.org/wiki/Coudelaria_de_Alter](https://pt.wikipedia.org/wiki/Coudelaria_de_Alter)                                                                                                                          |
| A mais antiga do mundo em funcionamento contínuo no mesmo local     | **Confirmado**    | [revive.turismodeportugal.pt](https://revive.turismodeportugal.pt/pt-pt/coudelaria-alter), [horseeconomicforum.com](https://horseeconomicforum.com/2025/09/06/coudelaria-de-alter-do-chao-patrimonio-vivo-de-portugal/) |
| Cavalariças Reais de Belém mandadas construir em 1726               | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                         |
| Recuperação a partir de 1942 com 11 éguas e 3 garanhões             | **Por confirmar** | (sem tentativa) — mas coerente com o registo `coudelaria-andrade`, que cita os mesmos garanhões cedidos por Ruy d'Andrade                                                                                               |
| Escola Portuguesa de Arte Equestre lançada em 1979                  | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                         |
| Integrada na Fundação Alter Real em 2007, gerida pela CL desde 2013 | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                         |

**Nota de tom:** a `historia` escreve, com cuidado, «esta coudelaria é
considerada por **muitos** a mais antiga do mundo a funcionar
ininterruptamente». A `descricao`, que é o que aparece no cartão, tira a
ressalva e afirma-o a seco. O resguardo estava certo e perdeu-se no campo mais
visível.

**Fotografias:** 5 em galeria, todas vivas.

---

### Coudelaria de Santa Margarida — `santa-margarida`

`Ferreira do Alentejo` · Alentejo · 1983 · **activa, sem uma única fotografia**

| Afirmação                                                                                    | Estado            | Fonte / razão                                                                                                                                                                                                 |
| -------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `localizacao` = «Ferreira do Alentejo», com coordenada no centro da vila                     | **Contradito**    | a própria `historia` diz que fica no **Monte da Sernadinha, em Figueira dos Cavaleiros** — outra povoação do mesmo concelho. O e-mail (`mte.sernadinha@`) confirma-o. A coordenada aponta para o sítio errado |
| Fundada em 1983                                                                              | **Por confirmar** | (sem tentativa)                                                                                                                                                                                               |
| Campeador — Campeão dos Campeões, Festival Internacional do Lusitano, Bélgica, Setembro 2013 | **Por confirmar** | (sem tentativa) — facto caro, com ano, mês e país: dá para verificar                                                                                                                                          |
| Spartacus aprovado como Reprodutor de Mérito                                                 | **Por confirmar** | (sem tentativa)                                                                                                                                                                                               |
| Campeador deixou 150 produtos registados no stud book                                        | **Por confirmar** | número verificável no livro genealógico                                                                                                                                                                       |
| «múltiplos prémios de Melhor Criador a nível nacional e internacional»                       | **Por confirmar** | sem ano, sem entidade, sem quantos — o tipo de frase que não se pode nem confirmar nem desmentir                                                                                                              |

**Fotografias:** **zero**, nem capa. Está activa e aparece no directório sem
imagem nenhuma.

---

### Coudelaria Ferraz da Costa — `ferraz-da-costa`

`Vila Verde de Ficalho` · Alentejo · 1987 · 100 cavalos · **activa**

Registo sóbrio: a `historia` é quase toda nomes de garanhões e ferros, que é
informação verificável e não adjectivos.

| Afirmação                                                    | Estado            | Fonte / razão                                                                                                           |
| ------------------------------------------------------------ | ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Fundada em 1987 na Herdade das Coelheiras                    | **Por confirmar** | (sem tentativa)                                                                                                         |
| Usou Opus 72 (ferro Veiga), Coral (Núncio), Xaquiro (Quina)… | **Por confirmar** | coerente com o resto da tabela; note-se que aqui está **Opus 72**, a grafia certa, ao contrário de dois outros registos |
| Cerca de 100 cavalos                                         | **Por confirmar** | (sem tentativa)                                                                                                         |
| Coordenada                                                   | **Contradito**    | conversão de graus e minutos — centro da povoação, não a herdade                                                        |

**Fotografias:** 3 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Flor do Lis — `flor-do-lis`

`Monte Real / Carvide, Leiria` · Centro · **`ano_fundacao` NULL** · 35 cavalos · **activa**

| Afirmação                                                        | Estado            | Fonte / razão                                                                                                                            |
| ---------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| «Fundada em 1993» (na `descricao`)                               | **Contradito**    | `ano_fundacao` é `NULL` e a `historia` não dá data nenhuma. O ano só existe no campo curto: ou é dado, e devia estar na coluna, ou não é |
| Gladiador do Lis — 43.º lugar no ranking mundial FEI de Dressage | **Por confirmar** | (sem tentativa). E um lugar de ranking **sem data** é informação que apodrece: os rankings FEI mudam todos os meses                      |
| Fundada por Luís Barbeiro em Carvide                             | **Por confirmar** | (sem tentativa)                                                                                                                          |
| 80 hectares de regadio                                           | **Por confirmar** | (sem tentativa)                                                                                                                          |
| Coordenada                                                       | **Contradito**    | **15 km** do centro de Leiria — a pior distância medida à localidade nomeada em todo o directório                                        |

**Fotografias:** só a capa.

---

### Coudelaria Henrique Abecasis — `henrique-abecasis`

`Quinta do Pilar, PT 366, 2050-041 Aveiras de Baixo` · Ribatejo · 1986 · 110 cavalos · **activa**

| Afirmação                                                                    | Estado            | Fonte / razão                                                                                                                                        |
| ---------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundada em 1986 na Quinta do Pilar, Aveiras de Baixo                         | **Por confirmar** | (sem tentativa)                                                                                                                                      |
| «mais de 110 cavalos, dos quais 35 estabulados, 30 éguas, 14 de turismo»     | **Confirmado**    | pela aritmética do próprio registo: 35+30+14 = 79, e «restantes em desenvolvimento» fecha nos 110. **É dos poucos números do directório que fecham** |
| Programas reconhecidos pelo Turismo de Portugal, VisitPortugal e CM Azambuja | **Por confirmar** | (sem tentativa)                                                                                                                                      |
| Código postal `2050-041`                                                     | —                 | bem formado, mas guardado dentro de `localizacao` e não em `codigo_postal`                                                                           |

**Fotografias:** 6 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Herdade do Azinhal — `herdade-do-azinhal`

`Urra, Portalegre` · Alentejo · 1894 · 17 cavalos · **activa**

O registo mais bem documentado da tabela depois do Alter Real — e é ele que
serve de prova contra o `coudelaria-andrade`.

| Afirmação                                                                    | Estado            | Fonte / razão                                                                       |
| ---------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| Coudelaria d'Andrade fundada em 1894 pelo Arq. Alfredo d'Andrade             | **Confirmado**    | [herdadedoazinhal.com/a-coudelaria](https://www.herdadedoazinhal.com/a-coudelaria/) |
| Melhorada em 1901 por Ruy d'Andrade, com éguas Cartujanas                    | **Confirmado**    | [herdadedoazinhal.com/a-coudelaria](https://www.herdadedoazinhal.com/a-coudelaria/) |
| Herdada por Fernando Sommer d'Andrade e dividida pelos quatro filhos em 1991 | **Confirmado**    | [herdadedoazinhal.com/a-coudelaria](https://www.herdadedoazinhal.com/a-coudelaria/) |
| FIRME é pai de Neptuno, Nilo, Novilheiro e **Opus 72**                       | **Confirmado**    | [herdadedoazinhal.com/lusitanos](https://www.herdadedoazinhal.com/lusitanos/)       |
| Ruy d'Andrade (1880-1967) e a recuperação de Alter Real                      | **Confirmado**    | [herdadedoazinhal.com/a-coudelaria](https://www.herdadedoazinhal.com/a-coudelaria/) |
| Coudelaria Campeã Ibérica, Feira de Campo, Madrid, 1970 e 1972               | **Por confirmar** | (sem tentativa)                                                                     |
| ZAMORIM 1.º lugar no 1.º Campeonato Internacional do Lusitano                | **Por confirmar** | (sem tentativa)                                                                     |
| Fernando Sommer d'Andrade foi Presidente da APSL e fundador do Stud Book     | **Por confirmar** | (sem tentativa)                                                                     |
| «Linhagem preservada há mais de 130 anos»                                    | —                 | 1894→2026 dá 132; a conta fecha                                                     |
| Coordenada                                                                   | **Contradito**    | **6,8 km** da coluna `latitude` da mesma linha, e 8,1 km do centro de Portalegre    |

**Nota:** o texto deste registo é muito próximo do do sítio da coudelaria. É a
melhor procedência possível para os factos — e é também o problema de direitos
de autor descrito no resumo.

**Fotografias:** 2 em galeria, **as duas mortas**. Fica só a capa.

---

### Coudelaria João Lynce — `joao-lynce`

`Santarém` · Ribatejo · 2003 · 20 cavalos · **activa**

| Afirmação                                                                                       | Estado            | Fonte / razão                                                                                                  |
| ----------------------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------------------- |
| Fundada em 2003, com éguas da Coudelaria Calheiros Ferreira                                     | **Por confirmar** | (sem tentativa)                                                                                                |
| Campeão Europeu por Equipas de Equitação de Trabalho, 2001                                      | **Por confirmar** | (sem tentativa) — facto caro e datado, verificável na federação                                                |
| Campeão Mundial por Equipas, 2002                                                               | **Por confirmar** | (sem tentativa)                                                                                                |
| Campeão Nacional e Europeu Individual, 2003                                                     | **Por confirmar** | (sem tentativa)                                                                                                |
| Perito — Campeão da Raça Lusitana 1999 e Campeão Nacional de Garanhões 2004                     | **Por confirmar** | (sem tentativa)                                                                                                |
| «demonstrações de dressage barroco na Cidade Proibida de Pequim, perante o Presidente da China» | **Por confirmar** | é a afirmação mais cara do registo e a mais fácil de desmentir se for falsa. Sem ano                           |
| «considerado o grande embaixador do Lusitano no mercado chinês»                                 | **Por confirmar** | superlativo sem dono — considerado por quem?                                                                   |
| Coordenada                                                                                      | **Contradito**    | igual **ao metro** a `tabela["santarem"]` do repositório: é o centro de Santarém, resolvido pelo nome da terra |

**Fotografias:** 2 em galeria, **as duas mortas**. A capa que resta tem
681×425 px e 46 KB — **a de menor resolução do directório inteiro**, num site
onde as outras andam pelos 1900 px.

---

### Coudelaria João Pedro Rodrigues — `joao-pedro-rodrigues`

`Alpiarça` · Ribatejo · 1992 · 50 cavalos · **activa**

| Afirmação                                                                                                 | Estado            | Fonte / razão                                                                                                    |
| --------------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------- |
| `telefone = "+351 243 558 XXX"`                                                                           | **Contradito**    | não é um telefone: é um espaço reservado publicado em produção                                                   |
| Fundada em 1992 com éguas castanhas da Casa Cadaval                                                       | **Por confirmar** | (sem tentativa) — coerente com a existência da `casa-cadaval` na mesma tabela                                    |
| «OXIDADO jpr, **oficialmente reconhecido** como o cavalo mais premiado do Mundo em Equitação de Trabalho» | **Por confirmar** | (sem tentativa). «Oficialmente reconhecido» exige dizer **por quem**; sem isso é um superlativo vestido de facto |
| Usou XAQUIRO (Quina), HOSTIL (Borba), ROUXINOL (ferro da casa)                                            | **Por confirmar** | coerente com o registo `pedro-passanha`, que cria o Xaquiro                                                      |
| Coordenada                                                                                                | **Contradito**    | conversão de graus e minutos — centro de Alpiarça                                                                |

**Fotografias:** 11 em galeria, todas vivas. Um dos seis registos sãos.

---

### Coudelaria Luís Bastos — `luis-bastos`

`Porto de Muge, Cartaxo, Santarém` · Ribatejo · **`ano_fundacao` NULL** · 12 cavalos · **activa**

| Afirmação                                          | Estado            | Fonte / razão                                                                                                            |
| -------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| «Fundada em 2006» (na `descricao` e na `historia`) | **Contradito**    | `ano_fundacao` é `NULL`. O ano está escrito duas vezes em prosa e não está na coluna que o site ordena por «antiguidade» |
| «Melhor Criador Lusitano Cascais 2016»             | **Contradito**    | está na `descricao` e o campo `premios` está **vazio**. Ou é prémio e vai para a lista, ou não é e sai da descrição      |
| Começou com 5 éguas, hoje 12                       | **Por confirmar** | (sem tentativa)                                                                                                          |
| «a cerca de 60 km de Lisboa»                       | —                 | Porto de Muge fica a ~60 km de Lisboa; a conta é plausível                                                               |

**Fotografias:** 5 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Luís Folgado — `luis-folgado`

`Monte Mayor, EN 114 Km 145.5, 7050-704 Montemor-o-Novo` · Alentejo · **`ano_fundacao` NULL** · 35 cavalos · **activa**

| Afirmação                                                                                   | Estado            | Fonte / razão                                                                                                                                             |
| ------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Há 25 anos no Alentejo…» / «25 anos de criação»                                            | **Contradito**    | é uma idade relativa sem âncora, e `ano_fundacao` é `NULL`. Não há como saber a partir de quando se contam os 25 — e o número fica mais errado a cada ano |
| Coordenada                                                                                  | **Contradito**    | igual **ao metro** a `tabela["montemor-o-novo"]`. A morada dá herdade, estrada e quilómetro; o mapa aponta para o centro da vila                          |
| «Nos últimos 10 anos focou-se na Dressage»                                                  | **Por confirmar** | outra medida relativa, sem ano                                                                                                                            |
| Centro de Ensino e Desbaste no Estoril (Alapraia): 8 boxes, picadeiro 15×30, carrière 20×60 | **Por confirmar** | (sem tentativa) — muito concreto, logo verificável                                                                                                        |

**Fotografias:** 3 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Manuel Veiga — `coudelaria-manuel-veiga`

`Quinta da Broa, Azinhaga` · Ribatejo · **`ano_fundacao` NULL** · **activa**

| Afirmação                                                                                             | Estado            | Fonte / razão                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fundada por Rafael José da Cunha, o «Príncipe dos Lavradores Portugueses», na Quinta da Broa          | **Confirmado**    | [quintadabroa.com/coudelaria-veiga.html](http://www.quintadabroa.com/coudelaria-veiga.html), [pt.wikipedia.org/wiki/Rafael_José_da_Cunha](https://pt.wikipedia.org/wiki/Rafael_Jos%C3%A9_da_Cunha)                                 |
| Dois garanhões de sangue Alter oferecidos por D. Fernando II e D. Pedro V em visitas à Quinta da Broa | **Confirmado**    | [quintadabroa.com](http://www.quintadabroa.com/coudelaria-veiga.html)                                                                                                                                                              |
| Manuel Tavares Veiga era sobrinho-bisneto de Rafael José da Cunha                                     | **Confirmado**    | [quintadabroa.com](http://www.quintadabroa.com/coudelaria-veiga.html)                                                                                                                                                              |
| Firme × éguas Veiga produziu «Novilheiro, Nilo, Neptuno e **Opus II**»                                | **Contradito**    | o cavalo é **Opus 72** — [herdadedoazinhal.com/lusitanos](https://www.herdadedoazinhal.com/lusitanos/), [lusitanocollection.com](http://www.lusitanocollection.com/novi.htm). O mesmo erro que o `coudelaria-andrade`              |
| «fundada há mais de 220 anos», com `ano_fundacao` a `NULL`                                            | **Contradito**    | idade relativa sem âncora. A fonte da própria quinta data o começo da coudelaria de **1817**, o que dá 209 anos em 2026 — [quintadabroa.com](http://www.quintadabroa.com/coudelaria-veiga.html). O ano existe e não está na coluna |
| Agareno (1931) é um dos seis Chefes de Linhagem oficiais do PSL                                       | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                    |
| Novilheiro foi líder europeu em prémios de saltos                                                     | **Confirmado**    | [horselife.es](https://www.horselife.es/2021/02/novilheiro-un-lusitano-en-la-elite-del-salto-de-obstaculos/) — «leader in Europe's prize money rankings» com John Whitaker                                                         |
| …**em 1983** (o ano)                                                                                  | **Por confirmar** | o facto confirma-se; o ano não aparece em nenhuma fonte encontrada                                                                                                                                                                 |
| Nilo — Campeão dos Campeões, Golegã 1974                                                              | **Confirmado**    | [herdadedoazinhal.com/lusitanos](https://www.herdadedoazinhal.com/lusitanos/) — «Champion of Champions at the 1974 Golegã»                                                                                                         |
| `telefone = "+351 249957154"`                                                                         | —                 | é o único sem espaços; e note-se que difere do e-mail, que é de `quintadabroa.com`                                                                                                                                                 |
| Coordenada                                                                                            | **Contradito**    | conversão de graus e minutos — centro da Azinhaga                                                                                                                                                                                  |

**Fotografias:** 6 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Mascarenhas Cardoso — `mascarenhas-cardoso`

`Albufeira` · **Algarve** · 1905 · **inactiva, sem coordenadas, sem fotografia**

| Afirmação                                                          | Estado            | Fonte / razão                                                                                                                                                                                           |
| ------------------------------------------------------------------ | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ano_fundacao = 1905`                                              | **Contradito**    | a `historia` diz que 1905 é o ano em que a **família adquiriu a quinta**, e a `descricao` fala em «criação selectiva desde há **mais de 40 anos**». São três datas implícitas diferentes na mesma linha |
| «a coudelaria mais meridional do Lusitano em Portugal continental» | **Por confirmar** | superlativo geográfico, repetido duas vezes no mesmo registo. É verificável e ninguém o verificou                                                                                                       |
| Quinta do Cerro d'Águia, 50 hectares, quatro gerações              | **Por confirmar** | (sem tentativa)                                                                                                                                                                                         |
| Produz 3 a 4 potros por ano                                        | **Por confirmar** | (sem tentativa)                                                                                                                                                                                         |
| Centro Equestre Federado; treinador residente João Pinto           | **Por confirmar** | (sem tentativa) — «Federado» é um estatuto, logo há registo público                                                                                                                                     |

**É a única linha do Algarve da tabela**, e por estar `inactive` leva a região
inteira consigo para fora do filtro. Ver o ponto 5 do resumo.

---

### Coudelaria Ortigão Costa — `ortigao-costa`

`Azambuja` · Ribatejo · 1963 · 72 cavalos · **activa**

| Afirmação                                                              | Estado            | Fonte / razão                                                                                |
| ---------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------------- |
| 58 éguas PSL pretas + 14 éguas Português de Desporto = 72              | —                 | a conta fecha com `num_cavalos = 72`                                                         |
| «a **maior** coudelaria privada em termos de exportação internacional» | **Por confirmar** | (sem tentativa). Superlativo absoluto, e está no campo `premios` como se fosse uma distinção |
| 14 éguas filhas do garanhão Moorlands Totilas                          | **Por confirmar** | (sem tentativa) — Totilas é um garanhão real e muito documentado, logo isto é verificável    |
| Fundada em 1963 por Luís Jorge Ortigão Costa                           | **Por confirmar** | (sem tentativa)                                                                              |
| Coordenada                                                             | **Contradito**    | conversão de graus e minutos — centro da Azambuja                                            |

**Fotografias:** 13 em galeria, todas vivas. **A melhor servida do
directório.**

---

### Coudelaria Pedro Passanha — `pedro-passanha`

`Ferreira do Alentejo` · Alentejo · 1980 · 30 cavalos · **activa**

| Afirmação                                                                                               | Estado            | Fonte / razão                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| XAQUIRO (1980–2007), criado nesta coudelaria                                                            | **Confirmado**    | [pedropassanha.pt/pt/xaquiro.html](http://www.pedropassanha.pt/pt/xaquiro.html)                                                                                             |
| Medalha de Ouro FIPSL Garanhões 1988; Ouro Descendência 2004; Reprodutor de Mérito 2010                 | **Confirmado**    | [pedropassanha.pt/pt/xaquiro.html](http://www.pedropassanha.pt/pt/xaquiro.html)                                                                                             |
| Descendência com mais de 100 medalhas de ouro e dez títulos de Campeão dos Campeões                     | **Confirmado**    | [pedropassanha.pt/pt/xaquiro.html](http://www.pedropassanha.pt/pt/xaquiro.html)                                                                                             |
| Fundada em 1980 na Herdade da Malhada Velha, com três éguas do ferro do Dr. Guilherme Borba             | **Por confirmar** | (sem tentativa)                                                                                                                                                             |
| ZAIRE — Campeão dos Campeões FIPSL 2010, Campeão de Portugal Saint-Georges 2012, CDI\*\*\* Sevilha 2009 | **Por confirmar** | (sem tentativa)                                                                                                                                                             |
| NUXEQUE — Ouro FIPSL 1998, Campeão dos Campeões Golegã 1998                                             | **Por confirmar** | (sem tentativa)                                                                                                                                                             |
| Sócio n.º 174 da APSL                                                                                   | **Por confirmar** | (sem tentativa)                                                                                                                                                             |
| Coordenada                                                                                              | **Contradito**    | **17,8 km** de distância da coluna `latitude` da mesma linha — a maior discrepância da tabela. E 7,9 km do centro de Ferreira do Alentejo, quando a herdade nomeada é outra |

**Nota:** «um dos garanhões mais influentes da raça» aparece aqui e no
`jupiter-classical-dressage`. Não é cópia: é o mesmo cavalo, citado por duas
casas que ambas descendem dele.

**Fotografias:** 2 em galeria, **as duas mortas**. Fica só a capa, e essa é
732×1101 — retrato, numa grelha que espera paisagem.

---

### Coudelaria Quinta da Hermida — `quinta-da-hermida`

`Vendas Novas` · Alentejo · 1999 · 30 cavalos · **activa, sem telefone**

O registo mais curto da tabela depois do `dressage-plus`: 364 caracteres de
história, e o que lá está é a mesma frase duas vezes.

| Afirmação                                                                        | Estado            | Fonte / razão                                                                          |
| -------------------------------------------------------------------------------- | ----------------- | -------------------------------------------------------------------------------------- |
| Projecto iniciado em 1999 em Vendas Novas                                        | **Por confirmar** | (sem tentativa)                                                                        |
| Registada na APSL como «Coisas do Campo, Lda – Quinta da Hermida», sócio n.º 445 | **Por confirmar** | (sem tentativa) — é a afirmação mais verificável do registo: firma e número de sócio   |
| «tem vindo a construir uma reputação de qualidade»                               | —                 | não é uma afirmação, é uma frase de preenchimento. Não há aqui um facto para verificar |
| `premios = []`, `telefone = NULL`                                                | —                 | dois campos vazios, que é honesto                                                      |
| Coordenada                                                                       | **Contradito**    | conversão de graus e minutos — centro de Vendas Novas                                  |

**Forma:** «projeto» e «objetivo» nos dois campos — fora da norma ortográfica
do site.

**Fotografias:** 3 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Quinta dos Cedros — `quinta-dos-cedros`

`Almargem do Bispo, Sintra` · Lisboa · 1995 · 57 cavalos · **activa**

| Afirmação                                                                                           | Estado            | Fonte / razão                                                                                         |
| --------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------- |
| `ano_fundacao = 1995`                                                                               | **Contradito**    | a `historia` não dá data nenhuma. O ano está na coluna e não tem respaldo no texto do próprio registo |
| Imperador dos Cedros — Campeão Nacional de cavalos jovens de 7 anos, montado por Vasco Mira Godinho | **Por confirmar** | (sem tentativa) — tem cavalo, cavaleiro e categoria; falta o ano                                      |
| «reconhecida como um dos centros de excelência para Dressage em Portugal»                           | **Por confirmar** | reconhecida por quem                                                                                  |
| «presença regular nos rankings internacionais de Dressage»                                          | **Por confirmar** | não nomeia cavalo, ranking nem posição — não há aqui nada que se possa verificar                      |
| Criada por Bruno e Adelino Carrilho                                                                 | **Por confirmar** | (sem tentativa)                                                                                       |
| Coordenada                                                                                          | **Contradito**    | 11,2 km do centro de Sintra                                                                           |

**Prémios:** dois dos três não são prémios («Exportação para múltiplos
países», «Presença em rankings FEI»).

**Fotografias:** 8 em galeria, **todas mortas** — a maior galeria morta da
tabela. Fica só a capa.

---

### Coudelaria SA — d'Andrade de Oliveira e Sousa — `coudelaria-sa`

`Herdade da Agolada de Baixo, 2100-047 Coruche` · Ribatejo · **`ano_fundacao` NULL** · **activa**

| Afirmação                                                      | Estado            | Fonte / razão                                                                                                                                                                                              |
| -------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Existe e é de Maria d'Andrade de Oliveira e Sousa              | **Confirmado**    | [coudelariasa.com](https://coudelariasa.com/) — «Andrade Horses – of Maria D'ANDRADE de Oliveira e Sousa», que é o `website` guardado no registo                                                           |
| Coudelaria d'Andrade «fundada pelo Dr. Ruy d'Andrade»          | **Contradito**    | terceira versão do mesmo facto dentro desta tabela, e errada como a primeira: foi fundada em 1894 pelo **Arq. Alfredo d'Andrade** — [herdadedoazinhal.com](https://www.herdadedoazinhal.com/a-coudelaria/) |
| Divisão pelos quatro filhos em 1991, após a morte de Fernando  | **Confirmado**    | [herdadedoazinhal.com](https://www.herdadedoazinhal.com/a-coudelaria/) — bate certo com o registo `herdade-do-azinhal`                                                                                     |
| Coudelaria Oliveira e Sousa fundada no final do século XIX     | **Por confirmar** | (sem tentativa)                                                                                                                                                                                            |
| Garanhões Curul, Farsante, Dayak, Oboé, Galan, Faneca, Marujo  | **Por confirmar** | (sem tentativa)                                                                                                                                                                                            |
| «Um símbolo e marco na história da criação do Cavalo Lusitano» | **Por confirmar** | superlativo puro, sem dono e sem facto por trás                                                                                                                                                            |

**Nota sobre a `descricao`:** dos 521 caracteres, os primeiros dois terços
descrevem o **cavalo Andrade em geral** — «fortes, resistentes, muito
inteligentes e extremamente versáteis, conformação nobre e harmoniosa,
andamentos poderosos e cadenciados, olhar vivo…» — e não esta casa. É a
descrição mais longa do directório e a que menos diz sobre o seu assunto.

**Fotografias:** 4 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Torres Vaz Freire — `torres-vaz-freire`

`Monte de Vila Formosa, Chança, 7440-201 Alter do Chão` · Alentejo · 1978 · 65 cavalos · **activa**

| Afirmação                                                                  | Estado            | Fonte / razão                                                                                                |
| -------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| «Com 45 éguas» na `descricao`, com `num_cavalos = 65`                      | **Por confirmar** | podem ser as duas verdade (éguas ≠ efectivo), mas o site mostra 65 e a ficha diz 45 sem explicar a diferença |
| Danúbio (ou Nilo) ganhou o Troféu Gaston Santos em 1996                    | **Por confirmar** | (sem tentativa) — prémio com nome, ano e cavaleiro: dá para verificar. **E não está no campo `premios`**     |
| Desde 1996 vence as provas de equitação tradicional à portuguesa na Golegã | **Por confirmar** | «desde 1996 vence» — todos os anos? Sem ressalva, é uma afirmação muito forte                                |
| Fundada em 1978 por Marcos Torres Vaz Freire e o filho Carlos              | **Por confirmar** | (sem tentativa)                                                                                              |
| Propriedade na família há mais de 200 anos                                 | **Por confirmar** | está no campo `premios`, onde não é um prémio                                                                |
| Coordenada                                                                 | **Contradito**    | **13 km** da coluna `latitude` da mesma linha, e 12 km do centro de Alter do Chão                            |
| `website` em `http://`                                                     | —                 | único da tabela sem TLS                                                                                      |

**Fotografias:** 2 em galeria, **as duas mortas**. Fica só a capa.

---

### Coudelaria Veiga Teixeira — `veiga-teixeira`

`N119 km 41.3, 2100 Coruche` · Ribatejo · 1886 · **activa**

| Afirmação                                                        | Estado            | Fonte / razão                                                                                                                                                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «exportou cavalos para o Brasil, **Islândia**, Noruega, Suécia…» | **Contradito**    | a Islândia **proíbe a importação de cavalos desde 1882**, sem excepções, por razões sanitárias — [horsesoficeland.is](https://www.horsesoficeland.is/news/protect-icelandic-horses-from-disease-2023/), [allabouthorses.org](https://allabouthorses.org/horse/icelandic/). Nem um cavalo islandês que saia pode voltar                                    |
| «Berço da linhagem Veiga»                                        | **Por confirmar** | e é duvidoso: o ferro Veiga (MV) e a linhagem que o mundo conhece são da **Coudelaria Veiga, na Quinta da Broa**, de Manuel Tavares Veiga — [quintadabroa.com](http://www.quintadabroa.com/coudelaria-veiga.html), que é outra linha desta mesma tabela (`coudelaria-manuel-veiga`) e outra família. **Duas linhas do directório reclamam o mesmo berço** |
| «A Coudelaria **Veiga** foi homenageada na Feira da Golegã»      | **Por confirmar** | e a frase diz «Coudelaria Veiga», não «Veiga Teixeira» — a mesma confusão de nome, dentro do mesmo parágrafo                                                                                                                                                                                                                                              |
| Fundada em 1886 em Coruche                                       | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                                                                                                                                           |
| «Uma das mais antigas coudelarias Lusitanas de Portugal»         | **Por confirmar** | superlativo relativo, sem lista de comparação                                                                                                                                                                                                                                                                                                             |
| «a mais prestigiada feira equestre de Portugal» (sobre a Golegã) | **Por confirmar** | superlativo, mas sobre a Golegã, não sobre a coudelaria                                                                                                                                                                                                                                                                                                   |

**Recomendação:** a lista de dez países de exportação tem pelo menos um caso
impossível. Uma lista assim ou vem da casa com prova, ou sai inteira — porque
basta um país impossível para pôr os outros nove em causa.

**Fotografias:** 3 em galeria, **todas mortas**. Fica só a capa.

---

### Coudelaria Vila Viçosa — `vila-vicosa`

`Vila Viçosa` · Alentejo · 1995 · 40 cavalos · **activa**

| Afirmação                                                  | Estado            | Fonte / razão                                                                                                                      |
| ---------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| `website` = `lusitanohorsefinder.com/breeder-site-…`       | **Contradito**    | é a página dela num directório de terceiros, não o sítio dela. Único caso da tabela                                                |
| «mais de 25 anos» de experiência                           | **Contradito**    | com `ano_fundacao = 1995`, em 2026 são **31**. E «25+ anos de experiência» está no campo `premios`                                 |
| Fundada em 1995 por Thomas e Michaela Kleba                | **Por confirmar** | (sem tentativa)                                                                                                                    |
| «eleitos "Melhor Criador" em Portugal mais do que uma vez» | **Por confirmar** | sem ano, sem entidade, sem quantas vezes                                                                                           |
| 34 boxes, picadeiro coberto e exterior                     | **Por confirmar** | (sem tentativa)                                                                                                                    |
| «a 5 km da cidade real de Vila Viçosa»                     | —                 | a coordenada fica a 0,6 km do centro da vila, não a 5 km. Não é contradição séria, mas as duas coisas não podem ser ambas a morada |
| Coordenada                                                 | **Contradito**    | conversão de graus e minutos — centro de Vila Viçosa                                                                               |

**Fotografias:** 6 em galeria, **todas mortas**. Fica só a capa.

---

### Dressage Plus — `dressage-plus`

`Portugal` · Centro · sem ano · **inactiva, sem coordenadas, sem contactos, sem sítio**

219 caracteres de história. É o registo mais fraco da tabela, e o único cuja
afirmação central se pôde desmentir com uma fonte.

| Afirmação                                                                          | Estado            | Fonte / razão                                                                                                                                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Zonik Plus e Hit Plus, dois dos **Lusitanos** portugueses mais bem classificados» | **Contradito**    | **Zonik Plus é um garanhão Hanoveriano**, não um Lusitano — [horsenetwork.com](https://horsenetwork.com/2025/12/justin-verboomen-zonik-plus-are-dressages-bright-new-hope/), [fei.org](https://www.fei.org/stories/sport/dressage/horse-month-zonik-plus). Está num directório de Lusitanos apresentado como Lusitano |
| «Zonik Plus — 7.º lugar no ranking mundial FEI»                                    | **Contradito**    | está desactualizado e sem data: em Agosto de 2025 foi **Campeão da Europa**, com ouro no Grand Prix Special e na Livre, com Justin Verboomen — [fei.org](https://www.fei.org/stories/sport/dressage/crozet-justin-verboomen-zonik-plus-profile)                                                                       |
| A Dressage Plus é a criadora do Zonik Plus                                         | **Confirmado**    | [horsenetwork.com](https://horsenetwork.com/2025/12/justin-verboomen-zonik-plus-are-dressages-bright-new-hope/) — «bred by the Portuguese stud, Dressage Plus»                                                                                                                                                        |
| «Hit Plus — 35.º lugar no ranking mundial FEI»                                     | **Por confirmar** | nada encontrado sobre este cavalo                                                                                                                                                                                                                                                                                     |
| `localizacao = "Portugal"`                                                         | **Contradito**    | o nome de um país não é uma localidade. Sem coordenadas, sem morada, sem concelho                                                                                                                                                                                                                                     |
| Capa                                                                               | **Contradito**    | fotografia do Unsplash — ver o ponto 2 do resumo                                                                                                                                                                                                                                                                      |

**Recomendação:** a casa existe e é boa — cria cavalos que ganham
campeonatos da Europa. O que está errado é tudo o resto: a raça do cavalo, a
posição no ranking, a localidade, a fotografia. **Este registo tem de ser
refeito de raiz com a casa, ou apagado.** Como está, diz três coisas falsas
sobre um criador real.

---

### Fundação Eugénio de Almeida — `fundacao-eugenio-almeida`

`Évora` · Alentejo · 1963 · **inactiva, sem coordenadas, sem fotografia**

O registo mais valioso da tabela — e não se vê no site.

| Afirmação                                                                                                           | Estado            | Fonte / razão                                                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| GUIZO (1988–2006), por Zasebande e de Cataria (por Tivoli)                                                          | **Confirmado**    | [eurodressage.com](https://www.eurodressage.com/2006/11/26/guizo-passed-away) — «a 1988 born Lusitano stallion by Zasebande out of Cataria (by Tivoli)»       |
| Medalha de prata por equipas nos Jogos Olímpicos de Atenas 2004, por Espanha, montado por Juan Antonio Jiménez Cobo | **Confirmado**    | [eurodressage.com](https://www.eurodressage.com/2006/11/26/guizo-passed-away), [chronofhorse.com](https://chronofhorse.com/en/article/spain-dressage-roster/) |
| **O primeiro Lusitano a conquistar uma medalha olímpica**                                                           | **Confirmado**    | [horseandhound.co.uk](https://www.horseandhound.co.uk/features/lusitano-facts-606209) — «the first Lusitano to win an Olympic medal was Guizo»                |
| Bronze por equipas nos Jogos Equestres Mundiais de Jerez 2002                                                       | **Confirmado**    | [eurodressage.com](https://www.eurodressage.com/2006/11/26/guizo-passed-away)                                                                                 |
| Prata por equipas no Campeonato Europeu de Hickstead 2003                                                           | **Confirmado**    | [eurodressage.com](https://www.eurodressage.com/2006/11/26/guizo-passed-away)                                                                                 |
| Faleceu em Novembro de 2006 de problemas intestinais                                                                | **Confirmado**    | [eurodressage.com](https://www.eurodressage.com/2006/11/26/guizo-passed-away), notícia de 26.11.2006                                                          |
| Fundação criada em 1963 por Vasco Maria Eugénio de Almeida                                                          | **Por confirmar** | (sem tentativa)                                                                                                                                               |
| Sócio n.º 99 da APSL                                                                                                | **Por confirmar** | (sem tentativa)                                                                                                                                               |
| Quinta de Valbom passou ao Estado em 1759; adquirida em 1869 por José Maria Eugénio de Almeida                      | **Por confirmar** | (sem tentativa)                                                                                                                                               |
| Adega da Cartuxa, mais de 300 hectares de vinha                                                                     | **Por confirmar** | (sem tentativa)                                                                                                                                               |

**Seis afirmações confirmadas com fonte, e nem uma contradita.** É o registo
mais sólido de toda a tabela — e está `inactive`, sem coordenadas e sem uma
única fotografia, logo não aparece nem no directório nem no mapa.

**Recomendação:** se houver uma coisa a fazer primeiro, é esta.

---

### Herdade da Malhadinha Nova — `malhadinha-nova`

`Albernoa, 7800-601 Beja` · Alentejo · 2008 · 32 cavalos · **activa**

| Afirmação                                                        | Estado            | Fonte / razão                                                                |
| ---------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------- |
| Criação iniciada em 2008 com seis éguas e um garanhão, ferro HMN | **Por confirmar** | (sem tentativa)                                                              |
| Hoje 32 cavalos                                                  | **Por confirmar** | bate certo com `num_cavalos = 32`                                            |
| Pedro Sousa monta Coeso, Kleber e Conquistador                   | **Por confirmar** | (sem tentativa)                                                              |
| «Wine Tourism Award 2023»                                        | **Por confirmar** | (sem tentativa) — tem ano, falta a entidade                                  |
| «Best Luxury Rural Hotel»                                        | **Por confirmar** | sem ano e sem quem o deu                                                     |
| «Relais & Châteaux»                                              | —                 | é uma associação a que se pertence, não um prémio ganho                      |
| Coordenada                                                       | **Contradito**    | **13 km** da coluna `latitude` da mesma linha, e 13 km do centro de Albernoa |

**Fotografias:** 5 em galeria, **todas mortas**. Fica só a capa.

---

### Herdade do Pinheiro — `herdade-do-pinheiro`

`Alcácer do Sal` · Alentejo · 1906 · **inactiva, sem coordenadas, sem fotografia**

| Afirmação                                                                                | Estado            | Fonte / razão                                                                                                                                                                                                                       |
| ---------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ano_fundacao = 1906` como início da coudelaria de Lusitanos                             | **Contradito**    | a própria `historia` diz que em 1906 Bartissol importou **Percherons para trabalho agrícola**, e que «em **1916** os registos documentam o início da criação de Lusitanos». Num directório de Lusitanos, o ano que interessa é 1916 |
| «cria Lusitanos, Selle Français e Puro-Sangue Inglês»                                    | **Contradito**    | a `historia`, com 1305 caracteres, não menciona uma única vez Selle Français ou Puro-Sangue Inglês. A afirmação só existe no campo curto                                                                                            |
| Edmond Bartissol (1841–1916), engenheiro francês, comprou a herdade em 1879              | **Por confirmar** | (sem tentativa) — nome, datas e obras públicas concretas, logo verificável                                                                                                                                                          |
| Origens romanas, fornos de ânforas para garum, redescobertos nos anos 1970               | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                     |
| Pertenceu à Ordem Militar de Santiago; passou à Coroa após a execução do Duque de Aveiro | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                     |
| «mudou de mãos apenas quatro vezes em 700 anos»                                          | **Por confirmar** | difícil de sustentar tal como está escrito                                                                                                                                                                                          |
| Mais de 5.000 hectares, mais de 160 espécies de aves, 60 funcionários                    | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                     |
| «A actual proprietária é Madame Jacqueline Violet; a filha Stéphanie Gicot…»             | **Por confirmar** | duas pessoas privadas nomeadas com nome completo. Verifique-se, ou tire-se                                                                                                                                                          |

---

### Jupiter Classical Dressage — `jupiter-classical-dressage`

`Vila Viçosa` · Alentejo · 2022 · 80 cavalos · **activa**

| Afirmação                                                                              | Estado            | Fonte / razão                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Constituída em Portugal a **5 de Abril de 2022**, por Jürgen Grüneis e Alexander Wickl | **Por confirmar** | (sem tentativa) — data ao dia e nomes de gerentes: verificável no registo comercial. É a afirmação mais falsificável de toda a tabela, e isso é um elogio |
| Herdade do Ameal, mais de 600 hectares, 32 boxes                                       | **Por confirmar** | (sem tentativa)                                                                                                                                           |
| Garanhões fundadores traçam-se a Estoiro, Finório e Xaquiro                            | **Por confirmar** | coerente: o Xaquiro está confirmado no registo `pedro-passanha`                                                                                           |
| «três dos garanhões mais influentes da raça Lusitana»                                  | **Por confirmar** | superlativo, mas modesto e sobre cavalos amplamente citados na própria tabela                                                                             |
| `num_cavalos = 80` com 32 boxes                                                        | —                 | compatível: nem todos estão estabulados                                                                                                                   |

**Fotografias:** 4 em galeria, **todas mortas**. Fica só a capa.

---

### Lusitanos d'Atela — Coudelaria Bessa de Carvalho — `lusitanos-datela`

`Casalinho, Alpiarça` · Ribatejo · 1989 · **activa, sem uma única fotografia de galeria**

O registo com mais factos datados e nominados da tabela — oito prémios, todos
com cavalo, prova e ano.

| Afirmação                                                                          | Estado            | Fonte / razão                                                                                                                                                                                                                                                    |
| ---------------------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Soberano era propriedade de Francisco Bessa de Carvalho, da Lusitanos d'Atela      | **Confirmado**    | [eurodressage.com](https://www.eurodressage.com/2025/09/12/carlos-pintos-soberano-passed-away)                                                                                                                                                                   |
| Soberano nos WEG de Caen 2014 com Carlos Pinto, **68.800%** no Grand Prix          | **Confirmado**    | [eurodressage.com](https://www.eurodressage.com/2025/09/12/carlos-pintos-soberano-passed-away) — o valor bate ao milésimo                                                                                                                                        |
| «melhor resultado da equipa portuguesa» nesse Grand Prix                           | **Por confirmar** | a fonte diz que ficaram em 47.º lugar; nada diz sobre a posição dentro da equipa portuguesa. Pode ser verdade e não está provado                                                                                                                                 |
| «Soberano (1999–2025) … faleceu em **Março** de 2025»                              | **Por confirmar** | a notícia da morte é de **12 de Setembro de 2025** — [eurodressage.com](https://www.eurodressage.com/2025/09/12/carlos-pintos-soberano-passed-away). Ou o mês está errado, ou a notícia saiu com meio ano de atraso. **Vale a pena confirmar antes de publicar** |
| Francisco Bessa de Carvalho é Mestre-Picador da Escola Portuguesa de Arte Equestre | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                                                  |
| Xenofonte d'Atela nos WEG de Tryon 2018 com Miguel Ralão Duarte                    | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                                                  |
| Hercules d'Atela — Campeão Europeu de Criação Lusitana 2016, Neu Anspach           | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                                                  |
| Soberano deixou 193 descendentes registados entre 2004 e 2024                      | **Por confirmar** | número exacto e verificável no livro genealógico                                                                                                                                                                                                                 |
| «cavalos em 5 continentes»                                                         | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                                                  |
| «Campeonatos do Mundo de Equestre (WEG)»                                           | —                 | a designação em português é **Jogos Equestres Mundiais**                                                                                                                                                                                                         |

**Fotografias:** **zero em galeria.** A capa que existe tem 1252×434 px — uma
tira, provavelmente um cabeçalho de sítio, não uma fotografia. É a casa com
melhor palmarés documentado do directório e não tem uma imagem decente.

---

### Monte Velho Equo Resort — `monte-velho`

`Arraiolos` · Alentejo · 1994 · 35 cavalos · **activa**

| Afirmação                                                                                | Estado            | Fonte / razão                                                                                                                                                   |
| ---------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `num_cavalos = 35`                                                                       | **Contradito**    | a `historia` diz «cerca de **15** cavalos no programa do hotel». O cartão mostra 35 e o texto diz 15                                                            |
| `premios = ["Resort equestre de referência", "Instrução de Dressage de classe mundial"]` | **Contradito**    | nenhum dos dois é um prémio. São a mesma frase de publicidade que já está na `descricao` e na `historia` — a terceira repetição da mesma ideia no mesmo registo |
| Criação para Dressage desde 1994                                                         | **Por confirmar** | (sem tentativa)                                                                                                                                                 |
| Herdade do Monte Velho, Santana do Campo, Arraiolos                                      | **Por confirmar** | (sem tentativa)                                                                                                                                                 |
| Coordenada                                                                               | **Contradito**    | conversão de graus e minutos — centro de Arraiolos, embora Santana do Campo seja outra freguesia                                                                |

**Fotografias:** 11 em galeria, todas vivas. Um dos seis registos sãos.

---

### Morgado Lusitano — `morgado-lusitano`

`Quinta da Portela, Cabeço da Rosa, EN 116, 2615-365 Alverca do Ribatejo` · Lisboa · **`ano_fundacao` NULL** · 15 cavalos · **activa**

| Afirmação                                                                                                                             | Estado            | Fonte / razão                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fica em **Alverca do Ribatejo** (`localizacao`, código postal 2615) / fica «em plena região vitivinícola de **Bucelas**» (`historia`) | **Contradito**    | são dois concelhos diferentes — Vila Franca de Xira e Loures. A EN 116 liga-os, mas a coudelaria só pode estar num                                          |
| Quinta da Portela é do século XVIII, mandada erguer pelo «Marquês de Castelo Melhor, Conde da Ribeira Grande»                         | **Por confirmar** | são dois títulos de **casas diferentes** (Vasconcelos e Sousa; Câmara), atribuídos aqui à mesma pessoa. Pode haver explicação, mas assim escrito é suspeito |
| «a 15 minutos do Aeroporto de Lisboa»                                                                                                 | **Por confirmar** | dito duas vezes, na `descricao` e na `historia`                                                                                                             |
| Pacotes de 7 e 4 noites, 2.055 €/1.915 €/1.220 €/1.080 € por pessoa                                                                   | **Por confirmar** | **catorze preços em euros, nenhum datado.** É o registo com mais preços do directório depois do `cavalos-na-areia`                                          |
| Visita à EPAE, aulas privadas 110 €/45 min, massagem 80 €/h…                                                                          | **Por confirmar** | idem                                                                                                                                                        |
| `ano_fundacao` NULL                                                                                                                   | —                 | e a `historia` também não dá ano nenhum para a coudelaria                                                                                                   |

**Recomendação:** um preço numa página pública é uma oferta. Catorze preços
sem data, numa ficha que ninguém revê, tornam-se catorze promessas que a casa
não fez. Ou levam data de actualização, ou saem e fica só o contacto.

**Fotografias:** 7 em galeria, **todas mortas**. Fica só a capa.

---

### Quinta da Lagoalva de Cima — `lago-alva`

`Quinta da Lagoalva de Cima, 2090-222 Alpiarça` · Ribatejo · **`ano_fundacao` NULL** · 40 cavalos · **activa**

| Afirmação                                                                              | Estado            | Fonte / razão                                                                                                                                                             |
| -------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ano_fundacao` NULL                                                                    | **Contradito**    | a `historia` dá duas datas boas — coudelaria com origem no final do séc. XVIII na Herdade da Apostiça, transferida para a Lagoalva em **1848** — e nenhuma está na coluna |
| «ligada à Casa Palmela desde 1848» (`descricao`) vs casamento em **1846** (`historia`) | **Por confirmar** | os dois números podem estar certos (o casamento em 1846, a transferência da coudelaria em 1848), mas a `descricao` funde-os num só                                        |
| Em 1193 D. Sancho I doou territórios à Ordem de Santiago                               | **Por confirmar** | (sem tentativa) — D. Sancho I reinou 1185–1211, logo a data é possível                                                                                                    |
| Comprada em 1834 por Henrique Teixeira de Sampayo, 1.º Conde da Póvoa                  | **Por confirmar** | (sem tentativa)                                                                                                                                                           |
| 24 éguas da coudelaria do «Duque de Toledo (Rei Afonso XIII de Espanha)»               | **Por confirmar** | (sem tentativa). «Duque de Toledo» era um título de incógnito de Afonso XIII; a afirmação é possível mas precisa de fonte                                                 |
| 660 hectares; Grupo Lagoalva, família Holstein Campilho                                | **Por confirmar** | (sem tentativa)                                                                                                                                                           |
| Coordenada                                                                             | **Por confirmar** | 5 km do centro de Alpiarça — mas a `localizacao` nomeia a própria quinta, que fica mesmo fora da vila. Aqui a distância pode estar certa                                  |

**Fotografias:** 4 em galeria, **todas mortas**. Fica só a capa.

---

### Quinta Lusitânia — Couto do Mosteiro — `quinta-lusitania`

`Rua do Calvário n.º 1, 3440-126 Couto do Mosteiro` · Beira Alta · **`ano_fundacao` NULL** · 20 cavalos · **activa**

| Afirmação                                                                             | Estado            | Fonte / razão                                                                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| «Couto do Mosteiro … pertencia à **Ordem dos Templários desde 915**»                  | **Contradito**    | a Ordem do Templo foi fundada por volta de **1119** — [pt.wikipedia.org/wiki/Ordem_dos_Templários](https://pt.wikipedia.org/wiki/Ordem_dos_Templ%C3%A1rios) — e o mosteiro do Couto do Mosteiro foi construído pelos Templários em **1150** — [aldeiasdeportugal.pt](https://www.aldeiasdeportugal.pt/aldeia/couto-do-mosteiro/). O ano 915 é anterior à Ordem em cerca de dois séculos |
| «muito antes da fundação de Portugal»                                                 | **Contradito**    | pela mesma razão: 1150 é **depois** da fundação de Portugal, não antes                                                                                                                                                                                                                                                                                                                  |
| «Os fundadores foram exploradores e empresários no **Congo Belga** nos séc. XIX e XX» | **Contradito**    | o Congo Belga só existiu a partir de **1908**. No século XIX o território era o Estado Livre do Congo                                                                                                                                                                                                                                                                                   |
| «oficiais do **regimento do Duque de Wellington**» na 3.ª invasão francesa (1810)     | **Por confirmar** | Wellington comandava o exército aliado, não «um regimento». A frase está mal posta, o que não quer dizer que o facto seja falso                                                                                                                                                                                                                                                         |
| Casa Senhorial com cerca de 200 anos, residência dos Viscondes de Valpaços            | **Por confirmar** | (sem tentativa) — título nobiliárquico e pessoas vivas nomeadas                                                                                                                                                                                                                                                                                                                         |
| 5 hectares, 6 suítes, vinha, arena de equitação                                       | **Por confirmar** | (sem tentativa)                                                                                                                                                                                                                                                                                                                                                                         |

**Recomendação:** três afirmações históricas contraditas no mesmo parágrafo.
O parágrafo histórico deste registo não se aproveita: ou vem da casa com
fonte, ou sai. **Não se substitui por outra história inventada.**

**Fotografias:** 7 em galeria, **todas mortas**. Fica só a capa.

---

### Quinta Madre de Água — `quinta-madre-de-agua`

`Vinhó, Gouveia` · Beira Alta · 2012 · **inactiva, sem coordenadas, sem fotografia**

| Afirmação                                                              | Estado            | Fonte / razão                                                                                                   |
| ---------------------------------------------------------------------- | ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Hotel aberto em Dezembro de 2012; coudelaria fundada no mesmo ano      | **Por confirmar** | (sem tentativa) — internamente coerente com `ano_fundacao = 2012`                                               |
| Projecto nasceu a partir de 2007, com Luís Gonçalves e Lurdes Perfeito | **Por confirmar** | (sem tentativa)                                                                                                 |
| Dois garanhões adquiridos à Coudelaria Ortigão Costa                   | **Por confirmar** | (sem tentativa) — e a Ortigão Costa está nesta mesma tabela, o que torna isto confirmável de um lado e do outro |
| Ortigão Costa é «**uma das mais prestigiadas de Portugal**»            | **Por confirmar** | é o superlativo-tipo que o dono pediu para caçar: prestigiada segundo quem                                      |
| Cavaleiro residente Nuno Carvalho                                      | **Por confirmar** | (sem tentativa)                                                                                                 |
| 500 ovelhas Bordaleiras, queijo Serra da Estrela DOP, vinhos do Dão    | **Por confirmar** | (sem tentativa)                                                                                                 |

---

## As cinco em pior estado

Por ordem, e com a razão:

1. **`coudelaria-andrade`** — duas datas erradas (fundador e ano das éguas
   Cartujanas), um nome de cavalo errado («Opus II»), um superlativo absoluto
   sem dono, `status` inactiva, sem coordenadas, sem contactos, e três imagens
   que são capturas de ecrã numa pasta que não existe. **E o texto correcto já
   está nesta tabela, no `herdade-do-azinhal`.**

2. **`dressage-plus`** — apresenta um garanhão Hanoveriano como Lusitano num
   directório de Lusitanos; a posição de ranking está desactualizada e sem
   data; `localizacao` é «Portugal»; sem coordenadas, sem contactos, sem sítio,
   sem ano; e a capa é uma fotografia de banco de imagens. Três afirmações
   contraditas em 219 caracteres.

3. **`quinta-lusitania`** — três afirmações históricas contraditas no mesmo
   parágrafo: os Templários dois séculos antes de existirem, «antes da fundação
   de Portugal» para um facto de 1150, e o Congo Belga no século XIX. Mais sete
   imagens mortas.

4. **`veiga-teixeira`** — uma exportação para um país que proíbe a importação
   de cavalos desde 1882, o que põe em causa a lista inteira de dez países;
   reclama ser «berço da linhagem Veiga», que outra linha da mesma tabela
   reclama com melhor suporte; e o parágrafo troca o nome da própria casa.
   Mais três imagens mortas.

5. **`quinta-dos-cedros`** — `ano_fundacao` sem respaldo no próprio texto, dois
   dos três «prémios» não são prémios, duas afirmações que não nomeiam nada de
   verificável («presença regular nos rankings», «reconhecida como centro de
   excelência»), coordenada a 11,2 km da terra que diz ser, e **a maior galeria
   morta da tabela — oito imagens, todas inexistentes**.

Menções logo a seguir: **`santa-margarida`** (a coordenada aponta para uma
povoação que o próprio texto desmente, e não tem uma única fotografia) e
**`morgado-lusitano`** (dois concelhos diferentes no mesmo registo, catorze
preços sem data).

---

## Contagem

| Estado            | Afirmações |
| ----------------- | ---------: |
| **Confirmado**    |         38 |
| **Contradito**    |         50 |
| **Por confirmar** |        134 |
| **Total**         |    **222** |

As 134 «por confirmar» dividem-se em duas famílias muito diferentes:

- **as que se podem verificar** — prémios com cavalo, prova e ano; números de
  sócio da APSL; datas de constituição de sociedade; produtos registados no
  stud book. São a maioria, e verificam-se com acesso à Internet e uma tarde.
- **as que não se podem verificar por construção** — «uma das mais
  prestigiadas», «reconhecida como centro de excelência», «considerado o grande
  embaixador», «reputação de qualidade». Não são falsas; **são frases que não
  afirmam nada**. Contam-se catorze destas. Para estas não há verificação
  possível: ou saem, ou ficam como o que são.

---

## O que pedir, e a quem

**Fotografias** — o mais urgente, e o único que não se resolve na base de
dados. Vinte coudelarias têm galerias inteiramente mortas e nove ficam sem
nada. **Não se descarrega nem se republica uma única fotografia sem
autorização escrita.** Por ordem de necessidade:

1. `casa-cadaval`, `lusitanos-datela`, `fundacao-eugenio-almeida` — as três
   casas com mais história documentada do directório, sem imagens.
2. `santa-margarida`, `flor-do-lis`, `herdade-do-pinheiro`,
   `mascarenhas-cardoso`, `quinta-madre-de-agua` — sem uma única imagem.
3. As vinte com galeria morta — aqui pode nem ser preciso pedir: se os
   originais existirem em qualquer lado, o que falta é a conversão para `.webp`
   que nunca aconteceu.

**Texto** — quatro registos precisam de confirmação da própria casa antes de
poderem ficar no ar como estão: `coudelaria-andrade`, `dressage-plus`,
`quinta-lusitania` e `veiga-teixeira`.

**Contactos** — `joao-pedro-rodrigues` (o telefone com `XXX`) e `vila-vicosa`
(o endereço de terceiros).
