# Verificação de coudelarias — lote 3

Confronto, campo a campo, entre o que a base afirma sobre nove coudelarias e o
que se consegue ler em fontes públicas. **Não se escreveu nada na base, não se
correu nenhuma migração e não se tocou em código.**

Cada facto leva uma de três etiquetas, e nunca outra:

| Etiqueta             | Quer dizer                                                                  |
| -------------------- | --------------------------------------------------------------------------- |
| **CONFIRMADO**       | Encontrou-se fonte pública que o diz. **Sempre com o URL.**                 |
| **DIVERGE**          | A fonte diz outra coisa. Vai o que a base diz, o que a fonte diz, e o URL.   |
| **NÃO CONFIRMADO**   | Não se achou fonte. Não quer dizer falso — quer dizer sem prova.            |

---

## Limite grave deste trabalho, dito à cabeça

**Não foi possível abrir uma única página.** O `WebFetch` está bloqueado pelo
proxy de saída deste ambiente para **todos** os domínios testados
(`coudelariasa.com`, `cavalo-lusitano.com`, `en.wikipedia.org`), com o erro
`EGRESS_BLOCKED`. A única ferramenta de rede que funciona é o motor de
pesquisa.

O que isto significa, na prática, e que muda a leitura de tudo o que se segue:

- **Não confirmei que nenhum site responde hoje**, nem que tem certificado
  válido, nem que é da coudelaria e não um domínio expirado. O que sei é que
  os URLs estão **indexados** pelo motor de pesquisa, com títulos coerentes
  com a coudelaria. Isso é indício de que o site existiu e foi rastreado; não
  é prova de que está de pé agora.
- **O que cito são excertos e resumos de resultados de pesquisa**, com o URL de
  onde vieram — não a página lida de ponta a ponta. Onde o excerto cita a
  página oficial da própria coudelaria, digo-o; onde vem de um directório ou
  de um agregador, digo-o também, porque não vale o mesmo.
- Por isso **nenhum campo abaixo está marcado CONFIRMADO com base numa leitura
  directa do site oficial**. Onde escrevo CONFIRMADO, é «a fonte citada
  afirma-o», e a fonte vai identificada para o dono poder pesar.

Isto é uma limitação do ambiente, não das coudelarias. **A verificação
definitiva das moradas e dos contactos exige abrir os sites**, e essa parte
fica por fazer.

---

## 1. Coudelaria SA — d'Andrade de Oliveira e Sousa

| Campo    | O que a base diz                              | Veredicto |
| -------- | --------------------------------------------- | --------- |
| Morada   | Herdade da Agolada de Baixo, 2100-047 Coruche | **CONFIRMADO** |
| Site     | coudelariasa.com                              | **CONFIRMADO** (indexado) |
| Telefone | +351 962 149 845                              | **CONFIRMADO** |
| Email    | AndradeHorses@gmail.com                       | **CONFIRMADO** |
| Fundação | *(vazio)*                                     | **NÃO CONFIRMADO** — ver nota |
| Coordenadas | 38.9583, -8.5333                           | **NÃO CONFIRMADO** |

**Morada, telefone e email** — a página de contactos do próprio site dá
exactamente «Coudelaria SA, Herdade da Agolada de Baixo, 2100-047 Coruche,
Portugal», telefone `(+351) 962149845` e email `AndradeHorses@gmail.com`.
Fonte: <https://coudelariasa.com/contactos/> e <https://coudelariasa.com/>.
Os três batem certo com a base, dígito a dígito.

**Site** — `coudelariasa.com` está indexado com várias páginas próprias
(`/contactos/`, `/ocavalodandrade/`, `/sorraias/`, `/o-cavalo-dandrade-eng/`),
o que é coerente com um site vivo e da coudelaria. Existe também um
`coudelariasa.wordpress.com` com o mesmo subtítulo («de Maria D'ANDRADE de
Oliveira e Sousa»), presumivelmente a versão antiga.
Fonte: <https://coudelariasa.com/>, <https://coudelariasa.wordpress.com/>

**Ano de fundação** — a base tem o campo vazio, e **é assim que deve ficar até
alguém decidir o que a palavra quer dizer aqui**, porque há três datas
distintas e nenhuma é «a fundação» sem qualificação:

- Ruy d'Andrade inicia o trabalho de criação **no princípio do século XX**;
- em **1991**, com a morte do Eng. Fernando Sommer d'Andrade, a coudelaria é
  **dividida pelos quatro filhos**;
- Maria d'Andrade de Oliveira e Sousa mantém desde então, na Herdade da
  Agolada de Baixo, as éguas e os cavalos que lhe couberam.

Fonte: <https://coudelariasa.com/ocavalodandrade/> e
<https://coudelariasa.com/>. **Escrever «1991» seria uma escolha editorial, não
um facto lido**: 1991 é a data da partilha, não a da fundação da casa
d'Andrade. Fica como pergunta ao dono (ver secção final).

**Coordenadas** — não se achou fonte para a posição do portão. A base tem
38.9583, -8.5333, que fica na zona de Coruche mas não se confirmou contra
nada. **Só se tem a morada postal, não a coordenada.**

---

## 2. Coudelaria Torres Vaz Freire

| Campo    | O que a base diz                                     | Veredicto |
| -------- | ---------------------------------------------------- | --------- |
| Morada   | Monte de Vila Formosa, Chança, 7440-201 Alter do Chão | **CONFIRMADO** |
| Site     | `http://vila-formosa.com`                            | **CONFIRMADO** que existe; **NÃO CONFIRMADO** o HTTPS |
| Telefone | +351 245 637 005                                     | **CONFIRMADO** (fonte fraca) — ver nota |
| Email    | coudelaria@vila-formosa.com                          | **CONFIRMADO** (fonte fraca) |
| Fundação | 1978                                                 | **CONFIRMADO** |
| Nº cavalos | 65                                                 | **DIVERGE** |
| Coordenadas | 39.2081, -7.7975                                  | **CONFIRMADO** |
| «propriedade familiar há mais de 200 anos» | —                  | **CONFIRMADO** |
| Éguas fundadoras Garça e Negaça | —                               | **CONFIRMADO** |

**Coordenadas — CONFIRMADO, e é a que está a ser mostrada.** Este era um dos
três pontos de atenção. Fontes de turismo dão para o Monte de Vila Formosa,
Chança, **39.208056, -7.7975** — que a **5 metros** é a coordenada que a base
mostra. A outra coordenada da base, a que fica a 2 km de Alter do Chão, é que
está errada: Chança é uma freguesia a **noroeste** da vila, e a distância de
~11,7 km entre a coordenada boa e o centro de Alter do Chão é a distância
real, não um erro.
Fontes: <https://www.visitalentejo.pt/en/catalogue/where-to-sleep/rural-tourism/casas-de-campo-de-vila-formosa/>,
<https://cm-alter-chao.pt/locais/casa-de-campo-monte-de-vila-formosa-country-house/>,
<https://www.guiadacidade.pt/en/alojamento-1180614-monte-de-vila-formosa>

