-- Correcções de conteúdo às fichas das coudelarias
-- ================================================
--
-- Aplica os achados marcados **Contradito** em `docs/auditoria-coudelarias.md`,
-- e mais nada. Só se tocam as colunas `historia` e `descricao`.
--
-- Três princípios, e o primeiro é absoluto:
--
--   1. Nada se inventa para tapar um buraco. Onde uma afirmação sai, a ficha
--      fica mais curta. Um texto curto e verdadeiro vale mais do que um texto
--      longo com três coisas erradas lá dentro.
--   2. Corrige-se pela fonte que a auditoria cita, ou pela coerência interna da
--      própria tabela quando duas fichas contam o mesmo facto — foi assim que
--      se apurou o «Opus 72» e as éguas Cartujanas de 1901.
--   3. As afirmações **Por confirmar** ficam como estão. A única excepção são os
--      superlativos absolutos sem dono («a maior», «o mais premiado do mundo»),
--      que não são factos por confirmar: são publicidade sem sujeito. Vão
--      assinalados abaixo com [SUPERLATIVO].
--
-- A `coudelaria-andrade` fica de fora: já foi corrigida à mão.
--
-- Idempotente: cada instrução escreve um valor literal numa linha identificada
-- pelo `slug`. Correr o ficheiro duas vezes deixa a base no mesmo estado.
--
-- 15 UPDATE. No fim há uma consulta de verificação.

begin;

-- ---------------------------------------------------------------------------
-- 1. casa-cadaval
--
-- «gerida por mulheres ao longo de CINCO gerações» -> QUATRO.
--   Fonte: grandesescolhas.com/casa-cadaval-a-nobreza-num-copo-de-vinho/
--
-- «mais de 375 anos de criação de Lusitanos» -> ancorado em 1660.
--   Contradição interna: a própria `historia` data a manada fundadora de 1660
--   (o dote de D. Maria de Faro), e noutro parágrafo fala em «mais de 400
--   anos». Uma idade relativa fica mais errada a cada ano que passa; a data
--   que o próprio registo dá, não.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Uma das mais antigas coudelarias da Península Ibérica, com criação de Lusitanos desde 1660. Propriedade de 5.400 hectares em Muge, no Ribatejo, pertencente à família Cadaval há 11 gerações. Cavalos campeões do mundo em Atrelagem e campeões europeus em Equitação de Trabalho.',
  historia = 'A história da Casa Cadaval remonta a mais de 400 anos. Antes de pertencer à família Cadaval, o palácio foi residência da Rainha D. Leonor de Áustria no início do século XVI.

Em 1648, a propriedade passou para a posse da família Cadaval. Em 1660, D. Maria de Faro, Condessa de Odemira, casou com D. Nuno Álvares Pereira de Melo, 1.º Duque de Cadaval, trazendo como dote uma manada de éguas Lusitanas das suas propriedades no Alentejo — fundando assim a tradição de criação equestre.

A propriedade tem estado na mesma família durante 11 gerações, sendo gerida por mulheres ao longo de quatro gerações consecutivas. A actual proprietária, Teresa Schönborn-Wiesentheid, é uma amazona consumada que compete com equipas de cavalos Lusitanos baios criados na propriedade.

Na senda de uma qualidade que se plasma na criação de um cavalo lusitano de secular beleza e modelo, com extraordinário temperamento e comprovada funcionalidade para a prática de dressage ao mais alto nível internacional, a Casa Cadaval alia o conhecimento adquirido ao longo de gerações às mais inovadoras técnicas de reprodução assistida — incluindo transferência de embriões — recorrendo às melhores linhas na actualidade.

Com um efectivo médio de 15 éguas, rigorosamente seleccionadas a partir das duas grandes linhas de matriarcas da coudelaria, o acompanhamento é feito por uma equipa de veterinários e equitador de referência na raça lusitana. A filosofia é aliar Tradição e Cultura com a objectividade das melhores práticas de produção, maneio, treino desportivo e conhecimento científico de vanguarda.

