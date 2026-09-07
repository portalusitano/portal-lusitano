# O que mudar nas coudelarias, por ordem de confiança

Resumo accionável dos quatro relatórios deste directório.

> **APLICADO a 7 de Setembro de 2026.** O que está feito está marcado com ✅ e
> registado na secção «O que foi escrito na base», no fim. O aviso que se segue
> sobre o `WebFetch` continua verdadeiro para o **relatório original**; a
> aplicação foi feita com o `WebSearch` a funcionar, e **três afirmações que o
> relatório dava por infundadas confirmaram-se** — o «sem fonte» era o bloqueio
> a falar, não os factos. Estão assinaladas.

## O limite, que decide o que se pode fazer sozinho

O `WebFetch` está bloqueado pelo proxy deste ambiente para **todos** os
domínios. Nenhum dos quatro agentes abriu uma única página: tudo veio de
excertos de motor de busca. Isso não invalida o trabalho — as divergências
foram achadas por comparação e são reproduzíveis — mas muda o que se pode fazer
com ele sem confirmar.

Por isso a lista está por **confiança**, e não por gravidade.

---

## A. Feito — não precisava de julgamento

- **Coudelaria João Pedro Rodrigues, telefone.** Estava `+351 243 558 XXX`, com
  os X literais: um valor por preencher que ficou em produção e que ninguém
  pode marcar. Ficou a `null`. Não se escolheu substituto porque as fontes
  deram três números em conflito, e o campo onde o erro custa mais é justamente
  aquele onde a pesquisa se mostrou menos fiável. **Melhor sem telefone do que
  com um falso.**

---

## B. Erros de facto, com fonte, que só precisam do seu «sim»

### Prémios que pertencem a outra casa

1. **Veiga Teixeira** — a «Homenagem na Feira Nacional do Cavalo, Golegã» é da
   **Coudelaria Veiga** (Manuel Tavares Veiga, Quinta da Brôa, Azinhaga), pelo
   bicentenário dela. Nome parecido, família diferente. **Retirar da ficha.**
2. **Lusitanos d'Atela** — «Soberano, WEG Caen 2014». Os números batem todos
   certo, mas **Soberano III foi criado por Guilherme Borba**; é o único cavalo
   da lista sem o sufixo «d'Atela». A ligação verdadeira é que ele é **pai do
   Hercules d'Atela**. **Reescrever, não apagar.**

### A medalha olímpica, que está certa e mal escrita

3. **Fundação Eugénio de Almeida — GUIZO.** As três medalhas confirmam-se
   contra quatro fontes. Falta a palavra que muda a leitura: **Espanha**.
   Cavaleiro espanhol, proprietário espanhol, equipa de Espanha; o papel da
   casa é o de **criador**. Redacção proposta:

   > **GUIZO** (1988, por Zasebande em Cataria), Lusitano criado pela Fundação
   > Eugénio de Almeida, montado pelo espanhol Juan Antonio Jiménez Cobo:
   > medalha de prata por equipas nos Jogos Olímpicos de Atenas 2004 com a
   > equipa de Espanha; bronze por equipas nos Jogos Equestres Mundiais de
   > Jerez 2002; prata por equipas no Campeonato da Europa de Hickstead 2003.

### Afirmações sem uma única fonte

4. **«Fundador Luís Barbeiro»** (Flor do Lis) — sem fonte.
5. **«Campeador — Campeão dos Campeões, Bélgica 2013»** (Santa Margarida) — sem fonte.
6. **«Spartacus — Reprodutor de Mérito»** (Santa Margarida) — sem fonte.
7. **«Hit Plus — 35.º do ranking FEI»** (Dressage Plus) — sem fonte.
8. **«A maior coudelaria privada de exportação»** e **«especialização única em
   cavalos pretos»** (Ortigão Costa) — auto-declarações. Ou se atribuem à casa
   por escrito, ou saem. O «desde 1963» confirma-se.

### Uma afirmação que a própria história da casa contradiz

9. **Alter Real — «a coudelaria real mais antiga em funcionamento contínuo no
   mundo».** Kladruby nad Labem é coudelaria imperial desde **1579**, 169 anos
   antes, com linhagem ininterrupta no mesmo sítio e inscrição da UNESCO
   precisamente por isso. E a história de Alter regista quase-extinção após as
   invasões francesas, com recuperação a partir de 11 éguas e 3 garanhões —
   «contínuo» é a parte que a própria história contradiz. Ver a redacção
   alternativa no `lote-1.md`.

