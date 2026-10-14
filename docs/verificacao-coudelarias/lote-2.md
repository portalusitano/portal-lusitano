# Verificação de coudelarias — lote 2

Data: 7 de Setembro de 2026
Âmbito: nove coudelarias (João Lynce, João Pedro Rodrigues, Luís Bastos,
Luís Folgado, Manuel Veiga, Ortigão Costa, Pedro Passanha, Quinta da Hermida,
Quinta dos Cedros).

---

## Aviso sobre o método — ler antes de usar este documento

**Não foi possível abrir uma única página.** Neste ambiente o proxy de rede
bloqueia todo o acesso directo a sítios (`WebFetch` devolve `EGRESS_BLOCKED`
para qualquer domínio, incluindo `joaolynce.com`, `jprlusitanos.com`,
`cavalo-lusitano.com` e até a Wikipédia; `curl` devolve `CONNECT tunnel failed,
403`). A única ferramenta que funcionou foi a pesquisa web, que devolve
títulos, URLs e um resumo automático do conteúdo indexado.

Isto tem duas consequências que atravessam o documento inteiro:

1. **Não pude cumprir o primeiro passo pedido** — abrir o sítio oficial de cada
   coudelaria e ler a página de contactos. Não posso, portanto, garantir que
   algum dos sítios **está de facto no ar hoje**, nem que o conteúdo indexado
   corresponde ao que lá está agora. Só sei que estão indexados.
2. **CONFIRMADO aqui é um grau mais fraco do que devia ser.** Significa: «um
   resultado de pesquisa atribuiu este facto a este URL». Não significa «li a
   página». Cada CONFIRMADO deve ser reconfirmado abrindo o URL indicado antes
   de se publicar seja o que for.

Onde o resumo da pesquisa foi vago, ambíguo ou juntou fontes diferentes,
preferi **NÃO CONFIRMADO** a arriscar. É por isso que há campos marcados como
não confirmados sobre os quais há indícios: os indícios estão escritos, mas não
chegam.

**Nota sobre circularidade:** numa das pesquisas apareceu como resultado o
próprio `portal-lusitano.pt`. Não foi usado como fonte em nenhum campo — não se
verifica uma base contra si própria.

---

## 1. Coudelaria João Lynce

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Localidade | Santarém, Ribatejo | **CONFIRMADO** |
| Morada completa | (só «Santarém») | **DIVERGE** — a base é incompleta |
| Sítio | joaolynce.com | **CONFIRMADO** (indexado) |
| Telefone | +351 917 886 901 | **CONFIRMADO** |
| Fundação | 2003 | **CONFIRMADO** |
| Nº de cavalos | 20 | **CONFIRMADO** (com nuance) |
| Coordenadas | 39.2369, -8.6868 | **DIVERGE** — é o centro de Santarém |
| Biografia | nascido em Alcácer do Sal em 1966 | **CONFIRMADO** |
| Prémios pessoais 2001/2002/2003 | ver abaixo | **CONFIRMADO** |
| Prémios «Perito» 1999/2004 | ver abaixo | **CONFIRMADO** |

**Morada — DIVERGE.** A fonte dá morada completa: *Casal da Felicidade —
Estrada Nacional 3 — São Pedro, 2005-356 Santarém*, com fax 243 760 310 e
email `joaolynce@gmail.com`. A base só tem «Santarém». Não é um erro, é uma
lacuna que se pode fechar hoje.
Fonte: resultado de pesquisa atribuído a <https://joaolynce.com/> e
<https://joaolynce.com/stud-farm/>.

**Fundação 2003 — CONFIRMADO.** «De 1992 a 2003 colaborou no desenvolvimento
deste trabalho como responsável pela Coudelaria Calheiros Ferreira, e a partir
de 2003 iniciou a sua própria coudelaria.» Há uma subtileza: *as primeiras
éguas Lusitanas que adquiriu datam de 1986*. A coudelaria é de 2003; o
envolvimento com a raça é anterior. A base está certa.
Fonte: <https://joaolynce.com/about/>.

**20 cavalos — CONFIRMADO, com nuance.** A fonte diz «20 **éguas**», não 20
cavalos. Se o campo da base é «número de cavalos» e conta o efectivo total,
está subavaliado (faltam garanhões, poldros). Se conta o efectivo reprodutor,
está certo. Vale a pena o dono do site decidir o que o campo significa.
Fonte: <https://joaolynce.com/stud-farm/>.

**Nascimento — CONFIRMADO.** «João Pereira Lynce nasceu a 14 de Outubro de 1966
numa família de agricultores da região de Alcácer do Sal.» A base diz «nascido
em Alcácer do Sal»; a fonte diz «da região de Alcácer do Sal», o que é
ligeiramente mais cauteloso. Ganha-se em rigor escrevendo «região de».
Fonte: <https://joaolynce.com/about/>.

**Prémios — CONFIRMADO, com detalhe que a base perde.** A fonte é minuciosa:

- **2001** — Vice-campeão na classe de Iniciados, medalha de bronze na classe
  de Consagrados, e **Campeão da Europa por Equipas** (campeonato em Espanha).
  → o que a base diz («Campeão Europeu Equipas 2001») está correcto.
- **2002** — medalha de bronze em Consagrados e **Campeão do Mundo por
  Equipas** (campeonato em Portugal).
  → correcto.
- **2003** — bronze em Cavalos Novos, **Campeão Nacional** na classe de
  Mestres, troféu Eng.º Fernando Sommer d'Andrade, e **Campeão da Europa
  Individual** com bronze por equipas (campeonato em França).
  → correcto. Note-se que o título nacional é *na classe de Mestres*, não um
  «Campeão Nacional» absoluto; convém escrever a classe.

Fonte: <https://joaolynce.com/about/> e
<https://joaolynce.com/working-equitation/>.

**«Perito» — CONFIRMADO.** «Perito foi campeão da raça Lusitana em 1999 e em
2004 foi Campeão Nacional de Garanhões. É o garanhão principal da coudelaria de
João Pereira Lynce.» As duas afirmações da base batem certo.
Fonte: <https://joaolynce.com/stud-farm/>.

**Coordenadas — DIVERGE.** 39.2369, -8.6868 fica a **80 metros** do centro de
Santarém. A coudelaria fica no Casal da Felicidade, na EN3, na freguesia de São
Pedro — fora do centro. A coordenada actual é a da cidade, não a do portão.
**Só tenho a cidade e a estrada (EN3, São Pedro), não tenho o portão.**

---

## 2. Coudelaria João Pedro Rodrigues

**Esta é a ficha com mais erros do lote.** Além do telefone com `XXX`, a
localidade e as coordenadas parecem estar erradas por ~46 km, e o email
diverge.

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Localidade | Alpiarça, Ribatejo | **DIVERGE** |
| Coordenadas | 39.25, -8.5667 | **DIVERGE** — ~46,5 km do sítio indicado pelas fontes |
| Sítio | jprlusitanos.com | **CONFIRMADO** (indexado) |
| Instagram | @jprlusitanos | **CONFIRMADO** |
| Telefone | `+351 243 558 XXX` | **NÃO CONFIRMADO** — e o valor actual é um defeito |
| Email | info@jprlusitanos.com | **DIVERGE** |
| Fundação | 1992 | **CONFIRMADO** |
| Nº de cavalos | 50 | **NÃO CONFIRMADO** |
| Prémio OXIDADO | «cavalo mais premiado do mundo em Equitação de Trabalho» | **CONFIRMADO** (ver ressalva) |

**Localidade e coordenadas — DIVERGE, e é grave.** Duas fontes independentes
colocam a coudelaria em **Samora Correia (concelho de Benavente)**, não em
Alpiarça:

- O próprio sítio tem uma página intitulada *«Monte dos Apupos | Samora
  Correia»* — <https://www.jprlusitanos.com/monte-dos-apupos> — que descreve a
  propriedade: *Monte dos Apupos, na Herdade de Pancas, na Reserva Natural do
  Estuário do Tejo, 100 hectares de pastagens naturais.*
- O directório de sócios da APSL lista *«Herdade de Pancas — Monte dos Apupos,
  2135-012 Samora Correia»* associado a JPR Lusitanos.
  <https://www.cavalo-lusitano.com/pt/apsl/socios-apsl>

A coordenada da base (39.25, -8.5667) é o centro de Alpiarça. A Herdade de
Pancas fica a cerca de **46,5 km** de lá. Alguém que siga o mapa do portal vai
para o concelho errado.
**Não tenho a coordenada do portão** — tenho a herdade e o código postal
(2135-012), não o ponto. O código postal e o nome «Monte dos Apupos / Herdade
de Pancas» são o suficiente para quem quiser apurar a coordenada com rigor.

*Ressalva honesta:* é possível que a coudelaria tenha ou tenha tido instalações
em Alpiarça e que a base reflicta isso. Não encontrei nada que o suportasse.
Como não pude abrir a página de contactos, deixo a hipótese escrita — mas o
peso da prova está do lado de Samora Correia.

**Telefone — NÃO CONFIRMADO.** O valor actual, `+351 243 558 XXX`, é um
*placeholder* com os X literais que foi para produção. **Deve sair hoje**,
independentemente de se achar substituto: um número falso é pior do que nenhum.

Não consegui fixar um número único. Encontrei **três candidatos em conflito**,
o que é precisamente a razão para não escolher nenhum:

| Candidato | Atribuído a |
| --- | --- |
| 917 025 648 | página de contactos do próprio sítio, <https://www.jprlusitanos.com/contatos-e-localizacao> (apareceu em duas pesquisas independentes) |
| 214 869 075 | directório de sócios da APSL, <https://www.cavalo-lusitano.com/pt/apsl/socios-apsl> |
| 917 568 819 | directório de sócios da APSL, mesma entrada |

Observação que reforça a suspeita sobre a localidade: **nenhum** é do
indicativo 243 (Santarém/Alpiarça). O 214 é da área de Lisboa. O indicativo do
*placeholder* não corresponde a nenhuma das fontes.

O candidato mais forte é o **917 025 648**, por vir da página de contactos da
própria coudelaria. Mas não o li com os meus olhos, e o resumo da APSL misturou
visivelmente várias linhas da tabela de sócios (chegou a devolver quatro
números de sócio diferentes — 1, 17, 425 e 236 — para a mesma entrada), o que
mostra que estes resumos podem baralhar registos. **Recomendação: apagar o
`XXX` agora e só pôr número depois de alguém abrir
<https://www.jprlusitanos.com/contatos-e-localizacao>.**

**Email — DIVERGE.** A base tem `info@jprlusitanos.com`. Tanto a APSL como os
resumos da página de contactos dão **`jprlusitanos@sapo.pt`**. Não achei
nenhuma fonte para o `info@`.
Fonte: <https://www.cavalo-lusitano.com/pt/apsl/socios-apsl>,
<https://www.jprlusitanos.com/contatos-e-localizacao>.

**Fundação 1992 — CONFIRMADO.** «Em 1992 foi fundada a Coudelaria João Pedro
Rodrigues com éguas alazãs da Casa Cadaval e filhas de cavalos da linha Veiga.»
Os garanhões usados foram XAQUIRO (Quina), HOSTIL (Borba), ROUXINOL (Ferro da
Casa) e, mais recentemente, RUBI (Alter Real).
Fonte: <https://www.jprlusitanos.com/coudelaria>.

**50 cavalos — NÃO CONFIRMADO.** Nenhuma fonte deu um efectivo.

**OXIDADO — CONFIRMADO, com uma ressalva sobre a formulação.** Esta é a
afirmação forte que me foi pedido verificar com cuidado, e ela **aguenta-se**,
mas convém saber o que é fonte primária e o que é imprensa:

- A frase exacta da base — «cavalo mais premiado do mundo em Equitação de
  Trabalho» — é **uma auto-descrição da coudelaria**, que a escreve na sua
  própria página: <https://www.jprlusitanos.com/coudelaria>. Por si só não
  valeria como confirmação.