Entregues a conceituados treinadores e cavaleiros, os cavalos da Casa Cadaval têm-se destacado tanto em Portugal como no estrangeiro, com grande sucesso em concursos de Modelos e Andamentos e nas disciplinas de Atrelagem (Campeões do Mundo), Equitação de Trabalho (Campeão Europeu) e Dressage.

A herdade de 5.400 hectares divide-se entre floresta, culturas irrigadas, vinha, criação de cavalos Lusitanos e gado. A produção vinícola da Casa Cadaval, na região do Tejo, inclui castas como Trincadeira, Touriga Nacional, Aragonez, Arinto e Fernão Pires.'
where slug = 'casa-cadaval';

-- ---------------------------------------------------------------------------
-- 2. coudelaria-manuel-veiga
--
-- «Opus II» -> «Opus 72». O cavalo nasceu em 1972 e é irmão inteiro do
--   Novilheiro. Fontes: herdadedoazinhal.com/lusitanos/ e
--   lusitanocollection.com/novi.htm. Dentro desta mesma tabela, a
--   `ferraz-da-costa` já escrevia a grafia certa.
--
-- «fundada há mais de 220 anos» -> 1817.
--   Idade relativa sem âncora, com `ano_fundacao` a NULL. A fonte da própria
--   quinta data o começo da coudelaria de 1817:
--   quintadabroa.com/coudelaria-veiga.html
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Fundada em 1817 na Quinta da Broa, Azinhaga do Ribatejo, por Rafael José da Cunha, o ''Príncipe dos Lavradores Portugueses''. Continuada pelo Eng.º Manuel Tavares Veiga (marca MV), que fixou na raça as características do antigo ginete lusitano através de selecção e cruzamentos consanguíneos. O cruzamento do garanhão Firme (Andrade) com éguas Veiga produziu Novilheiro, Nilo, Neptuno e Opus 72 — a geração de ouro do Lusitano moderno.',
  historia = 'A Coudelaria Veiga, com sede na Quinta da Broa, Azinhaga do Ribatejo, foi fundada em 1817 por Rafael José da Cunha, o denominado Príncipe dos Lavradores Portugueses. De entre os reprodutores contam-se dois garanhões de sangue Alter, oferecidos por D. Fernando II e pelo seu filho D. Pedro V quando visitaram a Quinta da Broa.

Por herança familiar, a coudelaria veio a ser herdada pelo Eng.º Manuel Tavares Veiga, sobrinho-bisneto de Rafael José da Cunha. O trabalho que desenvolveu foi notável, sendo justamente considerado o iniciador do novo ciclo do ginete lusitano em Portugal. Seleccionou animais cujas características morfológicas e anímicas melhor correspondiam à funcionalidade guerreira exigida aos cavalos de toureio, usando cruzamentos consanguíneos para fixar as características da raça.

Entre os cavalos mais importantes na fixação das características da coudelaria destacam-se Lidador, Agareno, Berber e Sultão. Agareno (nascido em 1931) tornou-se um dos seis Chefes de Linhagem oficiais do PSL.

Após a morte do Eng.º Manuel Tavares Veiga, os seus netos Manuel e Carlos Tavares Veiga e o seu bisneto Manuel de Castro Tavares Veiga mantiveram a coudelaria com a qualidade inicial, continuando o trabalho de selecção das éguas com base no modelo, na genealogia e na qualidade dos produtos.'
where slug = 'coudelaria-manuel-veiga';