### Prémios desactualizados

10. **Dressage Plus — Zonik Plus.** Não é Lusitano (é de sangue quente), e o
    «7.º lugar» está velho: em 2025 foram **campeões da Europa e primeiros do
    mundo**. E o ranking FEI classifica **atletas**, não cavalos.
11. **Flor do Lis — «Gladiador do Lis, 43.º do ranking FEI».** Não bate (60.º
    em Nov/2024, 56.º em Ago/2025). **Um lugar de ranking sem data garante que
    o portal fica errado sozinho.** Ou leva data, ou não é um campo.

---

## C. Coordenadas — precisam de si, e são as que mandam alguém conduzir

**Não lhes toquei.** Cada uma manda uma pessoa a um sítio; um erro meu aqui é
pior do que o erro que lá está.

### Comprovadamente erradas, com substituto de fonte forte

| coudelaria           | erro                                                       | substituto proposto    | de onde vem                                             |
| -------------------- | ---------------------------------------------------------- | ---------------------- | ------------------------------------------------------- |
| **Coudelaria CL**    | 9,8 km                                                     | `38.8794, -8.8628`     | a própria coudelaria publica 38°52'46,00"N 8°51'46,23"O |
| **Alter Real**       | 4 km (está a 260 m do centro da vila)                      | `39.221776, -7.687602` | Tapada do Arneiro                                       |
| **Santa Margarida**  | 8,9 km (está a **70 m** do centro de Ferreira do Alentejo) | Monte da Sernadinha    | nome do concelho                                        |
| **Malhadinha Nova**  | 12,2 km                                                    | `37.8307, -7.9892`     | duas fontes independentes                               |
| **Monte Velho**      | 7,6 km (centro de Arraiolos)                               | `38.7755, -8.0288`     | cruza com «7 km de Arraiolos»                           |
| **Morgado Lusitano** | 3,2 km                                                     | por apurar             | —                                                       |

### Confirmadas certas — não mexer

- **Torres Vaz Freire** — certa **a cinco metros**. Chança fica mesmo a ~12 km
  de Alter do Chão. (A conferência que fiz antes, contra o centro da
  localidade, apontou-a como a mais errada de todas: estava enganada.)
- **Pedro Passanha** — a 520 m da Herdade da Malhada Velha.
- **Henrique Abecasis** — confirma ao sexto decimal.

### Centros de vila disfarçados de moradas

**Vila Viçosa** e **Jupiter** têm as duas o centro da vila; as duas moradas
reais são a Herdade do Ameal, fora dela. E três coordenadas denunciam-se pela
forma do número: `39.3667 / -8.5333` é 39°22′/8°32′ arredondado — a assinatura
de um centróide, não de um portão.

### Uma armadilha para quem for corrigir

Há **outra Herdade do Azinhal em Nisa**, no mesmo distrito. Quem corrigir a do
Azinhal por pesquisa de nome apanha a errada.

---

## D. Duas coudelarias que podem estar duplicadas

1. **Coudelaria Andrade (inactiva) e Coudelaria SA — d'Andrade de Oliveira e
   Sousa (activa).** A Andrade não fechou: **dividiu-se pelos quatro filhos de
   Fernando Sommer d'Andrade em 1991**, e o ramo de Coruche opera hoje com o
   nome novo — que já está na base, activo, na mesma Herdade da Agolada de
   Baixo. É a mesma casa duas vezes: uma acesa com o nome novo, outra apagada
   com o nome antigo.
2. **Jupiter Classical Dressage e Coudelaria Vila Viçosa** dão a **mesma
   morada**, a Herdade do Ameal. Não há fonte que descreva uma sucessão ou
   venda, e nenhum agente a afirmou — mas explicaria uma casa «fundada em 2022»
   com 80 cavalos e um criador de 1995 sem site próprio.

---

## E. Um campo que está mal desenhado, e não mal preenchido

**`num_cavalos` parece estar a contar éguas.** Em pelo menos quatro fichas o
número coincide com o de éguas reprodutoras citado nas fontes: Casa Cadaval
«15» são as 15 éguas (o efectivo ronda 60), João Lynce «20 éguas», Luís Bastos
«12 éguas», Ortigão Costa «58 éguas». Ou o campo muda de nome, ou os valores
estão sistematicamente subavaliados — e a segunda hipótese faz coudelarias
grandes parecerem pequenas.

