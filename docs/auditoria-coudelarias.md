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