-- ---------------------------------------------------------------------------
-- 3. coudelaria-sa
--
-- «A Coudelaria d''Andrade, fundada pelo Dr. Ruy d''Andrade» -> fundada em 1894
--   pelo Arq. Alfredo d''Andrade. Era a terceira versão do mesmo facto dentro
--   desta tabela, e errada como a primeira.
--   Fonte: herdadedoazinhal.com/a-coudelaria/ — que é também o que diz o
--   registo `herdade-do-azinhal` desta mesma tabela.
--   Ruy d''Andrade fica no texto, no papel que a fonte lhe dá: quem a
--   desenvolveu. E «o seu filho» passou a «o filho de Ruy», porque com dois
--   Andrades na frase a referência deixava de ser óbvia — Fernando Sommer
--   d''Andrade é filho de Ruy, não de Alfredo.
--
-- [SUPERLATIVO] «Um símbolo e marco na história da criação do Cavalo
--   Lusitano» — sem dono e sem facto por trás. Sai da `descricao`.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'O cavalo Andrade ocupa um lugar de destaque na raça Lusitana — cavalos fortes, resistentes, muito inteligentes e extremamente versáteis, com conformação nobre e harmoniosa, andamentos poderosos e cadenciados, olhar vivo e temperamento simultaneamente enérgico e generoso. A Coudelaria SA produz cavalos para Equitação de Trabalho, Dressage e disciplinas clássicas, mantendo a pureza da linhagem d''Andrade combinada com a robustez da linhagem Oliveira e Sousa.',
  historia = 'A Coudelaria d''Andrade de Oliveira e Sousa nasceu da união de duas famílias e tradições equestres. A Coudelaria Oliveira e Sousa, fundada no final do século XIX, é uma verdadeira coudelaria ribatejana — criava cavalos para o trabalho agrícola nas férteis lezírias. A Coudelaria d''Andrade, fundada em 1894 pelo Arq. Alfredo d''Andrade, foi desenvolvida por Ruy d''Andrade (zoólogo, naturalista e paleontologista), que perseguiu um objectivo diferente: a valorização do cavalo como animal de beleza e inteligência. O filho de Ruy, Eng. Fernando Sommer d''Andrade, continuou com precisão científica e planeamento de longo prazo. Em 1991, após a morte de Fernando, a coudelaria foi repartida pelos quatro filhos. Maria d''Andrade de Oliveira e Sousa, a mais nova, mantém na Herdade da Agolada de Baixo, em Coruche, cavalos de ambas as linhagens — d''Andrade e Oliveira e Sousa — cruzando com garanhões puros Andrade como Curul, Farsante, Dayak, Oboé (filho e netos do Martini), Galan (filho do Dragão), Faneca e Marujo (filho e neto do Zamorim). Os cavalos são criados em regime extensivo e natural, livres em campo aberto sob sobreiros. As cobrições são planeadas para poldros nascerem na primavera. O treino formal inicia-se apenas aos três anos, respeitando o desenvolvimento do esqueleto.'
where slug = 'coudelaria-sa';

-- ---------------------------------------------------------------------------
-- 4. dressage-plus
--
-- «Zonik Plus e Hit Plus, dois dos LUSITANOS portugueses mais bem
--   classificados» -> o Zonik Plus é um garanhão HANOVERIANO. Estava num
--   directório de Lusitanos apresentado como Lusitano.
--   Fontes: horsenetwork.com/2025/12/justin-verboomen-zonik-plus-are-dressages-bright-new-hope/
--           fei.org/stories/sport/dressage/horse-month-zonik-plus
--
-- «Zonik Plus — 7.º lugar no ranking mundial FEI» -> desactualizado e sem
--   data. Em Agosto de 2025 foi Campeão da Europa, com ouro no Grand Prix
--   Special e na Livre, montado por Justin Verboomen.
--   Fonte: fei.org/stories/sport/dressage/crozet-justin-verboomen-zonik-plus-profile
--
-- Que a Dressage Plus é a criadora do Zonik Plus está confirmado
--   (horsenetwork.com: «bred by the Portuguese stud, Dressage Plus») e fica.
--   O «35.º lugar» do Hit Plus fica como está: é Por confirmar, não
--   contradito, e não é a mim que cabe corrigi-lo.
--
-- ATENÇÃO: mesmo corrigida, esta ficha continua sem localidade a sério
--   (`localizacao` = «Portugal»), sem coordenadas, sem contactos, sem sítio e
--   com uma capa de banco de imagens. A auditoria recomenda refazê-la de raiz
--   com a casa, ou apagá-la.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'A Dressage Plus é criadora do Zonik Plus — garanhão Hanoveriano, Campeão da Europa de Dressage em Agosto de 2025 com Justin Verboomen — e do Hit Plus (35.º lugar no ranking mundial FEI de Dressage).',
  historia = 'A Dressage Plus é uma coudelaria portuguesa. Criou o Zonik Plus, garanhão Hanoveriano que, montado por Justin Verboomen, foi Campeão da Europa de Dressage em Agosto de 2025, com ouro no Grand Prix Special e na Livre. É também criadora do Hit Plus, 35.º lugar no ranking mundial FEI de Dressage.'