E há **dois pares de colunas de coordenadas** na tabela (`coordenadas_lat/lng` e
`latitude/longitude`). O código lê o primeiro; o segundo nunca é lido. Seis
activas têm valores diferentes nos dois. **Depois de confirmar as seis, o par
que não se lê deve ser apagado** — dois pares na mesma tabela é uma armadilha
montada para quem vier a seguir.

---

## F. As seis inactivas

Cinco deviam voltar: **Andrade** (com o nome resolvido — ver D.1), **Herdade do
Pinheiro**, **Quinta Madre de Água**, **Mascarenhas Cardoso** e **Dressage
Plus** (esta só depois de corrigir os prémios e a morada — a região «Centro» não
tem suporte nenhum, e a única morada em registo é a sede social na Amadora, que
quase de certeza não é a coudelaria).

A **Fundação Eugénio de Almeida** é a única em que a recomendação é esperar. A
Fundação está activa — vinho, azeite, cultura. O que não se conseguiu confirmar
é que **continue a criar cavalos**: as páginas indexadas descrevem a operação
agrícola sem mencionar criação equina, e não há registo recente de nascimentos
nem de concursos. Uma ficha de coudelaria numa casa que talvez já não crie
cavalos manda gente telefonar a pedir poldros a quem não os tem.

---

## O que preciso de si

O que decide tudo o resto: **repetir isto com rede**, para se abrirem os sites e
se confirmar o que aqui está por excerto. Enquanto isso não acontecer, o que se
pode mudar sozinho é o que está na secção A.

A seguir a isso, por esta ordem: **as seis coordenadas** (é o que manda alguém
conduzir), **os dois prémios de outras casas** (são afirmações sobre pessoas), e
**as duas duplicações**.

---

# O que foi escrito na base

7 de Setembro de 2026. Cada linha diz o valor de antes, para se poder desfazer.

## Coordenadas — quatro das seis, confirmadas por fonte independente

Cada uma foi confirmada **duas vezes** antes de se escrever, e as duas colunas
(`coordenadas_lat/lng` e `latitude/longitude`) ficaram iguais, que é uma
armadilha a menos.

| coudelaria      | antes                                    | depois                 | confirmação                                                                             |
| --------------- | ---------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------- |
| Coudelaria CL   | `38.9667, -8.85`                         | `38.879444, -8.862842` | a própria casa publica 38°52'46,00"N 8°51'46,23"O (Monte Braço de Prata, EN118 km 29,3) |
| Alter Real      | `39.1994, -7.6614`                       | `39.221776, -7.687602` | Tapada do Arneiro, 7440-152 Alter do Chão                                               |
| Malhadinha Nova | `37.9109, -7.8947`                       | `37.830696, -7.989163` | 37°49'50,60"N 7°59'20,91"O, e o Apple Maps ao sétimo decimal                            |
| Monte Velho     | `38.7167, -7.9833` (centro de Arraiolos) | `38.775491, -8.028753` | Herdade do Monte Velho, Santana do Campo                                                |

**O Monte Velho quase levou um valor errado.** A primeira busca devolveu
`38.77527, -7.98616` — latitude quase igual, longitude 3,7 km ao lado. Foi
Santana do Campo que desempatou: a aldeia está em `38.7665, -8.0325`, e o valor
com `-8.0288` fica a 1 km dela enquanto o outro fica a 4 km. **Duas fontes a
darem números parecidos não são duas confirmações**; o que confirma é um
terceiro facto independente — aqui, a morada.

**Não escritas, e porquê:**

- **Santa Margarida** — o relatório propõe «Monte da Sernadinha», que é um nome
  e não uma coordenada. Sem número, não se escreve um.
- **Morgado Lusitano** — sem substituto.

## Prémios e história

