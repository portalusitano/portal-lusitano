# O que mudar nas coudelarias, por ordem de confiança

Resumo accionável dos quatro relatórios deste directório. **Nada aqui foi
escrito na base**, com uma excepção assinalada em baixo.

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