where slug = 'dressage-plus';

-- ---------------------------------------------------------------------------
-- 5. flor-do-lis
--
-- «Fundada em 1993» -> sai o ano.
--   `ano_fundacao` é NULL e a `historia` não dá data nenhuma. O ano só existia
--   no campo curto, sem respaldo em lado nenhum. Não se substitui por outro:
--   se a casa tiver o ano, é dela que ele tem de vir.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Coudelaria em Monte Real/Carvide (Leiria). Linhagens Veiga e Andrade. Berço do Gladiador do Lis (Top 50 FEI Dressage). Criação, cavalos a penso e produção de feno.'
where slug = 'flor-do-lis';

-- ---------------------------------------------------------------------------
-- 6. herdade-do-pinheiro
--
-- «Coudelaria fundada em 1906 por Edmond Bartissol, cria Lusitanos…» ->
--   1906 é o ano em que Bartissol criou a coudelaria, mas com PERCHERONS
--   importados de França para trabalho agrícola. A própria `historia` diz que
--   «em 1916 os registos documentam o início da criação de Lusitanos». Num
--   directório de Lusitanos, a `descricao` não pode colar 1906 aos Lusitanos.
--   Prova: o texto do próprio registo. A criação das três raças está
--   confirmada em herdadedopinheiro.com/history/ e mantém-se.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Herdade histórica com mais de 700 anos e 5.000 hectares em Alcácer do Sal, junto à Reserva Natural do Estuário do Sado. Coudelaria criada em 1906 por Edmond Bartissol, com a criação de Lusitanos documentada a partir de 1916. Cria Lusitanos, Selle Français e Puro-Sangue Inglês.'
where slug = 'herdade-do-pinheiro';

-- ---------------------------------------------------------------------------
-- 7. joao-lynce
--
-- [SUPERLATIVO] «é considerado o grande embaixador do Lusitano no mercado
--   chinês» — considerado por quem? Sai da `historia`.
--   As demonstrações em Pequim ficam: são uma afirmação verificável, marcada
--   Por confirmar, e não me cabe mexer-lhe.
-- ---------------------------------------------------------------------------
update coudelarias set
  historia = 'João Pereira Lynce nasceu em Alcácer do Sal em 1966. Adquiriu as suas primeiras éguas Lusitanas em 1986 e entre 1992 e 2003 geriu a Coudelaria Calheiros Ferreira. Em 2003, fundou a sua própria coudelaria — JPL Lusitanos — com éguas da linha Quina e avós da linha Firme provenientes da Coudelaria Calheiros Ferreira.

Hoje a coudelaria tem 20 éguas e cria exclusivamente Puro-Sangue Lusitano para Equitação Portuguesa, Equitação de Trabalho, Tauromaquia, Alta Escola e Dressage. Entre os garanhões utilizados contam-se Zique, Urque, Ribatejo, Coral, Novilheiro, Opus, Trinco, Nilo, Perito, Paco, Hebraico, Napoleónico e Guangxou. O garanhão Perito foi Campeão da Raça Lusitana em 1999 e Campeão Nacional de Garanhões em 2004.