| coudelaria                                    | o que mudou                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ✅ **Veiga Teixeira**                         | Sai a «Homenagem na Feira Nacional do Cavalo», que é da **Coudelaria Veiga** (Manuel Tavares Veiga, Quinta da Broa). A própria `historia` desta ficha nomeava a outra casa lá dentro — o parágrafo saiu com ela. Lista de prémios fica vazia.                                                                                                                                                                                                                                               |
| ✅ **Ortigão Costa**                          | Saem «Maior coudelaria privada de exportação internacional» e «Especialização única em cavalos pretos desde 1963». Um prémio é atribuído por alguém; um superlativo sobre si próprio não é. O «desde 1963» confirma-se e fica na `historia`.                                                                                                                                                                                                                                                |
| ✅ **Alter Real**                             | Sai «a coudelaria real mais antiga em funcionamento contínuo no mundo». Kladruby nad Labem tem carta imperial de **1579** (fundada em 1563) e está na UNESCO desde 2019 precisamente pela linhagem ininterrupta no mesmo sítio. E a própria `historia` regista a recuperação de 1942 a partir de **onze éguas e três garanhões** — «contínuo» é a parte que a casa contradiz a si mesma. Entra «a mais antiga coudelaria portuguesa em actividade», que é verdade e continua a ser notável. |
| ✅ **Flor do Lis**                            | O «43.º do ranking FEI» nunca bateu certo: é **56.º a 31 de Agosto de 2025**. Passa a levar data, e ao lado o facto que não envelhece — **é o Lusitano melhor classificado do ranking**.                                                                                                                                                                                                                                                                                                    |
| ✅ **Lusitanos d'Atela**                      | O Soberano passa a dizer que foi **criado por Guilherme Borba** e que a casa era a proprietária e ele o pai do Hercules d'Atela. Não se apaga: numa lista de prémios de uma coudelaria, um cavalo sem essa nota lê-se como criado por ela.                                                                                                                                                                                                                                                  |
| ✅ **Fundação Eugénio de Almeida** (inactiva) | GUIZO ganha a palavra que muda a leitura: **Espanha**. Cavaleiro espanhol, proprietário espanhol, equipa de Espanha; o papel da casa é o de **criador**. Sem isso, uma medalha olímpica numa lista portuguesa lê-se como uma medalha portuguesa.                                                                                                                                                                                                                                            |
| ✅ **Dressage Plus** (inactiva)               | Sai a lista inteira. O Zonik Plus não é Lusitano, o «7.º» estava velho, o «Hit Plus 35.º» não tem fonte — e o ranking FEI que estava a ser citado classifica **atletas**, não cavalos.                                                                                                                                                                                                                                                                                                      |

## Três que o relatório dava por infundadas e que se confirmaram

O `WebFetch` estava bloqueado quando os quatro relatórios foram escritos, e
«não encontrei fonte» ficou registado como «sem fonte». São coisas
diferentes. Com a busca a funcionar:

- **Campeador — Campeão dos Campeões, Bélgica 2013** (Santa Margarida).
  Confirmado: Festival Internacional do Puro-Sangue Lusitano, École
  d'Équitation de Gesves, 28–29 de Setembro de 2013. **Ganhou a data e o
  sítio**, que é o que torna um prémio verificável por quem o lê.
- **Spartacus — Reprodutor de Mérito** (Santa Margarida). Confirmado, e são
  **cinco estrelas**.
- **Gladiador do Lis** (Flor do Lis) existe e é da casa — o que estava errado
  era só o número.

**A lição:** apagar o que não se conseguiu confirmar teria tirado do portal
três factos verdadeiros. Onde a dúvida é sobre a _fonte_ e não sobre o _facto_,
confirma-se antes de cortar.

## Os «duplicados», e porque é que só um deles era um

Aplicado a 7 de Setembro de 2026, depois de confirmar cada caso. **Os dois pares
deram respostas diferentes, e nenhuma foi «fundir».**

### Jupiter Classical Dressage e Coudelaria Vila Viçosa — **não são duplicados**

Partilham o nome da herdade e mais nada. São duas empresas, dois donos e dois
conjuntos de contactos:

|          | Coudelaria Vila Viçosa                                               | Jupiter Classical Dressage                              |
| -------- | -------------------------------------------------------------------- | ------------------------------------------------------- |
| desde    | 1995                                                                 | sociedade constituída em 05/04/2022                     |
| quem     | Thomas e Michaela Kleba (ela veterinária), com Pedro e Luís Azeitona | Jürgen Grüneis e Alexander Wickl                        |
| morada   | Herdade do Ameal — Apartado 42, 7160-999 Vila Viçosa                 | Herdade do Ameal S/N 1, 7160-101 Ciladas, Vila Viçosa   |
| contacto | thomaskleba@magratex.pt · +351 917 212 823                           | contact@jupiterclassicaldressage.com · +351 915 408 866 |

E a Vila Viçosa **continua registada e a operar** sob os Kleba, com a morada
inscrita no registo da raça. Uma herdade de 600 hectares comporta duas
explorações. **Fundi-las apagaria o anúncio de um criador activo** — não se
tocou em nenhuma das duas.