**Recomendação: apagar a segunda coordenada, ficar com 39.2081, -7.7975.**

**Site** — o site existe e está indexado com estrutura própria em português,
inglês e espanhol (`/pt/coudelaria/introducao.html`,
`/pt/coudelaria/contactos.html`, `/eng/coudelaria/introducao.html`,
`/pt/turismo_rural/introducao.html`, `default_es.html`). **Todos os URLs
indexados são `http://`, nenhum `https://`.** Não consegui abrir o site, logo
**não confirmei se tem certificado**. O que a base tem (`http://`) é coerente
com o que está indexado.
Fontes: <http://vila-formosa.com/>, <http://www.vila-formosa.com/pt/coudelaria/contactos.html>

**Telefone e email** — o par `245 637 005` + `coudelaria@vila-formosa.com`
aparece associado à coudelaria numa lista telefónica local de Alter do Chão.
**É a fonte mais fraca deste relatório** e assinalo-o: é um directório, não a
página de contactos da casa. O prefixo `245` é o de Portalegre, o que é
coerente. Fonte: <https://o-boto.com/blog/paginas-amarelas-alter-do-chao>

Atenção: a mesma propriedade publica **outros contactos para outros fins** —
`+351 910 771 492` e `turismorural@vila-formosa.com` para o turismo rural,
e `914 223 898` / `934 059 157` noutras fichas. Não são contradições; são
linhas diferentes da mesma casa. Fontes:
<https://www.guiadacidade.pt/en/alojamento-1180614-monte-de-vila-formosa>,
<https://www.sabemais.pt/coudelariatorresvazfreire>,
<https://lusitanohorsefinder.com/rodrigo-moura-torres-on-fogoso-lusitano/>

**Fundação, história e éguas fundadoras — CONFIRMADO, e com detalhe a mais.**
«Em 1978 Marcos Torres Vaz Freire e o filho Carlos fundaram a coudelaria»;
«a propriedade está na família há mais de 200 anos»; começaram com cavalos de
Rio Frio e da marca de João Moura e com **duas éguas fundadoras, mãe e filha,
Garça e Negaça**, de que descendem hoje todos os cavalos da casa. Os três
factos da base estão certos.
Fontes: <http://www.vila-formosa.com/pt/coudelaria/introducao.html>,
<https://lusitanohorsefinder.com/rodrigo-moura-torres-on-fogoso-lusitano/>,
<https://www.equilifeworld.com/portraits/rodrigo-moura-torres-and-lusitano-stallion-fogoso/>

**Número de cavalos — DIVERGE.** A base diz **65 cavalos**. A fonte diz
**«45 éguas» e «cerca de 20 nascimentos por ano»**. Reparo, e digo-o só para
que ninguém o confunda com uma confirmação: 45 + 20 = 65. **É provável que
alguém tenha somado as duas coisas e escrito «65 cavalos»** — mas uma soma
minha não é uma fonte, e «45 éguas de criação» não é a mesma afirmação que
«65 cavalos». Fica DIVERGE, com a redacção da fonte ao lado.
Fonte: <https://lusitanohorsefinder.com/rodrigo-moura-torres-on-fogoso-lusitano/>

---

## 3. Coudelaria Veiga Teixeira

| Campo    | O que a base diz                        | Veredicto |
| -------- | --------------------------------------- | --------- |
| Morada   | N119 km 41.3, 2100 Coruche              | **NÃO CONFIRMADO** — ver nota |
| Site     | *(vazio)*                               | **CONFIRMADO** que não se achou nenhum |
| Telefone | +351 243 660 041                        | **CONFIRMADO** |
| Email    | aveigateixeira54@gmail.com              | **CONFIRMADO** |
| Fundação | 1886                                    | **CONFIRMADO** |
| «uma das mais antigas coudelarias de Lusitanos em Portugal» | — | **CONFIRMADO** |
| Coordenadas | 38.95, -8.525                        | **NÃO CONFIRMADO** |
| Prémio: «Homenagem na Feira Nacional do Cavalo — Golegã» | — | **DIVERGE — grave** |

**Prémio — DIVERGE, e é o erro mais sério deste lote.** A homenagem na Feira
Nacional do Cavalo da Golegã que as fontes registam é à **Coudelaria Veiga**,
com sede na **Quinta da Brôa, Azinhaga do Ribatejo**, fundada por **Rafael
José da Cunha** e hoje de **Manuel de Castro Tavares Veiga** — homenageada
pelo seu bicentenário. **É outra coudelaria, outra família e outro concelho.**
Nada nas fontes liga esta homenagem à Coudelaria **António da Veiga Teixeira**,
de Coruche.

Parecem-se no nome — «Veiga» — e é quase de certeza daí que veio a confusão.
Fontes: <https://correiodoribatejo.pt/coudelaria-veiga-homenageada-na-golega/>,
<https://www.equisport.pt/artigos/artigos-de-opiniao/consagracao-da-coudelaria-veiga/>,
<http://www.quintadabroa.com/coudelaria-veiga.html>,
<https://www.facebook.com/p/Coudelaria-Manuel-Tavares-Veiga-100064440353858/>

**Recomendação: apagar o prémio.** É uma afirmação sobre o trabalho de uma
família atribuída à família errada.

**Fundação 1886 e «uma das mais antigas» — CONFIRMADO.** «Coudelaria António
da Veiga Teixeira … cria cavalos Lusitanos desde 1886» e «é uma das mais
antigas coudelarias de Lusitanos em Portugal». A mesma fonte acrescenta que
exporta para o Brasil, Islândia, Noruega, Suécia, Alemanha, Holanda, Suíça,
Itália, França e Espanha.
Fonte: <https://www.lusitano-breeder.com/coudelaria-da-veiga-teixeira>

**Telefone e email — CONFIRMADO**, e o par bate certo: `243660041` com
`aveigateixeira54@gmail.com`, os dois na mesma ficha.
Fonte: <https://www.lusitano-breeder.com/coudelaria-da-veiga-teixeira>

**Morada — NÃO CONFIRMADO, e há duas moradas a circular.** A base tem
**N119 km 41.3, 2100 Coruche**. As fontes dão:

- **Rua da Beneficiência, nº 17, 2100-134 Coruche** — na mesma ficha do
  telefone e do email que batem certo com a base
  (<https://www.lusitano-breeder.com/coudelaria-da-veiga-teixeira>);
- **Rua da Misericórdia, nº 46, 2100-134 Coruche**, tel. `243 617 173`, numa
  ficha em nome de «António José da Veiga Teixeira, Herds.»
  (<https://www.equisport.pt/contactos-equestres/49415/49415/>).

Nenhuma fonte diz «N119 km 41.3». **Não digo que a morada da base está errada**
— é normal uma casa destas ter escritório na vila e a coudelaria na estrada, e
a `N119` atravessa mesmo Coruche. Digo que **não a confirmei**, e que há duas
moradas de rua em circulação que a base não tem. Existe, aliás, uma «Estação
Experimental António Teixeira» sinalizada na N119 em Coruche
(<https://www.waze.com/live-map/directions/pt/santarem/coruche/estacao-experimental-antonio-teixeira>),
que pode ou não ser o mesmo sítio — não o consegui apurar.

**Coordenadas — NÃO CONFIRMADO.** A base tem 38.95, -8.525, que fica a **~0,6 km
do centro de Coruche** — ou seja, é a vila, não o km 41.3 da N119. Não achei
fonte para a posição do portão. **Só tenho a vila.**

**Site** — a base não tem site, e não achei nenhum. A presença online é uma
página de Facebook (<https://www.facebook.com/coudelariaveigateixeira/>) e
fichas em directórios. **O campo vazio está certo.**

---

## 4. Coudelaria Vila Viçosa

| Campo    | O que a base diz                                   | Veredicto |
| -------- | -------------------------------------------------- | --------- |
| Morada   | Vila Viçosa, Alentejo                              | **DIVERGE** — há morada mais precisa |
| Site     | `lusitanohorsefinder.com/breeder-site-…`            | **DIVERGE** — não é site próprio |
| Telefone | +351 917 212 823                                   | **NÃO CONFIRMADO** |
| Email    | thomaskleba@magratex.pt                            | **CONFIRMADO** |
| Fundação | 1995                                               | **CONFIRMADO** |
| Nº cavalos | 40                                               | **NÃO CONFIRMADO** |
| Coordenadas | 38.7833, -7.4167                                | **DIVERGE** |
| Casal Thomas e Michaela Kleba | —                                | **CONFIRMADO** |
| Prémio: «Melhor Criador de Portugal (múltiplas vezes)» | —        | **NÃO CONFIRMADO** |

**Fundação e casal fundador — CONFIRMADO.** «Coudelaria Vila Viçosa … fundada
em 1995 pelo casal Thomas e Michaela Kleba», sendo Michaela veterinária.
Fonte: <https://lusitanohorsefinder.com/breeder-site-coudelaria-vila-vicosa-homepage/>,
<http://www.lusitanohorsefinder.com/coudelaria-vila-vicosa/>

**Site — DIVERGE, e a base tem razão em desconfiar.** **Não se achou domínio
próprio.** As páginas em `lusitanohorsefinder.com` são, pelo nome do próprio
URL (`breeder-site-…-homepage`, `breeder-site-…-stud-review-page`), um
**perfil alojado num portal comercial de anúncios**, não o site da coudelaria.
A única outra presença é uma página de Facebook
(<https://www.facebook.com/Coudelaria-Vila-Vi%C3%A7osa-334137076669987/>).

**Isto tem uma consequência que quero deixar clara:** quase tudo o que a base
afirma sobre esta coudelaria vem de uma página de marketing feita para vender
os cavalos dela. Não é uma fonte independente.

**Email — CONFIRMADO, e não é um erro de escrita.** `thomaskleba@magratex.pt`
parece estranho, e não é: **Thomas Kleba é o administrador da Magratex**,
empresa de mármores e granitos com pedreiras em Estremoz e Vila Viçosa.
O domínio é dele.
Fontes: <https://magratex.pt/historia/>,
<https://www.racius.com/magratex-marmores-e-granitos-para-exportacao-unipessoal-limitada/>,
<https://rr.pt/2020/11/19/economia/derrocada-em-borba-dois-anos-depois-empresario-dos-marmores-fala-em-situacoes-incompreensiveis/noticia/215378/>

**Morada — DIVERGE.** A base tem só «Vila Viçosa». A fonte dá
**Herdade do Ameal — Apartado 42, 7160-999 Vila Viçosa**.
Fonte: <http://www.lusitanohorsefinder.com/coudelaria-vila-vicosa/>

**Coordenadas — DIVERGE.** A base tem 38.7833, -7.4167, que fica a **0,4 km do
centro de Vila Viçosa**: é a vila, não a coudelaria. A fonte diz que a herdade
fica **«a 3 milhas» (≈4,8 km) da vila**. **A coordenada da base é o centro da
vila e não o portão.** Não achei coordenada para a Herdade do Ameal, logo não
proponho substituta — **só sei que a que lá está não é a coudelaria**.
Fonte: <https://lusitanohorsefinder.com/breeder-site-coudelaria-vila-vicosa-homepage/>

**Nº de cavalos — NÃO CONFIRMADO.** A base diz 40. A fonte só diz que a
coudelaria tem **«6 garanhões reprodutores»** e descreve a equipa (o casal
Kleba, os profissionais Pedro e Luís Azeitona, três tratadores e um ferrador).
Nenhum total.
Fonte: <http://www.lusitanohorsefinder.com/coudelaria-vila-vicosa/>

**Prémio «Melhor Criador de Portugal (múltiplas vezes)» — NÃO CONFIRMADO.**
A afirmação existe, mas **só na página de marketing da própria coudelaria**
(«the stud has achieved 'best breeder' status in Portugal more than once»).
Não achei registo em fonte independente — nem na APSL, nem em imprensa. **Não
o classifico como falso; classifico-o como não confirmado por fonte
independente**, que é coisa diferente e é o que se sabe.
Fonte da afirmação: <https://lusitanohorsefinder.com/breeder-site-coudelaria-vila-vicosa-stud-review-page/>

Nota: a base diz «Melhor Criador **de Portugal**», e a fonte diz apenas
«'best breeder' status in Portugal». Se existir prémio com nome oficial, tem
nome, ano e entidade — e nenhum dos três se achou.

---

## 5. Herdade da Malhadinha Nova

| Campo    | O que a base diz                            | Veredicto |
| -------- | ------------------------------------------- | --------- |
| Morada   | Albernoa, 7800-601 Beja                     | **CONFIRMADO** |
| Site     | malhadinhanova.pt                           | **CONFIRMADO** (indexado) |
| Telefone | +351 284 965 432                            | **CONFIRMADO**, com ressalva |
| Email    | reservas@malhadinhanova.pt                  | **CONFIRMADO** |
| Coudelaria fundada em 2008                  | —             | **CONFIRMADO** |
| Nº cavalos | 32                                        | **CONFIRMADO** |
| Coordenadas | 37.9109, -7.8947                         | **DIVERGE — grave** |
| Prémio: «Wine Tourism Award 2023»           | —             | **CONFIRMADO** |
| Prémio: «Relais & Châteaux»                 | —             | **CONFIRMADO** |
| Prémio: «Best Luxury Rural Hotel»           | —             | **NÃO CONFIRMADO** |

**Coordenadas — DIVERGE, e este era o segundo ponto de atenção.** A base mostra
**37.9109, -7.8947**. Duas fontes independentes dão para a herdade
**37.8306963, -7.9891634** (Apple Maps) e **37° 49′ 50,60″ N, 7° 59′ 20,91″ W**
(= 37,8307, -7,9892). São a mesma coordenada, e estão a **12,2 km** da que a
base mostra. **A coordenada da base está errada** — cai ~12 km a nordeste da
herdade.
Fontes: <https://maps.apple.com/place?address=Herdade+da+Malhadinha+Nova%2C+7800-601+Albernoa%2C+Portugal&coordinate=37.8306963%2C-7.9891634>,
<https://cm-beja.pt/pt/2525/herdade-da-malhadinha-nova.aspx>,
<https://mapcarta.com/30935736>

**Recomendação: ficar com ~37.8307, -7.9892 e apagar a outra.**

**Coudelaria em 2008 e 32 cavalos — CONFIRMADO, e a distinção que a base faz
está certa.** A página da coudelaria no site oficial diz que **a criação de
Puro-Sangue Lusitano e a coudelaria começaram em 2008**, com a marca HMN, e
que **hoje são 32 cavalos**. A base separa bem a data da coudelaria da data da
herdade, e faz bem: a propriedade (744 hectares) é anterior.
Fonte: <https://www.malhadinhanova.pt/pt/coudelaria/sobre-a-coudelaria/>

**Prémio «Wine Tourism Award 2023» — CONFIRMADO.** Em 2023 a Malhadinha Nova
foi distinguida como **Melhor Enoturismo de Portugal**, em votação com mais de
250 jurados (jornalistas de vinho e turismo, entidades oficiais, chefes,
escanções e associados da APENO); e voltou a ganhar o **Prémio Nacional de
Enoturismo**. O nome exacto do galardão não é literalmente «Wine Tourism Award
2023», mas o prémio de 2023 existe e é este.
Fontes: <https://www.malhadinhanova.pt/en/press/Estate-in-Alentejo-elected-for-the-second-time-Best-Wine-Tourism-in-Portugal/922/>,
<https://www.malhadinhanova.pt/en/press/Malhadinha-Nova-wins-the-National-Wine-Tourism-Award-again/915/>

**Prémio «Relais & Châteaux» — CONFIRMADO**, com uma precisão: não é um
prémio, é uma **adesão**, e é de **2020**. A casa tem página própria sobre
isso e está listada no directório da Relais & Châteaux.
Fontes: <https://www.malhadinhanova.pt/pt/malhadinha/relais-chateaux/>,
<https://www.relaischateaux.com/us/hotel/herdade-da-malhadinha-nova/>

**Prémio «Best Luxury Rural Hotel» — NÃO CONFIRMADO.** Não achei nenhum
galardão com este nome. O que achei de próximo, e que **não é o mesmo**: chave
Platina no guia *Boa Cama Boa Mesa* de 2022 e 2023, e uma distinção de
«Melhor Hospitalidade». Se o prémio existir, tem entidade e ano — e não os
achei.

**Telefone — CONFIRMADO, com ressalva.** `+351 284 965 432` é mesmo da casa,
mas as fontes atribuem-no ao **restaurante**; a adega aparece com
`284 965 210` e a Câmara de Beja publica `284 965 211`. Não é um erro — é
uma linha entre várias. Vale a pena o dono confirmar qual quer mostrar como
contacto geral.
Fontes: <https://www.malhadinhanova.pt/pt/contactos/>,
<https://cm-beja.pt/pt/2525/herdade-da-malhadinha-nova.aspx>

**Email — CONFIRMADO.** `reservas@malhadinhanova.pt` consta como o endereço de
reservas. Fonte: <https://www.malhadinhanova.pt/pt/contactos/>

---

## 6. Jupiter Classical Dressage

| Campo    | O que a base diz                       | Veredicto |
| -------- | -------------------------------------- | --------- |
| Morada   | Vila Viçosa, Alentejo                  | **DIVERGE** — há morada completa |
| Site     | jupiterclassicaldressage.com           | **CONFIRMADO** (indexado) |
| Telefone | +351 915 408 866                       | **CONFIRMADO** |
| Fundação | 2022                                   | **CONFIRMADO** |
| Nº cavalos | 80                                   | **NÃO CONFIRMADO** |
| Coordenadas | 38.775, -7.425                      | **DIVERGE** |

**Morada — DIVERGE.** A base tem só «Vila Viçosa». O site dá
**Herdade do Ameal, S/N 1, 7160-101 Ciladas, Vila Viçosa**. Ciladas é uma das
quatro freguesias do concelho.
Fonte: <https://jupiterclassicaldressage.com/en/contact/>

**Telefone e fundação — CONFIRMADO.** `+351 915408866` (e, em alternativa,
`+43 664 1064824`, austríaco), email `contact@jupiterclassicaldressage.com`;
«desde 2022, a Jupiter Classical Dressage combina tradição de criação com uma
filosofia moderna».
Fontes: <https://jupiterclassicaldressage.com/en/contact/>,
<https://jupiterclassicaldressage.com/en/>

**Nº de cavalos — NÃO CONFIRMADO, e a desconfiança era justificada.** A base
diz **80 cavalos**. O site fala em **mais de 600 hectares** e em
**32 boxes** na coudelaria. **Nenhuma fonte dá um total de cavalos**, e muito
menos 80. Repare-se que 80 é **dois cavalos e meio por box**.
Fonte: <https://jupiterclassicaldressage.com/en/the-stud-farm/>

**Coordenadas — DIVERGE.** A base tem 38.775, -7.425, que fica a **0,95 km do
centro de Vila Viçosa** — é a vila, não a Herdade do Ameal em Ciladas. Não
achei coordenada para a herdade, logo não proponho substituta.

### Um achado que o dono tem de ver: Jupiter e Coudelaria Vila Viçosa partilham morada

As duas fichas da base (nº 4 e nº 6) apontam para o **mesmo sítio**:

| | Morada nas fontes |
| --- | --- |
| Coudelaria Vila Viçosa (Kleba, 1995) | **Herdade do Ameal** — Apartado 42, 7160-999 Vila Viçosa |
| Jupiter Classical Dressage (2022) | **Herdade do Ameal**, S/N 1, 7160-101 Ciladas, Vila Viçosa |

Fontes: <http://www.lusitanohorsefinder.com/coudelaria-vila-vicosa/> e
<https://jupiterclassicaldressage.com/en/contact/>

**Não afirmo que uma sucedeu à outra** — procurei-o e não achei nenhuma fonte
que descreva a transição, uma venda ou uma continuidade. Mas a coincidência de
herdade explicaria de uma penada duas coisas que sozinhas não fecham: uma casa
«fundada em 2022» com um efectivo grande, e um criador de 1995 sem site
próprio e cujo perfil só sobrevive num portal de anúncios. **É a primeira
pergunta a fazer ao dono do site**, porque se for isso, a base pode ter a
mesma coudelaria contada duas vezes, com duas datas de fundação e duas
coordenadas a 1,2 km uma da outra.

---

## 7. Lusitanos d'Atela — Coudelaria Bessa de Carvalho

| Campo    | O que a base diz                          | Veredicto |
| -------- | ----------------------------------------- | --------- |
| Morada   | Casalinho, Alpiarça, Ribatejo             | **CONFIRMADO**, incompleta |
| Site     | lusitanosdatela.com                       | **CONFIRMADO** (indexado) |
| Telefone | +351 966 433 502                          | **CONFIRMADO** |
| Fundação | 1989                                      | **DIVERGE** |
| Coordenadas | 39.2377, -8.5648                       | **NÃO CONFIRMADO** |
| Francisco Bessa de Carvalho, Mestre-Picador da EPAE | —       | **CONFIRMADO** (fonte fraca) |

**Morada e telefone — CONFIRMADO.** `+351 966 433 502`, e a morada completa é
**Rua António Pais da Costa Júnior, nº 23, Paul d'Atela, 2090-209 Casalinho,
Alpiarça**. A base tem só «Casalinho, Alpiarça» — está certo, mas falta a rua
e o número. Email de contacto nas fontes: `anabessacarvalho@hotmail.com`.
Fontes: <https://www.visitribatejo.pt/en/catalogue/what-to-do/tourist-activities/lusitanos-d-atela/>,
<https://www.visitportugal.com/en/content/lusitanos-datela-coudelaria-bessa-de-carvalho>

**Fundação — DIVERGE.** A base diz **1989**. As fontes de turismo oficial
dizem **1988**, por Francisco Bessa de Carvalho. É um ano de diferença, e não
sei qual está certo: pode ser a diferença entre constituir a casa e registar a
marca. **Marco DIVERGE porque a fonte diz outra coisa**, não porque a base
esteja necessariamente errada.
Fontes: <https://www.visitribatejo.pt/en/catalogue/what-to-do/tourist-activities/lusitanos-d-atela/>,
<https://www.visitportugal.com/en/content/lusitanos-datela-coudelaria-bessa-de-carvalho>

**Coordenadas — NÃO CONFIRMADO.** 39.2377, -8.5648 fica a ~2,6 km do centro de
Alpiarça, o que é plausível para o Casalinho, mas **não achei fonte para o
portão**. **Só tenho a localidade.**

**«Mestre-Picador da Escola Portuguesa de Arte Equestre» — CONFIRMADO, com
fonte fraca.** Duas fontes descrevem-no como picador/mestre-picador da EPAE e
como juiz da raça. **Não achei confirmação no site da própria Escola**
(parquesdesintra.pt), que seria a fonte primária. Fica confirmado por fontes
secundárias.
Fontes: <http://sitiodocavalo.blogspot.com/2010/11/francisco-bessa-de-carvalho.html>,
<https://tlhd.com.br/programas/arquivo/francisco-bessa-de-carvalho>

### Os prémios, um a um

Contexto útil, e favorável à casa: uma fonte oficial de turismo resume que a
coudelaria tem cavalos em **5 continentes**, **113 medalhas** em modelo e
andamentos e **2 cavalos em WEG**.
Fonte: <https://www.visitribatejo.pt/en/catalogue/what-to-do/tourist-activities/lusitanos-d-atela/>

**«Soberano — WEG Caen 2014 com Carlos Pinto (68.800% GP, melhor resultado
português)» — o resultado é CONFIRMADO; a atribuição à coudelaria DIVERGE.**

O resultado é exacto: Carlos Pinto e **Soberano III** competiram pela equipa
portuguesa no **WEG 2014, em Caen**, e fizeram **68,800% no Grand Prix**,
**47.º** individual. E foi mesmo o **melhor resultado da equipa portuguesa** —
di-lo o site do próprio cavaleiro. Os três números da base estão certos.
Fontes: <https://en.wikipedia.org/wiki/Individual_dressage_at_the_2014_FEI_World_Equestrian_Games>,
<https://www.pole-equestre-carlos-pinto.com/depart-a-retraite-de-soberano/>,
<https://www.eurodressage.com/2025/09/12/carlos-pintos-soberano-passed-away>

**Mas Soberano III não foi criado por esta coudelaria.** É um garanhão nascido
em **1999**, filho de Hostil e Nobreza, **criado por Guilherme Borba**. Repare-se
que é o único da lista **sem o sufixo «d'Atela»** — os outros três têm-no.
Fonte: <https://www.eurodressage.com/2025/09/12/carlos-pintos-soberano-passed-away>

A ligação real, e é boa, é outra: **Soberano III é o pai de Hercules d'Atela**,
e a mesma fonte chama-lhe «a sua descendência mais famosa». Ou seja, a casa tem
aqui uma linhagem de que se pode gabar — **mas «Soberano no WEG 2014» não é um
prémio da coudelaria**, é o resultado de um cavalo de outro criador.

**Recomendação: retirar da lista de prémios, ou reescrever como o que é —
«Soberano III, pai do nosso Hercules d'Atela, foi o melhor resultado português
no WEG 2014».** A segunda versão é verdadeira e continua a ser um bom
argumento.

**«Xenofonte d'Atela — WEG Tryon 2018 com Miguel Ralão Duarte» — CONFIRMADO.**
Xenofonte d'Atela, garanhão Lusitano de 15 anos, montado por Miguel Ralão
Duarte pela equipa portuguesa no **WEG 2018 em Tryon** (12–15 de Setembro):
**54.º** individual, **12.º** por equipas. O cavalo tem ficha própria na FEI.
No ano seguinte a dupla ganhou o Grand Prix da Taça do Rei, CDI3*, em Madrid.
Fontes: <https://www.fei.org/horse/104PV85>,
<http://www.eurodressage.com/2018/08/10/portuguese-team-2018-world-equestrian-games-selected>,
<https://dressage-news.com/2019/03/22/portugals-miguel-ralao-duarte-xenofonte-datela-win-madrids-kings-cup-cdi3-grand-prix/>

Nota menor: o proprietário registado é Ana Paula Lemos Figueiredo. Isso não
belisca a afirmação, que é de **criação** — é o sufixo «d'Atela» que a
sustenta.

**«Hercules d'Atela — Campeão Europeu de Criação Lusitana 2016 (Neu Anspach)»
— CONFIRMADO, incluindo o local.** Em 2016 Hercules d'Atela ganhou o título e
a medalha de ouro no **Campeonato Europeu de Criação do Lusitano**, na
Alemanha, e uma segunda fonte nomeia o sítio: **«European Lusitano Champion of
Champions in Neu Anspach, Germany»**. Foi também campeão e medalha de ouro no
seu escalão no Festival Internacional do Lusitano de 2015 e 2016. Foi depois
vendido à Vila de Sagres e recebeu recomendação 4* do livro genealógico
português.
Fontes: <https://www.eurodressage.com/2021/04/01/hercules-datela-receives-4-recommendation-portuguese-lusitano-studbook>,
<https://www.eurodressage.com/2021/09/01/vila-de-sagres-hercules-datela-nr-1-portuguese-medium-tour-ranking-ready-cdi-grote>,
<https://www.eurodressage.com/2025/09/12/carlos-pintos-soberano-passed-away>

**«Lenda d'Atela — Égua de Ouro ExpoÉgua Nacional 2018» — CONFIRMADO.**
Lenda d'Atela, potra Lusitana de 3 anos **criada por Francisco Bessa de
Carvalho** e propriedade de **Lusitanos d'Atela Lda**, foi eleita **Égua de
Ouro na ExpoÉgua Nacional 2018**, na Golegã, entre 17 e 20 de Maio.
Imprensa regional, duas fontes independentes.
Fontes: <https://radiohertz.pt/golega-lenda-datela-e-horta-do-loyal-vencem-expoegua-2018/>,
<https://www.mediotejo.net/golega-lenda-datela-e-horta-do-loyal-vencem-expoegua-2018/>

**Balanço dos prémios desta casa: três em quatro confirmam-se com fontes
independentes, e com detalhe.** É, de longe, a lista mais bem sustentada do
lote. O único problema é o primeiro, e é de atribuição, não de invenção.

---

## 8. Monte Velho Equo Resort

| Campo    | O que a base diz          | Veredicto |
| -------- | ------------------------- | --------- |
| Morada   | Arraiolos, Alentejo       | **DIVERGE** — há morada completa |
| Site     | montevelho.pt             | **CONFIRMADO** (indexado) |
| Telefone | +351 912 371 837          | **CONFIRMADO** |
| Fundação | 1994                      | **CONFIRMADO** |
| Nº cavalos | 35                      | **NÃO CONFIRMADO** |
| Coordenadas | 38.7167, -7.9833       | **DIVERGE** |

**Telefone — CONFIRMADO.** `+351 912 371 837`, com email
`reservas@montevelho.pt` e site `www.montevelho.pt`.
Fonte: <https://www.visitalentejo.pt/en/catalogue/where-to-sleep/rural-tourism/monte-velho-equo-resort/>

**Fundação 1994 — CONFIRMADO.** «A coudelaria Monte Velho cria cavalos
Lusitanos desde 1994», por **Diogo Lima Mayer**, que começou com **quatro
éguas Alter Real e o garanhão Xaquiro**. A vocação turística é posterior —
nasceu do repensar da propriedade depois da crise de 2008.
Fontes: <http://worksofchivalry.com/the-adventure-of-monte-velho-the-equestrian-paradise-of-lusitano-horses/>,
<https://lusitanohorsefinder.com/monte-velho-eco-riding-resort/>

**Morada — DIVERGE.** A base tem só «Arraiolos». A morada é
**Herdade do Monte Velho, Santana do Campo, 7040-130 Arraiolos** — Santana do
Campo é uma freguesia do concelho, e a herdade fica **a 7 km da vila**.
Fonte: <https://www.visitalentejo.pt/en/catalogue/where-to-sleep/rural-tourism/monte-velho-equo-resort/>,
<https://www.secretplaces.com/arraiolos-boutique-hotels/monte-velho-equo-resort>

**Coordenadas — DIVERGE.** A base tem 38.7167, -7.9833, que fica a **0,8 km do
centro de Arraiolos**: outra vez a vila, não a herdade. O turismo do Alentejo
dá **38.7754907, -8.0287528**, a **7,6 km** da coordenada da base — e essa
distância bate certo com o «7 km de Arraiolos» que as fontes descrevem, o que
é uma boa verificação cruzada.
Fonte: <https://www.visitalentejo.pt/en/catalogue/where-to-sleep/rural-tourism/monte-velho-equo-resort/>

**Recomendação: 38.7755, -8.0288.**

**Nº de cavalos — NÃO CONFIRMADO.** A base diz 35. Nenhuma fonte dá um total.
O que as fontes dizem é qualitativo: criação orientada para a dressage, e
**quatro vezes «Campeão dos Campeões» em andamentos da raça Lusitana** — um
prémio que, note-se, **a base não regista** e que parece bem sustentado.
Fonte: <https://lusitanohorsefinder.com/monte-velho-eco-riding-resort/>

---

## 9. Morgado Lusitano

| Campo    | O que a base diz                                                | Veredicto |
| -------- | --------------------------------------------------------------- | --------- |
| Morada   | Quinta da Portela, Cabeço da Rosa, EN 116, 2615-365 Alverca      | **CONFIRMADO** |
| Site     | morgadolusitano.pt                                              | **CONFIRMADO** (indexado) |
| Telefone | +351 939 936 522                                                | **DIVERGE** |
| Fundação | *(vazio)*                                                       | **NÃO CONFIRMADO** |
| Nº cavalos | 15                                                            | **NÃO CONFIRMADO** |
| Coordenadas | 38.8863, -9.0417                                             | **DIVERGE** |
| História (séc. XVIII, Marquês de Castelo Melhor, Conde da Ribeira Grande) | — | **CONFIRMADO** |

**Morada — CONFIRMADO, palavra por palavra.** «Quinta da Portela, Cabeço da
Rosa — EN 116, 2615-365 Alverca do Ribatejo». É o campo mais bem escrito de
todo o lote.
Fonte: <https://www.cm-vfxira.pt/saber-lazer/informacao-turistica/onde-ficar/poi/casa-das-arcadas-do-morgado-lusitano>

**História — CONFIRMADO.** «A Quinta da Portela, datada do século XVIII, foi
mandada erguer pelo Marquês de Castelo Melhor, Conde da Ribeira Grande, grande
proprietário na região.» A frase da base bate certo com a da Câmara Municipal
de Vila Franca de Xira, que é fonte municipal.
Fontes: <https://www.cm-vfxira.pt/saber-lazer/informacao-turistica/onde-ficar/poi/casa-das-arcadas-do-morgado-lusitano>,
<https://www.rhlt.pt/en/portfolio/morgado-lusitano-en/>

**Telefone — DIVERGE.** A base diz **+351 939 936 522**. As fontes dão
**219 936 520** e **219 936 529**, com email `info@morgadolusitano.pt`.

Vale a pena olhar para os dígitos lado a lado:

```
base   9 3 9   9 3 6   5 2 2
fonte  2 1 9   9 3 6   5 2 0
```

Os seis dígitos do meio são iguais e o último difere por um. **Parece um erro
de transcrição do número fixo, não um telemóvel a mais** — mas não o posso
provar, e é possível que exista mesmo um telemóvel. De qualquer forma, **um
telefone errado é das coisas que mais engana quem liga**, e este é o campo
deste lote que mais depressa deve ser confirmado com a casa.
Fonte: <https://www.cm-vfxira.pt/saber-lazer/arte-equestre/centros-equestres/poi/centro-equestre-do-morgado-lusitano>

**Coordenadas — DIVERGE.** A base tem 38.8863, -9.0417. A Câmara de Vila
Franca de Xira publica **38° 54′ 16,67″ N, 9° 04′ 12,79″ W** (= 38,9046,
-9,0702), a **3,2 km** de distância. Não é um erro tão grosseiro como o da
Malhadinha, mas 3 km chegam para mandar alguém para o sítio errado.
Fonte: <https://www.cm-vfxira.pt/saber-lazer/informacao-turistica/arte-equestre/centros-equestres/poi/centro-equestre-do-morgado-lusitano>

**Recomendação: 38.9046, -9.0702.**

**Ano de fundação — NÃO CONFIRMADO.** A base tem o campo vazio. O que se acha é
que a sociedade **«Morgado Lusitano, Turismo Rural, Lda» foi constituída em
31 de Março de 2003** — mas isso é a data da empresa de turismo, **não a da
coudelaria nem a da quinta** (séc. XVIII). **Não sugiro preencher com 2003**:
seria escrever uma data que responde a outra pergunta.
Fonte: <https://www.racius.com/morgado-lusitano-turismo-rural-lda/>

**Nº de cavalos — NÃO CONFIRMADO.** A base diz 15. Nenhuma fonte dá número. As
fontes descrevem instalações (escola de equitação, picadeiros coberto e
descoberto, boxes, bar) mas não efectivo.

---

# O que está errado e deve ser corrigido

Por ordem de gravidade — primeiro o que engana quem usa o site.

### A. Manda alguém para o sítio errado

1. **Malhadinha Nova — coordenada errada por 12,2 km.** A base mostra
   37.9109, -7.8947; a herdade está em **37.8307, -7.9892**. Corrigir e apagar
   a segunda coordenada.
   <https://cm-beja.pt/pt/2525/herdade-da-malhadinha-nova.aspx>
2. **Monte Velho — coordenada errada por 7,6 km.** A base mostra o centro de
   Arraiolos (38.7167, -7.9833); a herdade está em **38.7755, -8.0288**, a 7 km
   da vila.
   <https://www.visitalentejo.pt/en/catalogue/where-to-sleep/rural-tourism/monte-velho-equo-resort/>
3. **Morgado Lusitano — coordenada errada por 3,2 km.** Correcta:
   **38.9046, -9.0702**.
   <https://www.cm-vfxira.pt/saber-lazer/informacao-turistica/arte-equestre/centros-equestres/poi/centro-equestre-do-morgado-lusitano>
4. **Morgado Lusitano — telefone provavelmente errado.** Base
   `+351 939 936 522`; fonte municipal `219 936 520` / `219 936 529`. Confirmar
   com a casa antes de mudar.
5. **Coudelaria Vila Viçosa e Jupiter — coordenadas são o centro da vila.**
   As duas apontam para dentro de Vila Viçosa (a 0,4 km e a 0,95 km do centro),
   mas as duas moradas reais são a **Herdade do Ameal**, fora da vila (≈5 km).
   Não tenho substituta; **o que se sabe é que as que lá estão não são o
   portão de nenhuma das duas**.

### B. Mente sobre o trabalho de alguém

6. **Veiga Teixeira — o prémio está atribuído à família errada.** A «Homenagem
   na Feira Nacional do Cavalo — Golegã» é da **Coudelaria Veiga** (Manuel
   Tavares Veiga, Quinta da Brôa, Azinhaga), homenageada pelo bicentenário —
   não da Coudelaria **Veiga Teixeira**, de Coruche. **Apagar.**
   <https://correiodoribatejo.pt/coudelaria-veiga-homenageada-na-golega/>
7. **Lusitanos d'Atela — «Soberano, WEG Caen 2014» não é um prémio desta
   coudelaria.** O resultado é verdadeiro em todos os números, mas
   **Soberano III foi criado por Guilherme Borba**. A ligação real é que é o
   **pai de Hercules d'Atela**. Retirar da lista de prémios ou reescrever
   como linhagem.
   <https://www.eurodressage.com/2025/09/12/carlos-pintos-soberano-passed-away>

### C. Diz menos do que se sabe, ou diz mal

8. **Coudelaria Vila Viçosa — o «site» não é um site.** É um perfil num portal
   comercial de anúncios (`lusitanohorsefinder.com/breeder-site-…`). **Não se
   achou domínio próprio.** Mostrá-lo como site oficial induz em erro.
9. **Torres Vaz Freire — «65 cavalos» não é o que a fonte diz.** A fonte diz
   **45 éguas** e **~20 nascimentos por ano**.
10. **Jupiter — «80 cavalos» não tem fonte**, e é um número alto para uma casa
    com **32 boxes**, fundada em 2022.
11. **Lusitanos d'Atela — fundação 1988 nas fontes, 1989 na base.**
    <https://www.visitribatejo.pt/en/catalogue/what-to-do/tourist-activities/lusitanos-d-atela/>
12. **Moradas incompletas** (não estão erradas — falta-lhes o essencial para
    chegar lá):
    - Jupiter: **Herdade do Ameal, S/N 1, 7160-101 Ciladas, Vila Viçosa**
    - Monte Velho: **Herdade do Monte Velho, Santana do Campo, 7040-130 Arraiolos**
    - Vila Viçosa: **Herdade do Ameal, Apartado 42, 7160-999 Vila Viçosa**
    - d'Atela: **Rua António Pais da Costa Júnior, 23, Paul d'Atela, 2090-209 Casalinho, Alpiarça**
13. **Malhadinha — «Relais & Châteaux» está na lista de prémios e não é um
    prémio**, é uma adesão, de 2020. Verdadeiro, mas mal arrumado.

### D. O que está bem, e vale a pena não estragar

- **Torres Vaz Freire, coordenada:** a que está a ser mostrada
  (39.2081, -7.7975) **está certa a 5 metros**. É a *outra*, a 2 km de Alter do
  Chão, que deve ser apagada. Chança fica mesmo a ~12 km da vila.
- **Morgado Lusitano, morada e história:** confirmadas palavra por palavra
  contra a Câmara Municipal.
- **Malhadinha, «coudelaria fundada em 2008» e 32 cavalos:** confirmados no
  site oficial, e a distinção entre a data da coudelaria e a da herdade está
  bem feita.
- **d'Atela, três dos quatro prémios:** Xenofonte (WEG Tryon 2018), Hercules
  (Campeão Europeu 2016, Neu Anspach — o local também se confirma) e Lenda
  (Égua de Ouro ExpoÉgua 2018) confirmam-se em fontes internacionais e de
  imprensa independentes.
- **Coudelaria SA:** morada, telefone e email batem certo com a página de
  contactos do próprio site.

---

# O que não consegui confirmar — perguntar ao dono

Nada disto é erro conhecido. É informação que falta, e que só a coudelaria ou
uma leitura directa dos sites resolve.

**Primeiro, porque muda o resto:**

1. **Jupiter Classical Dressage e Coudelaria Vila Viçosa são a mesma
   propriedade?** As duas dão como morada a **Herdade do Ameal**, em Vila
   Viçosa. Se houve sucessão, a base pode ter a mesma casa duas vezes, com
   duas datas de fundação e duas coordenadas. Não achei fonte que descreva
   qualquer transição — **é uma coincidência de morada, não um facto apurado**.

**Coordenadas de portão que não consegui obter** (só tenho a vila ou a
localidade — e digo-o em vez de inventar):

2. Coudelaria SA — Herdade da Agolada de Baixo, Coruche
3. Veiga Teixeira — Coruche (o que a base tem é o centro da vila)
4. Coudelaria Vila Viçosa — Herdade do Ameal
5. Jupiter Classical Dressage — Herdade do Ameal, Ciladas
6. Lusitanos d'Atela — Casalinho / Paul d'Atela, Alpiarça

**Efectivos, que nenhuma fonte publica:**

7. Vila Viçosa — 40 cavalos? (a fonte só fala em 6 garanhões reprodutores)
8. Jupiter — 80 cavalos? (32 boxes)
9. Monte Velho — 35 cavalos?
10. Morgado Lusitano — 15 cavalos?
11. Torres Vaz Freire — 65, ou «45 éguas e ~20 nascimentos/ano»?

**Prémios por confirmar:**

12. **Vila Viçosa — «Melhor Criador de Portugal (múltiplas vezes)».** A
    afirmação só existe na página de marketing da própria coudelaria. Se o
    prémio existe, tem **nome oficial, entidade e anos** — e nenhum dos três
    se achou. Enquanto não houver isso, **não deve ser apresentado como
    facto**.
13. **Malhadinha — «Best Luxury Rural Hotel».** Não achei galardão com este
    nome. O que existe e é próximo, mas **não é o mesmo**: chave Platina do
    guia *Boa Cama Boa Mesa* 2022 e 2023, e uma distinção de «Melhor
    Hospitalidade».

**Datas e contactos:**

14. **Coudelaria SA — que ano pôr como fundação?** Há três candidatos e nenhum
    é «a fundação» sem se decidir o que a palavra quer dizer: princípio do
    séc. XX (Ruy d'Andrade), **1991** (partilha pelos quatro filhos), ou a data
    em que Maria d'Andrade instalou os cavalos na Agolada de Baixo. **Deixei o
    campo vazio de propósito.**
15. **Morgado Lusitano — idem.** A empresa de turismo é de **2003**; a quinta é
    do séc. XVIII. Nenhuma das duas responde a «quando começou a coudelaria».
16. **Morgado Lusitano — qual é o telefone certo?** (ver ponto 4 acima)
17. **Malhadinha — qual o telefone a mostrar como geral?** O
    `284 965 432` da base é da casa, mas as fontes atribuem-no ao restaurante;
    há ainda `284 965 210` (adega) e `284 965 211` (Câmara de Beja).
18. **Veiga Teixeira — a morada é mesmo «N119 km 41.3»?** Nenhuma fonte o diz.
    Circulam duas moradas de rua em Coruche: **Rua da Beneficiência, 17** (na
    mesma ficha do telefone e email que batem certo) e **Rua da Misericórdia,
    46** (com outro telefone, `243 617 173`).
19. **Torres Vaz Freire — `vila-formosa.com` tem certificado?** A base guarda
    `http://`, e **todos** os URLs indexados são `http://`. Não consegui abrir
    o site para verificar. Se não tiver HTTPS, o `http://` da base está
    tecnicamente certo, mas alguns browsers avisam o visitante.

**Prémio que a base não tem e talvez devesse ter:**

20. **Monte Velho — «quatro vezes Campeão dos Campeões» em andamentos da raça
    Lusitana.** Aparece em fonte pública e não está na base. Vale a pena
    perguntar e, se se confirmar em fonte melhor, acrescentar.
    <https://lusitanohorsefinder.com/monte-velho-eco-riding-resort/>

---

# Nota honesta sobre os limites deste trabalho

**1. Não abri um único site.** É o limite que pesa sobre tudo o resto. O
`WebFetch` está bloqueado por proxy neste ambiente para todos os domínios, sem
excepção. Trabalhei só com um motor de pesquisa. Logo:

- **Não verifiquei que nenhum dos nove sites responde hoje**, nem que tem
  certificado válido, nem que continua a ser da coudelaria. Sei que estão
  indexados com títulos e páginas coerentes. Um domínio expirado e revendido
  pode manter-se indexado durante meses — **o teste que o apanharia é
  exactamente o que não pude fazer**.
- O que cito são **excertos e resumos de resultados de pesquisa**. Quando o
  excerto vem de uma página oficial, o URL é o oficial e a informação é a que o
  motor leu lá; mas **não li a página inteira** e não posso garantir que não há
  contexto que mude a leitura.

**2. As fontes não valem todas o mesmo, e tentei dizer sempre qual é qual.**
Uma câmara municipal, o *eurodressage*, a FEI e a imprensa regional são coisa
diferente de um agregador de alojamento ou de um portal de anúncios de
cavalos. Onde a única fonte era fraca — a lista telefónica de Alter do Chão, o
`lusitanohorsefinder.com` — escrevi-o ao lado do veredicto, para não passar
por confirmação sólida o que não é.

**3. Os prémios são, de propósito, o capítulo mais duro.** São afirmações sobre
pessoas, e por isso não usei em lado nenhum «provavelmente verdade». Dois
resultaram em DIVERGE por **atribuição** — o prémio existe, mas é de outra
casa — e esse é um erro mais fácil de cometer e mais difícil de ver do que um
prémio inventado: os números estão todos certos, só o dono é que não é aquele.

**4. Das coordenadas, só ataquei o que se podia atacar.** Consegui coordenada
de fonte publicada para quatro (Torres Vaz Freire, Malhadinha, Monte Velho,
Morgado). Para as outras cinco **só tenho a vila ou a localidade, e digo-o**.
Não gerei uma única coordenada por estimativa a partir de morada. As distâncias
citadas foram calculadas por haversine entre a coordenada da base e a da fonte.

**5. Não escrevi nada na base, não corri migrações, não commitei e não toquei
em código.** O único ficheiro criado é este.

**6. O que falta fazer, e por quem.** Num ambiente com rede aberta, o passo
seguinte é abrir os nove sites, ler as páginas de contactos e apanhar o mapa
que cada casa publica — é isso que fecha as coordenadas em falta e resolve a
questão do certificado de `vila-formosa.com`. Depois disso, o que sobrar é
mesmo para perguntar às coudelarias: efectivos e prémios não estão publicados
em lado nenhum e não há fonte que os substitua.