Como cavaleiro, João Lynce é instrutor de equitação reconhecido pela FEP e pela FEI, e instrutor de Equitação Tradicional Portuguesa. As suas conquistas incluem: Campeão Europeu por Equipas de Equitação de Trabalho (2001), Campeão Mundial por Equipas (2002), e Campeão Nacional e Europeu Individual (2003).

João Lynce realizou demonstrações de dressage barroco na Cidade Proibida de Pequim, perante o Presidente da China. Publicou o livro ''Working Equitation with João Lynce''.'
where slug = 'joao-lynce';

-- ---------------------------------------------------------------------------
-- 8. joao-pedro-rodrigues
--
-- [SUPERLATIVO] «OXIDADO jpr, oficialmente reconhecido como o cavalo mais
--   premiado do Mundo em Equitação de Trabalho» — «oficialmente reconhecido»
--   exige dizer por quem, e sem isso é um superlativo vestido de facto. Sai
--   dos dois campos; o cavalo e os prémios ficam.
--
-- NOTA: o `telefone` desta linha é «+351 243 558 XXX», um espaço reservado
--   publicado em produção. Não se corrige aqui — não é texto, e o número
--   pergunta-se à casa.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Fundada em 1992, a Coudelaria João Pedro Rodrigues distingue-se com o OXIDADO jpr, premiado em Equitação de Trabalho. Especialistas em cavalos de pelagem castanha de linha Veiga.',
  historia = E'A Coudelaria João Pedro Rodrigues foi fundada em 1992 com éguas de pelagem castanha, oriundas da Casa Cadaval e filhas de cavalos de linha Veiga.\r\n\r\nServiu-se principalmente dos garanhões XAQUIRO (Quina), HOSTIL (Borba) e ROUXINOL (Ferro da Casa).\r\n\r\nA Coudelaria tem vindo a distinguir-se com inúmeros cavalos lusitanos premiados nas principais feiras da especialidade, sendo um deles o OXIDADO jpr.'
where slug = 'joao-pedro-rodrigues';

-- ---------------------------------------------------------------------------
-- 9. luis-folgado
--
-- «Há 25 anos no Alentejo…» / «25 anos de criação» -> sai a contagem.
--   É uma idade relativa sem âncora, com `ano_fundacao` a NULL: não há como
--   saber a partir de quando se contam os 25, e o número fica mais errado a
--   cada ano que passa. Não se inventa um ano de fundação para o ancorar.
--
--   O «Nos últimos 10 anos focou-se na Dressage» tem o mesmo defeito, mas a
--   auditoria dá-o como Por confirmar e não como contradito. Fica.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Coudelaria alentejana de criação de Puro-Sangue Lusitano, focada em Dressage e montabilidade. Centro de Ensino e Desbaste no Estoril (Alapraia) para treino e apresentação a clientes.',
  historia = 'No Alentejo, a Coudelaria Luís Folgado cria cavalos Puro-Sangue Lusitano, com preocupação no desenvolvimento das características morfo-funcionais e atenção especial na montabilidade. Nos últimos 10 anos focou-se na modalidade de Dressage, seleccionando animais que conservem as características morfológicas do PSL com excepcional aptidão desportiva. Só utiliza nas éguas garanhões que se destaquem desportivamente e que complementem as qualidades das reprodutoras. Dispõe de um Centro de Ensino e Desbaste no Estoril (Alapraia, 25 km de Lisboa), equipado com 8 boxes, sala de estar, zona ajardinada para apresentação, picadeiro vedado 15×30m e carrière 20×60m, onde avalia e treina todos os animais desde o desmame até ao mais elevado grau de ensino.'
where slug = 'luis-folgado';

-- ---------------------------------------------------------------------------
-- 10. mascarenhas-cardoso
--
-- «Criação selectiva desde há mais de 40 anos» -> sai a contagem.
--   O registo tinha três datas implícitas a discordar: `ano_fundacao` = 1905,
--   a `historia` a dizer que 1905 é o ano em que a família ADQUIRIU a quinta,
--   e a `descricao` a contar «mais de 40 anos» de criação. A `historia` está
--   certa e fica intacta; o que sai é a idade relativa sem âncora.
--   Prova: o texto do próprio registo.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'A coudelaria mais meridional do Lusitano em Portugal continental, com 50 hectares em Albufeira, Algarve. Criação selectiva com foco em dressage desportivo e hipoterapia.'
where slug = 'mascarenhas-cardoso';