Fica um defeito real, esse sim: as duas coordenadas apontam para o centro da
vila e não para a herdade, e são diferentes uma da outra apesar de o sítio ser
o mesmo. Sem uma coordenada da herdade, não se escreve uma.

### A casa d'Andrade — não eram dois registos, eram **três**

O `coudelaria-andrade` (inactivo) não é duplicado do `coudelaria-sa`: é o
**antepassado comum de pelo menos dois registos activos**.

A casa foi fundada em 1894 pelo Arq. Alfredo d'Andrade, desenvolvida a partir de
1901 por Ruy d'Andrade, herdada pelo Eng.º Fernando Sommer d'Andrade e, à morte
deste em 1991, **dividida pelos quatro filhos**. Neste directório estão dois
desses ramos: a **Coudelaria SA** é o de Maria d'Andrade de Oliveira e Sousa, na
Herdade da Agolada de Baixo, em Coruche; a **Herdade do Azinhal** é outro, em
Portalegre.

**Fundir a casa histórica num dos ramos daria a esse ramo títulos que foram
ganhos pela casa inteira, antes de existirem ramos** — e é o mesmo erro que se
acabou de corrigir no Alter Real, ao contrário. Por isso não se fundiu; disse-se
cada coisa pelo nome:

- O registo histórico passou a chamar-se **«Coudelaria d'Andrade (casa
  histórica, 1894–1991)»**, com um parágrafo final a dizer que existe para a
  história não ficar pendurada num só herdeiro, e a nomear os dois ramos que a
  continuam. Continua inactivo, logo invisível no site.
- A **Coudelaria SA** estava sem linhagem, sem ano e **sem prémio nenhum**, ao
  lado de um ramo irmão que tinha os três. Não era falta de herança — era falta
  de alguém lha escrever. Ganhou `ano_fundacao` 1894 (a manada passou por
  descendência directa, não é uma marca recomprada), as linhagens Andrade e
  Oliveira e Sousa, e dois prémios que **dizem de quem foram**.
- A **Herdade do Azinhal** já dizia tudo na história, mas os prémios não diziam
  que eram anteriores à divisão. Dois ramos a listar «Campeã Ibérica 1970» sem
  essa nota leem-se como dois ramos a disputar o mesmo título. Agora não.

## O `num_cavalos`

**O campo não está mal desenhado.** O formulário de registo pergunta «Número de
Cavalos (aproximado)» — o contrato é o efectivo inteiro. O que estava errado
eram **valores**, e o defeito não é cosmético: o directório tem uma ordenação
«Mais cavalos» construída em cima deste campo.

✅ **Casa Cadaval: 15 → 60.** O «15» era a conta das éguas. As fontes dão «cerca
de 60 animais, incluindo garanhões, éguas reprodutoras e poldros», e uma delas
70; ficou o número conservador, que é também o único descrito explicitamente
como o efectivo inteiro. Com «15», uma das mais antigas coudelarias da Península
Ibérica — 5.400 hectares, criação desde 1660 — aparecia no fundo da lista,
empatada com uma casa de férias equestres.

**Quatro que são a conta das éguas e ficam como estão**, porque nenhuma fonte
publica o efectivo total e um número inventado é pior do que um número em
baixo: Ortigão Costa (72 = 58 éguas PSL + 14 PSD, e a própria descrição o diz),
Luís Bastos (12 éguas), João Lynce (20 éguas), Pedro Passanha (30 éguas). São
**limites inferiores**, não erros — a descrição de cada uma já diz que são
éguas, que é mais preciso do que o número sozinho.

**E dois que se confirmaram certos** ao ser conferidos: Torres Vaz Freire tem 65
com 45 éguas (logo o 65 é o efectivo, não a eguada), e a Herdade do Azinhal tem
17, que é exactamente o «8 cavalos e uma manada de 9 éguas» da história dela.

## Fica por decidir, e precisa de uma pessoa

- **As coordenadas de Jupiter e Vila Viçosa** apontam as duas para o centro da
  vila. A herdade é a mesma; falta a coordenada dela.
- **O efectivo total de quatro casas** cujo `num_cavalos` é hoje a conta das
  éguas. Resolve-se com um telefonema a cada uma, não com uma busca.
- **O par de colunas que ninguém lê.** As quatro coordenadas corrigidas ficaram
  iguais nos dois pares. Faltam as outras: só depois de todas baterem certo é
  que `latitude`/`longitude` pode ser apagada em segurança.