- Mas há corroboração independente e abundante, e diz o mesmo por outras
  palavras. A EQUISPORT noticiou a morte do cavalo com o título *«Morreu
  "Oxidado", o melhor cavalo de Equitação de Trabalho de todos os tempos»*
  (<https://www.equisport.pt/noticias/morreu-oxidado-o-melhor-cavalo-de-equitacao-de-trabalho-de-todos-os-tempos-video/>),
  e a Rádio Campanário o mesmo
  (<https://www.radiocampanario.com/morreu-oxidado-o-melhor-cavalo-de-equitacao-de-trabalho-vencedor-do-1-campeonato-em-beja-c-video/>).
- Os factos concretos por trás do superlativo também aparecem: Oxidado (Xaquiro
  × Coca, por Maravilha) foi o cavalo de **Pedro Torres**, com quem foi campeão
  do mundo e **tetracampeão da Europa (2000, 2004, 2008 e 2009)** de Equitação
  de Trabalho; morreu com 26 anos; e foi **criado por João Pedro Rodrigues**.
  Fontes: <https://revistaequitacao.blogspot.com/2009/06/pedro-torres-e-tetra-e-portugal.html>,
  <https://www.equisport.pt/noticias/morreu-oxidado-o-melhor-cavalo-de-equitacao-de-trabalho-de-todos-os-tempos-video/>.

**Conclusão sobre OXIDADO:** a atribuição à coudelaria está certa e o
superlativo é sustentado por imprensa especializada independente. Sugestão de
redacção mais defensável, porque troca um superlativo por factos: *«OXIDADO
jpr — com Pedro Torres, campeão do mundo e tetracampeão da Europa de Equitação
de Trabalho (2000, 2004, 2008, 2009)»*.

**Achado adicional, não pedido mas relevante:** as fontes atribuem a João Pedro
Rodrigues o título de **Melhor Criador da Raça no FIPSL de 2004** e a condição
de criador com mais títulos de Campeão dos Campeões da Golegã nos últimos 40
anos. Fonte: <https://www.jprlusitanos.com/criador> (auto-descrição) e
<https://www.facebook.com/people/Coudelaria-Jo%C3%A3o-Pedro-Rodrigues-jgr/100064734514594/>.
Não verificado contra actas da APSL — se se quiser usar, é **NÃO CONFIRMADO**.

---

## 3. Coudelaria Luís Bastos

A ficha mais limpa do lote. A contradição interna resolve-se a favor de 2006.

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Localidade | Porto de Muge, Cartaxo, Santarém | **CONFIRMADO** |
| Morada completa | (parcial) | **DIVERGE** — a base é incompleta |
| Sítio | coudelarialuisbastos.com | **CONFIRMADO** (indexado) |
| Telefone | +351 937 566 922 | **CONFIRMADO** |
| Fundação | vazio na base / «2006» na história | **CONFIRMADO: 2006** |
| Nº de cavalos | 12 | **CONFIRMADO** (com nuance) |
| Coordenadas | 39.1063, -8.7392 | **NÃO CONFIRMADO** |
| Linhagem Veiga | sim | **CONFIRMADO** |

**A contradição resolve-se: 2006.** «A Coudelaria Luís Bastos foi fundada em
2006 por Luís Bastos, com 5 éguas Lusitanas, todas de linha Veiga pura.» O
campo do ano deve passar a **2006**, que é o que a própria história já dizia.
Fonte: <https://lusitanohorsefinder.com/coudelaria-luis-bastos-stud-review/>
(revisão de coudelaria do Lusitano Horse Finder, fonte secundária) —
corroborado pelo sítio da coudelaria, <https://coudelarialuisbastos.com/>.

**Morada — DIVERGE (incompleta).** A morada completa é *Quinta Casal das Faias,
Porto de Muge, 2070-503 Valada, Cartaxo — Santarém*. Repare-se que o código
postal é de **Valada**, não do Cartaxo: a base diz «Porto de Muge, Cartaxo», o
que está certo mas é menos preciso do que se pode ser.
Email: `info@coudelarialuisbastos.com` (a base não o tem).
Fonte: <https://lusitanohorsefinder.com/coudelaria-luis-bastos/>.

**Telefone — CONFIRMADO.** (351) 937566922, igual à base.
Fonte: <https://lusitanohorsefinder.com/coudelaria-luis-bastos/>.

**12 cavalos — CONFIRMADO, mesma nuance do nº 1.** A fonte diz «hoje a
coudelaria tem **12 éguas** puro-sangue Lusitanas». São 12 éguas, não 12
cavalos. Sendo uma coudelaria pequena, a diferença entre «12 éguas» e «efectivo
total» pode ser substancial.
Fonte: <https://lusitanohorsefinder.com/coudelaria-luis-bastos-stud-review/>.

**Linhagem Veiga — CONFIRMADO.** As cinco éguas fundadoras eram «todas de linha
Veiga pura». Mesma fonte.

**Coordenadas — NÃO CONFIRMADO.** 39.1063, -8.7392 fica na zona de Porto de
Muge e é plausível, mas não achei nada que a ancorasse à Quinta Casal das
Faias. **Só tenho a localidade e o nome da quinta.** O código postal
2070-503 é o caminho para apurar isto com rigor.

---

## 4. Coudelaria Luís Folgado

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Morada (Monte Mayor) | Monte Mayor, EN 114 Km 145.5, 7050-704 Montemor-o-Novo | **CONFIRMADO** |
| Segunda instalação (Estoril) | ausente da base | **DIVERGE** — falta na base |
| Sítio | coudelarialuisfolgado.com | **CONFIRMADO** (indexado) |
| Telefone | +351 917 271 469 | **CONFIRMADO** |
| Fundação | vazio | **NÃO CONFIRMADO** |
| Nº de cavalos | 35 | **NÃO CONFIRMADO** |
| Coordenadas | 38.6475, -8.216 | **NÃO CONFIRMADO** |

**Morada — CONFIRMADO, ao caractere.** «Monte Mayor: Estrada Nacional 114 —
Km 145.5, 7050-704 Montemor-o-Novo — Portugal.» Bate exactamente com a base.
Fonte: <https://coudelarialuisfolgado.com/en/contacts/> e
<https://coudelarialuisfolgado.com/en/about-us/>.

**Telefone — CONFIRMADO, e há um segundo que falta.** A coudelaria publica
**dois**: `+351 917 271 469` (o que a base tem) e `+351 211 368 474`. Email:
`info@coudelarialuisfolgado.com`.
Fonte: <https://coudelarialuisfolgado.com/en/contacts/>.

**Segunda instalação — a base não a tem.** Há um segundo endereço, o *Jardim da
Coudelaria: Rua Manuel Acácio Pereira Lourenço, 2765-034 Estoril*, descrito como
Centro de Treino criado na região de Lisboa (Alapraia — Estoril) para estar mais
perto dos clientes e das provas do Campeonato Nacional de Dressage. Isto explica
por que razão o Facebook e o Instagram da coudelaria dizem «Cascais» e não
«Montemor-o-Novo» — o que, num portal de classificados, pode confundir quem
procure. Vale a pena registar as duas.
Fonte: <https://coudelarialuisfolgado.com/en/about-us/>,
<https://www.instagram.com/coudelarialuisfolgado/>.

**Fundação — NÃO CONFIRMADO, mas com um indício datável.** O sítio diz que a
coudelaria se dedica «há **25 anos**» à criação do Puro-Sangue Lusitano. Não é
um ano: é uma frase relativa, e não sei quando foi escrita nem quando foi
actualizada pela última vez. Se estiver actual, dá ~2001; se estiver na página
há dez anos, dá ~1991. **Não se deve derivar um ano de fundação daqui.** É
exactamente o tipo de conta que produz um facto falso com ar de facto
verificado. Pergunta directa ao dono da coudelaria.
Fonte: <https://coudelarialuisfolgado.com/en/>.

**35 cavalos — NÃO CONFIRMADO.** Nenhuma fonte deu um efectivo. O sítio tem
páginas separadas para éguas de criação, poldros, poldras e garanhões
utilizados (<https://coudelarialuisfolgado.com/en/horses/horses-en/>); quem
puder abri-las consegue contar.

**Coordenadas — NÃO CONFIRMADO.** 38.6475, -8.216 fica junto a
Montemor-o-Novo e é plausível, mas não a validei contra nada. Aqui, porém, há
uma via limpa que não precisa de adivinhação: a morada é **um ponto
quilométrico** — EN 114, km 145,5. Isso é uma localização determinada, não uma
vila. Quem tiver acesso a mapas pode fixar a coordenada com precisão a partir
dela.

---

## 5. Coudelaria Manuel Veiga

Casa histórica. Tratei os factos com o cuidado pedido — e é por isso que dois
dos três prémios ficam por confirmar apesar de serem provavelmente verdadeiros.

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Local | Quinta da Broa, Azinhaga, Ribatejo | **CONFIRMADO** |
| Morada completa | (parcial) | **DIVERGE** — a base é incompleta |
| Sítio | vazio | **DIVERGE** — existe `quintadabroa.com` |
| Telefone | +351 249957154 | **CONFIRMADO** |
| Email | casasdapiedade@quintadabroa.com | **CONFIRMADO** |
| Fundação | vazio / «1817 por Rafael José da Cunha» na história | **CONFIRMADO: 1817** |
| Coordenadas | 39.3667, -8.5333 | **DIVERGE** — é o centro da Azinhaga |
| Prémio: Agareno | Chefe de Linhagem oficial do PSL | **CONFIRMADO** |
| Prémio: Novilheiro | líder europeu em prémios de saltos (1983) | **DIVERGE** — o ano/âmbito não batem |
| Prémio: Nilo | Campeão dos Campeões, Golegã 1974 | **NÃO CONFIRMADO** |

**1817 / Rafael José da Cunha — CONFIRMADO, e por duas fontes.** «A Quinta da
Brôa é uma propriedade na aldeia da Azinhaga, perto da Golegã, fundada por
Rafael José da Cunha em 1817.» As fontes detalham: Rafael José da Cunha,
homem de reconhecido mérito, iniciou a sua própria criação de cavalos
«peninsulares» — a designação da época para o que hoje se chama Lusitano —
depois de se tornar rendeiro da Quinta da Broa e de mais tarde a comprar ao
Conde da Ribeira. A coudelaria pertence hoje aos herdeiros, entre eles Manuel
Tavares Veiga. **O campo do ano deve passar a 1817.**
Fontes: <https://www.equisport.pt/artigos/a-tradicao-da-casa-veiga-parte-i/> e
<https://www.equilifeworld.com/portraits/manuel-veiga-a-master-of-artistry/>.

**Telefone e email — CONFIRMADO, mas atenção a de quem são.** +351 249 957 154
(e ainda o telemóvel +351 961 628 608) e `casasdapiedade@quintadabroa.com`
conferem. **Só que estes contactos são das Casas da Piedade** — o turismo rural
instalado nas antigas casas dos trabalhadores da Quinta da Brôa —, não
necessariamente da coudelaria. Um comprador que ligue para comprar um cavalo
pode cair na recepção do alojamento. Não é um erro factual; é uma imprecisão
que convém assinalar na ficha.
Fontes: <http://www.casasdapiedade.com/contactos.html>,
<https://www.visitribatejo.pt/en/catalogue/where-to-sleep/rural-tourism/casas-da-piedade/>.

**Sítio — a base não tem, e existe um.** `quintadabroa.com` está indexado
(<http://www.quintadabroa.com/>), embora aponte para as Casas da Piedade. Há
ainda páginas institucionais dedicadas: a Câmara Municipal da Golegã
(<https://www.cm-golega.pt/concelho/turismo/item/204-quinta-da-broa-e-casa-da-ponte>),
a Junta de Freguesia da Azinhaga
(<http://www.freguesiadeazinhaga.pt/turismo/locais-visitar/5>) e o Visit Golegã
(<https://visitgolega.com/portfolio-items/quinta-da-broa/>).

**Morada — DIVERGE (incompleta).** A morada completa é *EN 365, km 65,5 —
Quinta da Brôa, Apartado 2, 2150-065 Azinhaga / Golegã*. Tal como no caso do
Luís Folgado, é um ponto quilométrico, o que permite fixar a coordenada com
rigor.
Fonte: <http://www.casasdapiedade.com/contactos.html>.

**Agareno — CONFIRMADO.** Agareno é efectivamente um dos **chefes de linhagem**
reconhecidos do Puro-Sangue Lusitano. As fontes identificam seis garanhões
fundadores como chefes de linhagem — Agareno, Primoroso, Destinado, Marialva,
Regente e Hucharia — provenientes de quatro coudelarias (Andrade, Veiga, Alter
Real e Coudelaria Nacional). Agareno é o de Veiga (MV), nascido em **1931**,
filho de Lidador II (MV) e Bagocha (MV), e serviu, com Sutão I e Berber, de base
à primeira selecção da Casa Veiga.
Fontes: <https://www.cavalo-lusitano.com/pt/stud-book>,
<https://lusitano-interagro.com/three-main-lines/>,
<https://www.equisport.pt/artigos/a-tradicao-da-casa-veiga-parte-i/>.
*Sugestão:* a base diz «Chefe de Linhagem oficial do PSL». É verdade, mas
ganha-se em precisão dizendo «um dos seis chefes de linhagem do PSL, e o chefe
da linha Veiga».

**Novilheiro — DIVERGE.** A base afirma «líder europeu em prémios de saltos
(1983)». As fontes confirmam o cavalo, o criador e o feito, mas **não com esse
ano associado a esse âmbito**:

- *Horse & Hound*: Novilheiro «foi o cavalo que mais dinheiro em prémios ganhou
  em Inglaterra quando saltava com John Whitaker **em 1983**» — âmbito
  **britânico**, não europeu.
  <https://www.horseandhound.co.uk/archives/in-praise-of-the-lusitano-48487>
- Fontes espanholas: «em **1983**, Whitaker e Novilheiro foram proclamados
  campeões do Reino Unido, e **um ano depois** (1984) o Lusitano consagrou-se
  como o cavalo que mais dinheiro tinha ganho nessa temporada».
  <https://www.horselife.es/2021/02/novilheiro-un-lusitano-en-la-elite-del-salto-de-obstaculos/>,
  <https://womanowar.com/2021/02/01/novilheiro-un-lusitano-en-la-elite-del-salto-de-obstaculos/>
- Interagro: sob John Whitaker, Novilheiro «foi Campeão Britânico e, mais
  tarde, líder do ranking europeu de prémios ganhos em competição» — **sem
  ano**. <https://interagro.com.br/haras/novilheiro-mv-2/>

Ou seja: **1983 é o ano do título britânico**; a liderança europeia aparece ou
sem data ou associada a 1984. Emparelhar «líder europeu» com «1983» junta duas
coisas que as fontes separam. Criado por Manuel Veiga na sua coudelaria da
Golegã — isso, sim, está confirmado, e Novilheiro nasceu em **1971**.
*Correcção sugerida:* «Novilheiro (1971) — com John Whitaker, Campeão Britânico
de Saltos e o cavalo que mais prémios ganhou em Inglaterra em 1983; mais tarde
líder do ranking europeu de prémios». Ou, se se quiser um facto curto e
inatacável: «Novilheiro — Campeão Britânico de Saltos com John Whitaker
(1983)».

**Nilo — NÃO CONFIRMADO.** Confirmei que **Nilo é um cavalo de Manuel Tavares
Veiga (MV)** e que é figura maior da raça: é pai do célebre Cagancho (do
rejoneador Hermoso de Mendoza), e a linhagem Firme (SA) / **Nilo (MV)** /
Novilheiro (MV) é apontada como possivelmente a de maior influência na formação
do Lusitano actual.
Fontes: <https://interagro.com.br/haras/ofensor-mv/>,
<http://www.cavalonet.com/forum/viewtopic.php?t=1419>.

**Mas não achei nada que confirme «Campeão dos Campeões, Golegã 1974».** Nem o
título, nem o ano. Procurei directamente e o que apareceu foram Campeões dos
Campeões de outros anos (Morante 2021, Luar da Caniceira 2019, Faisão, Xiripiti
e Xeque-Mate). Provavelmente é verdade — mas *provavelmente verdade* é
exactamente o que não se publica. Fica NÃO CONFIRMADO para o dono do site
decidir.

**Coordenadas — DIVERGE.** 39.3667, -8.5333 é o centro da Azinhaga — repare-se
que é uma conversão arredondada de graus e minutos (39°22′ N, 8°32′ O), a
assinatura de um centróide de localidade e não de um ponto medido. A Quinta da
Brôa fica na EN 365 ao km 65,5, fora da aldeia. **Só tenho a aldeia; tenho o
ponto quilométrico da estrada, que permite apurar o resto.**

---

## 6. Coudelaria Ortigão Costa

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Localidade | Azambuja, Ribatejo | **CONFIRMADO** |
| Morada completa | (só «Azambuja») | **DIVERGE** — a base é incompleta |
| Sítio | coudelariaortigaocosta.com | **CONFIRMADO** (indexado) |
| Instagram | @ortigaocostastud | **CONFIRMADO** |
| Telefone | +351 263 401 178 | **CONFIRMADO** |
| Fundação | 1963 | **CONFIRMADO** |
| Nº de cavalos | 72 | **DIVERGE** |
| Coordenadas | 39.0667, -8.8667 | **DIVERGE** — é o centro da Azambuja |
| «Maior coudelaria privada de exportação internacional» | — | **NÃO CONFIRMADO** (auto-declaração) |
| «Especialização única em cavalos pretos desde 1963» | — | **CONFIRMADO** quanto a 1963; **NÃO CONFIRMADO** quanto a «única» |

**Fundação 1963 — CONFIRMADO.** «A coudelaria foi fundada em 1963 por Luís
Jorge Ortigão Costa, a partir de um conjunto de éguas pretas compradas a
algumas das melhores coudelarias de Portugal e do garanhão preto FÚRIA.» O
fundador, Luís Jorge Roldaen Ortigão Blanck Costa, era veterinário e criador de
gado, residente na Azambuja, e faleceu em 2010.
Fontes: <https://coudelariaortigaocosta.com/pt/historia>,
<http://diariotaurino.blogspot.com/2010/11/morreu-ortigao-costa.html>.

**Morada e contactos — DIVERGE (a base é incompleta).** *Quinta da Fonte do
Pinheiro — Apartado 13, 2050-306 Azambuja*. Telefones **263 401 178** (o da
base — confere), 263 403 919 e 917 232 410. Email `jorgeoc@sogepoc.pt`. A
entidade formal é *Sociedade Agrícola Fonte do Pinheiro (Ortigão Costa)*.
Fonte: <https://coudelariaortigaocosta.com/pt/contactos>.

**72 cavalos — DIVERGE.** O sítio da coudelaria diz que tem **58 éguas pretas,
50 delas Lusitanas puras e 8 cavalos de desporto português**, e outra fonte
refere **seis garanhões**. Isso dá ~64 no efectivo reprodutor, e nenhuma fonte
chega a 72. Não sei se 72 conta poldros — se contar, é um número que muda todos
os anos (a mesma fonte fala em ~60 nascimentos esperados só em Janeiro), e um
número que muda todos os anos não devia estar escrito numa ficha estática. É
uma divergência de método, não só de valor.
Fonte: <https://coudelariaortigaocosta.com/pt/historia>.

**«Especialização única em cavalos pretos desde 1963» — parcialmente
confirmado.** O **desde 1963** está CONFIRMADO: a coudelaria dedica-se à criação
de uma elite de cavalos pretos desde a fundação, e nasceu precisamente de éguas
pretas e de um garanhão preto. O **«única»** é NÃO CONFIRMADO: a formulação vem
da própria coudelaria, que se descreve como «a única coudelaria do mundo
dedicada à criação de cavalos pretos». Não achei fonte independente que o
ateste. É uma afirmação de exclusividade mundial — o género de coisa que só se
publica com fonte de terceiros, ou explicitamente atribuída («a coudelaria
descreve-se como…»).
Fonte: <https://coudelariaortigaocosta.com/pt/historia>.

**«A maior coudelaria privada de exportação internacional» — NÃO CONFIRMADO.**
Mesma situação, agravada. A coudelaria diz de si própria que é «a coudelaria
portuguesa que actualmente mais exporta» e posiciona-se como a maior
coudelaria privada em exportação internacional. Não encontrei **nenhuma** fonte
independente — nem APSL, nem imprensa, nem estatísticas de exportação — que
sustente um ranking. Sem dados de exportação publicados, isto não é verificável
por terceiros.
*Recomendação:* ou se atribui explicitamente («segundo a própria coudelaria,
…»), ou se retira. Uma afirmação de liderança de mercado apresentada como facto
neutro do portal é o tipo de coisa que uma coudelaria concorrente contesta com
razão.

**Coordenadas — DIVERGE.** 39.0667, -8.8667 é outro centróide arredondado
(39°04′ N, 8°52′ O) — o centro da Azambuja. A coudelaria fica na Quinta da
Fonte do Pinheiro. **Só tenho a vila e o nome da quinta.**

---

## 7. Coudelaria Pedro Passanha

**Boa notícia sobre o ponto que mais preocupava:** a coordenada que a base tem
na ficha principal está praticamente certa.

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Local | Herdade da Malhada Velha, Ferreira do Alentejo | **CONFIRMADO** |
| Sítio | pedropassanha.pt | **CONFIRMADO** (indexado) |
| Telefone | +351 919 830 258 | **NÃO CONFIRMADO** (há outro nas fontes) |
| Fundação | 1980 | **CONFIRMADO** |
| Nº de cavalos | 30 | **NÃO CONFIRMADO** |
| Coordenadas 38.117, -8.067 | | **CONFIRMADO** — a 520 m da herdade |
| Segunda coordenada (17,8 km de distância) | | **DIVERGE** — deve ser eliminada |
| Prémio: XAQUIRO | Medalha de Ouro FIPSL 1988, Reprodutor de Mérito 2010 | **CONFIRMADO** |
| Prémio: ZAIRE | Campeão dos Campeões FIPSL 2010 | **CONFIRMADO** |
| Prémio: NUXEQUE | Golegã 1998 | **NÃO CONFIRMADO** |

**A discrepância das coordenadas resolve-se — CONFIRMADO.** A Herdade da
Malhada Velha, em Ferreira do Alentejo (distrito de Beja), tem coordenadas
publicadas de **38.119080, -8.061613**, código postal **7900-134**.

A coordenada da base **38.117, -8.067 está a 520 metros** desse ponto — ou
seja, é a boa. **A outra coordenada da base, a 17,8 km de distância, está
errada e deve ser eliminada.** Não posso dizer para onde aponta (não me foi
dado o valor), mas 17,8 km de erro no Baixo Alentejo é a diferença entre chegar
ao portão e andar meia hora a mais por estradas rurais.
Fontes: <https://www.coordenadas.de/beja/ferreira_do_alentejo/herdade_da_malhada_velha/>,
<https://www.codigo-postal.pt/ferreira-do-alentejo/herdade-da-malhada-velha/>,
<https://www.portugalio.com/ferreira-do-alentejo/herdade-da-malhada-velha/>.

*Ressalva:* «Herdade da Malhada Velha» é um topónimo, e o ponto publicado é o
da herdade, não necessariamente o do portão da coudelaria numa propriedade
extensa. Mas 520 m é uma precisão perfeitamente utilizável, e é a melhor que
consegui apurar de forma honesta.

**Fundação 1980 — CONFIRMADO.** «A Coudelaria Pedro Passanha foi fundada em
1980 na Herdade da Malhada Velha, em Ferreira do Alentejo, começando com três
éguas do Dr. Guilherme Borba.»
Fonte: <http://pedropassanha.pt/pt/quem-somos.html>.

**Telefone — NÃO CONFIRMADO.** A base tem o telemóvel **+351 919 830 258**. A
fonte que encontrei dá um fixo diferente: **284 755 120** (indicativo 284 =
Beja, coerente com Ferreira do Alentejo), associado a «Pedro Maldonado Passanha
— Herdade da Malhada Velha, 7900 Ferreira do Alentejo».
Não é uma contradição — uma coudelaria pode ter fixo e telemóvel —, mas **não
consegui confirmar o telemóvel da base em fonte nenhuma**. Fica NÃO
CONFIRMADO, e o fixo fica registado como candidato a acrescentar.
Fonte: <https://www.portugalio.com/ferreira-do-alentejo/herdade-da-malhada-velha/>.

**XAQUIRO — CONFIRMADO, e com mais detalhe do que a base tem.** «Xaquiro
recebeu Medalha de Ouro do FIPSL na classe de garanhões em **1988**, Medalha de
Ouro em Descendência de Garanhão em **2004**, e foi distinguido com o título de
**Reprodutor de Mérito em 2010**.» Viveu de **1980 a 2007**, e a sua
descendência obteve mais de **cem medalhas de ouro e dez títulos de Campeão dos
Campeões**. As duas afirmações da base batem certo, e falta-lhe a de 2004.
Fonte: <http://www.pedropassanha.pt/pt/xaquiro.html>.

*Nota de contexto, não é erro:* Xaquiro é referido noutras fontes como garanhão
da Coudelaria Quina — e é o mesmo garanhão que a Coudelaria João Pedro
Rodrigues (ficha 2) usou e que é pai de Oxidado. Isto é normal: um garanhão
serve em várias coudelarias e a página do Passanha é dedicada a ele por ser
central na sua criação. Só o registo para que ninguém tome a coincidência por
erro numa revisão futura.

**ZAIRE — CONFIRMADO.** «O garanhão Zaire foi o Campeão dos Campeões do FIPSL
2010, e Zaire (Coudelaria Pedro Passanha) é filho de Rouxinol e Orgulhosa.» A
atribuição à coudelaria está explícita na fonte, o que era o ponto frágil.
Fonte: <https://www.lusitanoworld.com/en/blog/fipsl-2021-outcome-and-highlights/>
e <https://www.lusitanoworld.com/en/blog/fipsl-2024/> (que refere descendência
de Zaire premiada em anos seguintes).

**NUXEQUE — NÃO CONFIRMADO.** Confirmei que **Nuxeque existe e foi garanhão
influente** na criação Lusitana: aparece como avô materno de «Luar da
Caniceira» (Escorial × Vinheta, por Nuxeque), o poldro que foi Campeão dos
Campeões da Feira Nacional do Cavalo da Golegã em 2019.
Fontes: <https://mediotejo.net/golega-poldro-luar-da-caniceira-sagra-se-campeao-da-raca-lusitana/>,
<https://www.equisport.pt/noticias/feira-nacional-do-cavalo-2019-luar-da-caniceira-o-lusitano-campeao-dos-campeoes-2019/>.

**Mas não achei nada sobre Nuxeque na Golegã em 1998**, nem sequer que prémio a
base lhe atribui — o campo diz só «NUXEQUE (Golegã 1998)», o que não chega a ser
uma afirmação completa. Duas coisas por resolver, portanto: *qual* foi o prémio
e *se* foi em 1998.

---

## 8. Coudelaria Quinta da Hermida

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Localidade | Vendas Novas, Alentejo | **CONFIRMADO** |
| Morada completa | (só «Vendas Novas») | **DIVERGE** — a base é incompleta |
| Sítio | coudelariaquintadahermida.com | **CONFIRMADO** (indexado) |
| Telefone | vazio | **NÃO CONFIRMADO** — continua vazio |
| Email | info@coudelariaquintadahermida.com | **NÃO CONFIRMADO** |
| Fundação | 1999 | **CONFIRMADO** |
| Nº de cavalos | 30 | **NÃO CONFIRMADO** |
| Coordenadas | 38.6833, -8.4667 | **DIVERGE** — é o centro de Vendas Novas |

**Fundação 1999 — CONFIRMADO.** «A Quinta da Hermida foi um projecto que se
iniciou em 1999, com o objectivo e a ambição de desenvolver a coudelaria, dada
a cultura equestre existente e as condições que a Quinta proporcionava.»
Fonte: <https://www.coudelariaquintadahermida.com/coudelaria>.

**Morada — DIVERGE (incompleta).** *Quinta da Hermida, Rua Dr. Manuel Ângelo
Macarro, Vendas Novas.* A base só tem a vila.
Fonte: <https://www.coudelariaquintadahermida.com/localizacao>.

**Telefone — NÃO CONFIRMADO.** Não consegui achar telefone em fonte nenhuma. O
campo continua vazio, e é honesto que continue.

**Email — NÃO CONFIRMADO.** A base tem `info@coudelariaquintadahermida.com`.
Não achei nenhuma fonte que o confirme. Não digo que esteja errado — é um
padrão plausível e pode muito bem estar no rodapé do sítio —, digo que **não o
verifiquei**. Como está a ser publicado como via de contacto, merece uma
confirmação antes de se confiar nele.

**30 cavalos — NÃO CONFIRMADO.** Nenhuma fonte deu efectivo.

**Coordenadas — DIVERGE.** 38.6833, -8.4667 é mais um centróide arredondado
(38°41′ N, 8°28′ O): o centro de Vendas Novas. A quinta tem morada de rua, o
que a torna localizável com precisão. **Tenho a rua, não tenho o ponto.**

**Achado adicional:** a entidade aparece no directório da APSL como «Coisas do
Campo, Lda — Quinta da Hermida», sócio nº 445. Útil para quem quiser confirmar
contactos junto da associação.
Fonte: <https://www.cavalo-lusitano.com/pt/apsl/socios-apsl>.

---

## 9. Coudelaria Quinta dos Cedros

| Campo | Base de dados | Estado |
| --- | --- | --- |
| Localidade | Almargem do Bispo, Sintra, Lisboa | **CONFIRMADO** |
| Morada completa | (parcial) | **DIVERGE** — a base é incompleta |
| Sítio | coudelariaquintadoscedros.com | **CONFIRMADO** (indexado) |
| Telefone | +351 964 431 437 | **CONFIRMADO** |
| Fundação | 1995 | **NÃO CONFIRMADO** (e há indício contrário) |
| Nº de cavalos | 57 | **NÃO CONFIRMADO** |
| Coordenadas | 38.8563, -9.2819 | **NÃO CONFIRMADO** |
| Bruno e Adelino Carrilho | | **CONFIRMADO** (Bruno) / **NÃO CONFIRMADO** (Adelino) |
| Prémio: Imperador dos Cedros — Campeão Nacional 7 anos | | **CONFIRMADO** |

**Telefone — CONFIRMADO, e há um segundo.** `(+351) 964 431 437` (o da base —
confere) e `(+351) 219 622 127`. Email: `coudelariaquintadoscedros@gmail.com`.
Fonte: <https://www.coudelariaquintadoscedros.com/contactos>.

**Morada — DIVERGE (incompleta).** *Rua da Coudelaria, nº 30, Quinta dos
Cedros, Alfouvar de Baixo, 2715-212 Almargem do Bispo, Sintra.* A propriedade
tem 38 hectares e fica a 20 km de Lisboa, nas pastagens naturais da várzea de
Sintra. Funciona também como Centro de Alto Rendimento de Dressage e tem
clínica de reprodução equina.
Fontes: <https://www.coudelariaquintadoscedros.com/contactos>,
<https://www.coudelariaquintadoscedros.com/quintadoscedros>.
*Divergência menor entre fontes:* um directório dá a morada como «Quinta dos
**Lombos**, Alfouvar de Baixo» (<https://nossatelha.pt/coudelaria-quinta-dos-cedros-5361739684488560750/>),
em vez de «Quinta dos Cedros». Vale a pena confirmar qual é o topónimo correcto
antes de se escrever a morada completa.

**Fundação 1995 — NÃO CONFIRMADO, e com um indício em sentido contrário.** Não
achei fonte nenhuma para 1995. O que achei foi que a sociedade **Coudelaria
Quinta dos Cedros — Centro de Alto Rendimento, Lda** foi constituída em
**28/02/2012**.
Fontes: <https://www.dnb.com/business-directory/company-profiles.coudelaria_quinta_dos_cedros_-_centro_de_alto_rendimento_lda.af87bab5f21d468ebff66023097b0e50.html>,
<https://www.racius.com/coudelaria-quinta-dos-cedros-centro-de-alto-rendimento-lda/>.

**Isto não prova que 1995 está errado** — a data de constituição de uma
sociedade não é a data de início de uma criação, e é muitíssimo comum uma
coudelaria familiar existir anos antes de se formalizar numa Lda. Mas é o único
dado datado que existe, e aponta noutra direcção. Fica NÃO CONFIRMADO e é
pergunta directa ao dono.

**57 cavalos — NÃO CONFIRMADO.** Nenhuma fonte deu efectivo. É, de resto, o
número mais específico do lote (57, não «cerca de 60»), o que faz esperar uma
origem concreta que não encontrei.

**Bruno e Adelino Carrilho — parcialmente confirmado.** **Bruno** está
CONFIRMADO: «Bruno Miguel Rocha Carrilho» aparece como responsável principal da
sociedade, e a coudelaria é descrita como dirigida por Bruno e Adelino
Carrilho. **Adelino** fica NÃO CONFIRMADO: aparece no resumo agregado, mas não
consegui atribuí-lo a uma página concreta. Como são nomes de pessoas, aplico o
critério mais estrito.
Fontes: <https://www.coudelariaquintadoscedros.com/equipaquintadoscedros>,
<https://www.dnb.com/business-directory/company-profiles.coudelaria_quinta_dos_cedros_-_centro_de_alto_rendimento_lda.af87bab5f21d468ebff66023097b0e50.html>.

**Imperador dos Cedros — CONFIRMADO.** «A parelha venceu a divisão de 7 anos
no Campeonato Nacional de Cavalos Novos de Portugal de 2020.» É exactamente o
«Campeão Nacional 7 anos» da base. Mais detalhe corroborado: garanhão Lusitano
tordo, filho de **Rubi AR** e de **Cortiça** (por Hostil); estreou-se
internacionalmente aos 5 anos no CDI Alter do Chão de 2018 e **venceu todas as
oito provas de cavalos novos entre 2018 e 2020**; foi vendido a Manon Ackermann
e é montado pela cavaleira luxemburguesa Fie Christine Skarsøe; chegou a 39.º
no ranking dos 100 melhores cavalos do mundo, com 1,265 pontos.
Fontes: <https://eurodressage.com/2021/02/01/imperador-dos-cedros-first-lusitano-fie-skarsoe>,
<https://www.equisport.pt/noticias/imperador-dos-cedros-ruma-ao-luxemburgo/>,
<https://www.equisport.pt/noticias/10-cavalos-nascidos-em-portugal-entre-os-100-melhores-do-mundo/>.
*Nota:* o cavalo **já não pertence à coudelaria** (foi vendido e está no
Luxemburgo). Continua a ser um prémio legítimo da criação — foi criado ali —,
mas se a ficha der a entender que é um cavalo actual do plantel, engana.

**Coordenadas — NÃO CONFIRMADO.** 38.8563, -9.2819 fica na zona de Almargem do
Bispo e é plausível; ao contrário de outras, não tem a assinatura de centróide
arredondado, o que sugere que veio de uma medição. Mas não a validei contra
nada. **Tenho a rua e o número (Rua da Coudelaria, 30), que permitem apurá-la.**

---

# O que está errado e deve ser corrigido

Por ordem de gravidade — primeiro o que engana quem usa o site.

### Gravidade 1 — engana quem tenta contactar ou lá chegar

1. **JPR: apagar o telefone `+351 243 558 XXX`.** É um *placeholder* com X
   literais em produção. Sai hoje, com ou sem substituto. Candidato mais forte
   para o substituir: **917 025 648** (página de contactos do próprio sítio) —
   mas **não o ponha sem alguém abrir a página primeiro**, porque há três
   números em conflito entre o sítio e a APSL (§2).
2. **JPR: a localidade e as coordenadas apontam para o concelho errado.** A base
   diz Alpiarça (39.25, -8.5667); o sítio da coudelaria e o directório da APSL
   dizem **Herdade de Pancas — Monte dos Apupos, 2135-012 Samora Correia**, a
   **46,5 km** de distância. Quem seguir o mapa vai para outro concelho.
3. **Pedro Passanha: eliminar a segunda coordenada.** A coordenada
   **38.117, -8.067 é a boa** — está a 520 m da Herdade da Malhada Velha
   (38.119080, -8.061613, CP 7900-134). A outra, a 17,8 km, está errada.
4. **JPR: o email `info@jprlusitanos.com` não tem fonte.** As fontes dão
   **`jprlusitanos@sapo.pt`**. Uma mensagem enviada para um email errado
   perde-se em silêncio, que é a pior forma de falhar.
5. **Coordenadas que são centros de vila, não portões.** Quatro são
   demonstravelmente centróides de localidade, três delas com a assinatura
   inconfundível de graus-e-minutos arredondados:
   - **Manuel Veiga** 39.3667, -8.5333 → centro da Azinhaga (39°22′/8°32′)
   - **Ortigão Costa** 39.0667, -8.8667 → centro da Azambuja (39°04′/8°52′)
   - **Quinta da Hermida** 38.6833, -8.4667 → centro de Vendas Novas (38°41′/8°28′)
   - **João Lynce** 39.2369, -8.6868 → a 80 m do centro de Santarém

   Nos três primeiros casos a morada real é conhecida e permite fazer melhor:
   EN 365 km 65,5 (Veiga), Quinta da Fonte do Pinheiro (Ortigão Costa), Rua
   Dr. Manuel Ângelo Macarro (Hermida).

### Gravidade 2 — afirmações fortes sem fonte independente

6. **Ortigão Costa: «a maior coudelaria privada de exportação internacional».**
   É auto-declaração da coudelaria, sem qualquer fonte independente. Atribuir
   explicitamente («segundo a própria coudelaria») ou retirar.
7. **Ortigão Costa: «especialização única».** O «desde 1963» confirma-se; o
   «única» é auto-declaração de exclusividade mundial. Mesmo tratamento.
8. **Manuel Veiga: «Novilheiro — líder europeu em prémios de saltos (1983)».**
   As fontes separam o que a base junta: **1983 é o título britânico**; a
   liderança europeia aparece sem data ou associada a 1984. Corrigir para
   «Campeão Britânico de Saltos com John Whitaker (1983)», que é curto e
   inatacável.

### Gravidade 3 — dados incompletos ou desactualizados

9. **Luís Bastos: preencher o ano de fundação com 2006.** A contradição
   resolve-se: a história tinha razão.
10. **Manuel Veiga: preencher o ano de fundação com 1817.** Idem, e confirmado
    por duas fontes independentes.
11. **Ortigão Costa: «72 cavalos» não bate com as fontes** (58 éguas + 6
    garanhões). Além do valor, o método: um efectivo que muda todos os anos com
    os nascimentos não devia ser um número fixo numa ficha.
12. **Moradas incompletas.** Sete das nove fichas têm morada mais completa
    disponível do que a que está na base: João Lynce (Casal da Felicidade,
    EN 3, São Pedro, 2005-356 Santarém), JPR (Herdade de Pancas — Monte dos
    Apupos, 2135-012 Samora Correia), Luís Bastos (Quinta Casal das Faias,
    2070-503 Valada), Manuel Veiga (EN 365 km 65,5, Apartado 2, 2150-065
    Azinhaga), Ortigão Costa (Quinta da Fonte do Pinheiro, Apartado 13,
    2050-306 Azambuja), Quinta da Hermida (Rua Dr. Manuel Ângelo Macarro),
    Quinta dos Cedros (Rua da Coudelaria 30, Alfouvar de Baixo, 2715-212).
13. **Telefones e emails em falta que as fontes têm:** Luís Folgado
    (+351 211 368 474), Quinta dos Cedros (+351 219 622 127,
    coudelariaquintadoscedros@gmail.com), Ortigão Costa (263 403 919,
    917 232 410, jorgeoc@sogepoc.pt), Luís Bastos
    (info@coudelarialuisbastos.com), João Lynce (joaolynce@gmail.com).
14. **Luís Folgado: falta a segunda instalação** (Jardim da Coudelaria, Estoril).
    É por causa dela que as redes sociais dizem «Cascais» — sem isto na ficha, a
    incoerência parece um erro do portal.
15. **Manuel Veiga: o campo do sítio está vazio** e existe `quintadabroa.com`.
16. **Manuel Veiga: os contactos são das Casas da Piedade** (turismo rural), não
    demonstravelmente da coudelaria. Assinalar na ficha para não encaminhar
    compradores para a recepção do alojamento.
17. **Quinta dos Cedros: «Imperador dos Cedros» já não está na coudelaria** —
    foi vendido e está no Luxemburgo. O prémio é legítimo (foi criado ali), mas
    a ficha não deve dar a entender que é cavalo do plantel actual.
18. **Definir o que significa «número de cavalos».** Em pelo menos três fichas
    o valor da base corresponde ao **número de éguas** e não ao efectivo total
    (João Lynce: «20 éguas»; Luís Bastos: «12 éguas»; Ortigão Costa: «58
    éguas»). Ou o campo passa a chamar-se «éguas de criação», ou os valores
    estão sistematicamente subavaliados.

---

# O que não consegui confirmar — para perguntar ao dono do site

Estes campos **não são erros**. São informação em falta, e a resposta honesta é
perguntar a quem sabe.

**Anos de fundação**
- **Luís Folgado** — campo vazio. O sítio diz «há 25 anos», que é uma frase
  relativa sem data de redacção. Não se deve derivar daí um ano.
- **Quinta dos Cedros** — a base diz 1995 e não achei fonte nenhuma. O único
  dado datado que existe é a constituição da sociedade em **28/02/2012**, o que
  não desmente 1995 mas também não o apoia.

**Efectivos (nenhum confirmado)**
- JPR (50), Luís Folgado (35), Quinta da Hermida (30), Quinta dos Cedros (57),
  Pedro Passanha (30). Ortigão Costa (72) diverge das fontes (ver acima).

**Contactos**
- **JPR** — qual dos três números é o bom: 917 025 648 (sítio), 214 869 075 ou
  917 568 819 (APSL)? E o email é `jprlusitanos@sapo.pt` ou `info@…`?
- **Quinta da Hermida** — não há telefone em fonte nenhuma; e o email
  `info@coudelariaquintadahermida.com` que está na base não foi verificado.
- **Pedro Passanha** — o telemóvel da base (+351 919 830 258) não aparece em
  fonte nenhuma. Há um fixo nas fontes (284 755 120). Qual é o de contacto?
- **Quinta dos Cedros** — o topónimo é «Quinta dos Cedros» ou «Quinta dos
  Lombos»? As fontes divergem.

**Prémios (os mais delicados — são afirmações sobre pessoas e sobre animais)**
- **Manuel Veiga / NILO** — «Campeão dos Campeões, Golegã 1974». Confirmei que
  Nilo é cavalo de Manuel Tavares Veiga e figura central da raça (pai de
  Cagancho; da linhagem Firme/Nilo/Novilheiro). **Não confirmei o título nem o
  ano.**
- **Pedro Passanha / NUXEQUE** — «Golegã 1998». Confirmei que Nuxeque foi
  garanhão influente, mas **não o prémio nem o ano** — e note-se que o campo
  nem sequer diz *que* prémio foi.
- **JPR / João Pedro Rodrigues** — «Melhor Criador da Raça, FIPSL 2004» e
  «criador com mais Campeões dos Campeões da Golegã nos últimos 40 anos»
  apareceram nas fontes mas só em auto-descrição. Se se quiser usar, é NÃO
  CONFIRMADO.
- **Quinta dos Cedros / Adelino Carrilho** — Bruno Carrilho está confirmado;
  Adelino não consegui atribuir a uma página concreta.

**Coordenadas exactas (só tenho a vila ou a rua, não o portão)**
- **JPR** — tenho «Herdade de Pancas — Monte dos Apupos, 2135-012 Samora
  Correia». Não tenho o ponto, e a coordenada actual está no concelho errado.
- **Manuel Veiga** — tenho «EN 365, km 65,5». Um ponto quilométrico é
  determinável; a coordenada actual é a da aldeia.
- **Ortigão Costa** — tenho «Quinta da Fonte do Pinheiro»; a coordenada actual é
  a da vila.
- **Quinta da Hermida** — tenho «Rua Dr. Manuel Ângelo Macarro»; a coordenada
  actual é a da vila.
- **João Lynce** — tenho «Casal da Felicidade, EN 3, São Pedro»; a coordenada
  actual é o centro de Santarém.
- **Luís Bastos, Luís Folgado, Quinta dos Cedros** — as coordenadas são
  plausíveis mas não as validei contra fonte nenhuma. Para o Folgado há uma via
  limpa: a morada é o km 145,5 da EN 114.

**Estado dos sítios**
- **Não pude verificar se algum dos oito sítios está no ar hoje**, nem se algum
  domínio expirou ou mudou de mãos. Todos estão indexados com conteúdo coerente
  com a coudelaria respectiva, o que torna improvável que estejam mortos ou
  vendidos — mas «improvável» não é «verificado», e a ficha nº 5 (Manuel Veiga)
  nem sequer tem sítio na base.

---

# Nota honesta sobre os limites deste trabalho

**O que não foi feito, e é o essencial do que foi pedido:** não abri uma única
página. O proxy de rede deste ambiente bloqueia todo o acesso directo
(`EGRESS_BLOCKED` no `WebFetch` para todos os domínios testados, incluindo os
oito sítios das coudelarias, o `cavalo-lusitano.com` e a Wikipédia; `curl`
devolve `CONNECT tunnel failed, 403`). Só a pesquisa web funcionou.

**O que isso significa, em concreto:**

1. **Não verifiquei que os sítios respondem.** Só sei que estão indexados. Um
   domínio pode estar indexado e ter expirado ontem. O primeiro passo pedido —
   «confirma que o endereço responde e que é mesmo dela» — não foi cumprido em
   nenhuma das nove fichas.
2. **Todos os CONFIRMADO são de segunda mão.** Vêm de resumos automáticos de
   resultados de pesquisa, atribuídos a URLs que não li. Vi pelo menos um caso
   claro em que o resumo baralhou registos: na tabela de sócios da APSL,
   devolveu quatro números de sócio diferentes (1, 17, 425, 236) para a mesma
   entrada, o que mostra que estes resumos agregam linhas vizinhas. **Foi por
   isso que não escolhi um telefone para a JPR**, apesar de ter três
   candidatos: o campo onde o erro custa mais é exactamente aquele onde a
   ferramenta se mostrou menos fiável.
3. **Não distingui sempre fonte primária de secundária tão bem quanto queria.**
   Onde soube, disse-o — a página `/coudelaria` da JPR e a `/historia` da
   Ortigão Costa são auto-descrições, e tratei-as como tal. Mas quando o resumo
   agrega três URLs numa resposta, nem sempre consigo dizer qual frase veio de
   qual.
4. **Não consultei o Stud-Book da APSL.** Seria a fonte certa para os prémios
   de Nilo, Nuxeque e Perito e para as datas dos títulos, e tem acesso público
   (<https://www.cavalo-lusitano.com/pt/stud-book/acesso-publico-ao-stud-book>).
   Ficou por fazer por causa do bloqueio.
5. **Não confirmei nenhuma coordenada abrindo um mapa.** A única que dou como
   confirmada — a do Pedro Passanha — vem de directórios de códigos postais
   (`coordenadas.de`, `codigo-postal.pt`), que localizam o **topónimo** «Herdade
   da Malhada Velha», não o portão da coudelaria. 520 m de concordância com a
   base é um bom sinal, não é uma medição do portão.

**O que considero sólido, apesar disto:** o `XXX` da JPR é um defeito objectivo
e não precisa de fonte nenhuma para sair. A divergência de localidade da JPR
tem duas fontes independentes a apontar no mesmo sentido (o próprio sítio e a
APSL) e 46,5 km de erro é grande de mais para ser ruído. As coordenadas que são
centróides de vila identificam-se pela própria forma do número (graus e minutos
arredondados) e não dependem de fonte externa. E a discrepância do Pedro
Passanha resolve-se com aritmética simples entre dois números publicados.

**O que recomendo antes de se mexer na base:** repetir este trabalho num
ambiente com acesso à rede, abrindo as páginas de contactos dos oito sítios e o
directório de sócios da APSL. Este documento serve para saber **onde olhar** e
**o que perguntar** — não para substituir essa leitura. Nenhum valor daqui
deve ir para a base de dados sem alguém ter aberto o URL correspondente.

**Nada foi escrito na base de dados. Nenhuma migração foi corrida. Nenhum
ficheiro de código foi tocado. O único ficheiro criado é este.**