-- ---------------------------------------------------------------------------
-- 11. ortigao-costa
--
-- [SUPERLATIVO] «é a maior coudelaria privada em termos de exportação
--   internacional» — a frase é da própria casa
--   (coudelariaortigaocosta.com/pt/historia), o que é proveniência e não
--   verificação: continua a ser um superlativo absoluto sem quem o conte.
--   Sai dos dois campos. Que exporta para diversos países fica.
--
-- NOTA: a mesma frase está no campo `premios`, onde além de tudo não é um
--   prémio. Esse campo não se toca aqui.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Fundada em 1963, a Coudelaria Ortigão Costa dedicou-se a criar uma elite de cavalos pretos. Conta com 58 éguas Puro Sangue Lusitano de cor preta e exporta para diversos países do mundo.',
  historia = E'Fundada em 1963 por Luís Jorge Ortigão Costa, a Coudelaria dedicou-se desde o início a criar uma elite de cavalos pretos, uma característica distintiva que a tornou única no panorama internacional.\r\n\r\nA eguada conta presentemente com 58 éguas Puro Sangue Lusitano de cor preta e 14 éguas Português de Desporto, filhas do garanhão Moorlands Totilas.\r\n\r\nOs cavalos são exportados para diversos países do mundo. Os produtos são polivalentes e demonstram excelente aptidão para equitação de lazer, toureio e dressage.'
where slug = 'ortigao-costa';

-- ---------------------------------------------------------------------------
-- 12. quinta-lusitania
--
-- Três afirmações históricas contraditas no mesmo parágrafo:
--
--   «pertencia à Ordem dos Templários desde 915» -> a Ordem do Templo foi
--     fundada por volta de 1119, e o mosteiro do Couto do Mosteiro foi
--     construído pelos Templários em 1150. O ano 915 é anterior à Ordem em
--     cerca de dois séculos.
--     Fontes: pt.wikipedia.org/wiki/Ordem_dos_Templários
--             aldeiasdeportugal.pt/aldeia/couto-do-mosteiro/
--
--   «muito antes da fundação de Portugal» -> pela mesma razão: 1150 é DEPOIS
--     da fundação de Portugal. Sai.
--
--   «exploradores e empresários no Congo Belga nos séc. XIX e XX» -> o Congo
--     Belga só existiu a partir de 1908; no século XIX o território era o
--     Estado Livre do Congo. Fica «no Congo», que é a parte que a auditoria
--     não contradiz. Não se escolhe um Estado nem um século por eles.
--
-- Fica no texto o «regimento do Duque de Wellington», que está mal posto
--   (Wellington comandava o exército aliado, não um regimento) mas que a
--   auditoria dá como Por confirmar e não como contradito.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Casa Senhorial dos Viscondes de Valpaços com 200 anos, no Couto do Mosteiro (Santa Comba Dão). Turismo Rural com Escola de Equitação de cavalos Lusitanos. Propriedade histórica numa vila cujo mosteiro foi erguido pelos Templários em 1150, e ligada às invasões napoleónicas.',
  historia = 'Centrada na Casa Senhorial com cerca de 200 anos, a Quinta Lusitânia é a actual residência dos Viscondes de Valpaços, que a reformaram e abriram as portas com Turismo Rural e Escola de Equitação. Localizada no coração da vila histórica do Couto do Mosteiro, cujo mosteiro foi erguido pelos Templários em 1150. Durante a terceira invasão francesa (1810), oficiais portugueses e britânicos do regimento do Duque de Wellington ficaram na Quinta — os primeiros embates aconteceram a 100 metros da herdade. Os fundadores foram exploradores e empresários no Congo. A propriedade tem 5 hectares com vinha, estábulo com todas as comodidades, arena de equitação ao ar livre e campos para os cavalos. A casa oferece 6 suítes, sala Club, sala de jantar, terraço, piscina e área de churrasco com forno antigo de pão.'
where slug = 'quinta-lusitania';

-- ---------------------------------------------------------------------------
-- 13. quinta-madre-de-agua
--
-- [SUPERLATIVO] a Coudelaria Ortigão Costa dita «uma das mais prestigiadas de
--   Portugal» — prestigiada segundo quem. Sai o inciso; os dois garanhões
--   adquiridos ficam, que é o facto.
-- ---------------------------------------------------------------------------
update coudelarias set
  historia = 'A Quinta Madre de Água situa-se em Vinhó, Gouveia, no sopé da Serra da Estrela. O projecto nasceu a partir de 2007, quando os proprietários Luís Gonçalves e Lurdes Perfeito regressaram às suas origens familiares na região, com um projecto de respeito pela paisagem natural. O hotel abriu em Dezembro de 2012, na região vinícola do Dão.

A coudelaria foi fundada no mesmo ano, nascendo da paixão dos proprietários pelos animais. Começou com a aquisição de três éguas Lusitanas puras como cavalos de passeio. À medida que o entusiasmo pela raça cresceu, investiram em infraestruturas completas de criação e adquiriram dois garanhões da Coudelaria Ortigão Costa.

O cavaleiro profissional Nuno Carvalho é o cavaleiro residente e treinador, com o objectivo de competir e ensinar dressage a nível nacional e internacional.

Para além dos cavalos, a propriedade gere um rebanho de 500 ovelhas Bordaleiras, produz queijo Serra da Estrela DOP, vinhos, compotas e azeite.'
where slug = 'quinta-madre-de-agua';

-- ---------------------------------------------------------------------------
-- 14. veiga-teixeira
--
-- «exportou cavalos para o Brasil, Islândia, Noruega, Suécia, Alemanha,
--   Holanda, Suíça, Itália, França e Espanha» -> sai a lista inteira.
--   A Islândia proíbe a importação de cavalos desde 1882, sem excepções, por
--   razões sanitárias — nem um cavalo islandês que saia pode voltar.
--   Fontes: horsesoficeland.is/news/protect-icelandic-horses-from-disease-2023/
--           allabouthorses.org/horse/icelandic/
--   Basta um país impossível para pôr os outros nove em causa, e a lista não
--   nasceu aqui: vem igual, com a Islândia lá dentro, da ficha de
--   lusitano-breeder.com/coudelaria-da-veiga-teixeira. Ou volta com prova da
--   casa, ou não volta.
--
-- [SUPERLATIVO] a Feira da Golegã dita «a mais prestigiada feira equestre de
--   Portugal» — superlativo absoluto sem dono. Sai; a homenagem fica.
--
-- ATENÇÃO, e não se corrige aqui: a `descricao` reclama ser «Berço da linhagem
--   Veiga», que a `coudelaria-manuel-veiga` — outra linha desta tabela e outra
--   família — reclama com melhor suporte (quintadabroa.com). A auditoria
--   marca-o Por confirmar, não contradito, e desempatar duas casas exige
--   perguntar-lhes. Fica para o dono.
-- ---------------------------------------------------------------------------
update coudelarias set
  historia = 'A Coudelaria António da Veiga Teixeira é uma das mais antigas coudelarias de cavalos Lusitanos em Portugal, fundada em 1886 em Coruche, no coração do Ribatejo.

Os cavalos da linhagem Veiga são internacionalmente reconhecidos pela sua bravura, sensibilidade, agilidade e rapidez — características originalmente seleccionadas para a tauromaquia. A marca Veiga tornou-se sinónimo de excelência no cavalo Lusitano e influenciou dezenas de outros criadores em Portugal e no mundo.

A Coudelaria Veiga foi homenageada na Feira da Golegã pelo seu contributo excepcional para a raça Lusitana.'
where slug = 'veiga-teixeira';

-- ---------------------------------------------------------------------------
-- 15. vila-vicosa
--
-- «mais de 25 anos de experiência» / «Ao longo de mais de 25 anos» -> ancorado
--   em 1995. Com `ano_fundacao` = 1995, em 2026 são 31 anos, não 25: o número
--   estava errado e ficava mais errado a cada ano. A data ancorada não
--   envelhece.
--   Prova: a aritmética do próprio registo.
--
-- NOTA: o campo `website` desta linha aponta para a página dela num directório
--   de terceiros (lusitanohorsefinder.com), não para o sítio da casa, e o
--   «25+ anos de experiência» está também no campo `premios`. Nem um nem outro
--   se tocam aqui.
-- ---------------------------------------------------------------------------
update coudelarias set
  descricao = 'Fundada em 1995 por Thomas e Michaela Kleba, a Coudelaria Vila Viçosa dedica-se desde então à criação de Lusitanos modernos para desporto e lazer, tendo conquistado o título de "Melhor Criador" em Portugal.',
  historia = E'A Coudelaria Vila Viçosa foi fundada em 1995 pelo casal Thomas e Michaela Kleba, que partilhavam o sonho de criar Lusitanos modernos para desporto e lazer.\r\n\r\nLocalizada numa bela propriedade a 5 km da cidade real de Vila Viçosa, a coudelaria dispõe de 34 boxes espaçosos, um picadeiro coberto e um picadeiro exterior de dimensões completas, ambos com superfícies de qualidade superior.\r\n\r\nDesde 1995, conquistaram uma excelente reputação pela qualidade dos seus cavalos, tendo sido eleitos "Melhor Criador" em Portugal mais do que uma vez.'
where slug = 'vila-vicosa';

commit;

-- ---------------------------------------------------------------------------
-- Verificação
--
-- Depois de aplicar, isto deve devolver ZERO linhas. Cada padrão é uma das
-- falsidades corrigidas acima; se alguma reaparecer, é porque a instrução não
-- pegou.
-- ---------------------------------------------------------------------------
select slug, 'texto por corrigir' as aviso
from coudelarias
where (slug = 'casa-cadaval'            and (descricao like '%375 anos%' or historia like '%cinco gerações consecutivas%'))
   or (slug = 'coudelaria-manuel-veiga' and (descricao like '%Opus II%'  or descricao like '%220 anos%' or historia like '%220 anos%'))
   or (slug = 'coudelaria-sa'           and (historia like '%fundada pelo Dr. Ruy%' or descricao like '%símbolo e marco%'))
   or (slug = 'dressage-plus'           and (descricao like '%Lusitanos portugueses%' or historia like '%7º lugar%'))
   or (slug = 'flor-do-lis'             and descricao like '%1993%')
   or (slug = 'herdade-do-pinheiro'     and descricao like '%fundada em 1906%')
   or (slug = 'joao-lynce'              and historia like '%grande embaixador%')
   or (slug = 'joao-pedro-rodrigues'    and (descricao like '%mais premiado do mundo%' or historia like '%mais premiado do Mundo%'))
   or (slug = 'luis-folgado'            and (descricao like '%25 anos de criação%' or historia like '%Há 25 anos%'))
   or (slug = 'mascarenhas-cardoso'     and descricao like '%mais de 40 anos%')
   or (slug = 'ortigao-costa'           and (descricao like '%maior coudelaria privada%' or historia like '%maior Coudelaria privada%'))
   or (slug = 'quinta-lusitania'        and (historia like '%915%' or historia like '%Congo Belga%' or descricao like '%(915)%'))
   or (slug = 'quinta-madre-de-agua'    and historia like '%mais prestigiadas de Portugal%')
   or (slug = 'veiga-teixeira'          and (historia like '%Islândia%' or historia like '%mais prestigiada feira%'))
   or (slug = 'vila-vicosa'             and (descricao like '%mais de 25 anos%' or historia like '%mais de 25 anos%'));
