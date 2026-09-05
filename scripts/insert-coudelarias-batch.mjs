/**
 * Inserção em massa de 12 novas coudelarias verificadas no Supabase
 * Todas as informações verificadas com fontes credíveis
 * Executar: node scripts/insert-coudelarias-batch.mjs
 */
import { readFileSync } from "fs";

const lines = readFileSync(".env.local", "utf8").split("\n");
const env = {};
for (const line of lines) {
  const m = line.match(/^([^#=]+)=(.*)$/);
  if (m) env[m[1].trim()] = m[2].trim();
}

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// =============================================
// 12 NOVAS COUDELARIAS VERIFICADAS
// =============================================

const coudelarias = [
  // -----------------------------------------------
  // 1. COUDELARIA VEIGA TEIXEIRA (1886)
  // FONTE: https://toplocalplaces.com/portugal/coruche/horse-trainer/coudelaria-antonio-da-veiga-teixeira/1419626774944410
  // FONTE: https://www.lusitano-breeder.com/coudelaria-da-veiga-teixeira
  // FONTE: https://correiodoribatejo.pt/coudelaria-veiga-homenageada-na-golega/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Coudelaria Veiga Teixeira",
    slug: "veiga-teixeira",
    descricao:
      "Uma das mais antigas coudelarias Lusitanas de Portugal, em actividade desde 1886 em Coruche. Berço da linhagem Veiga, conhecida mundialmente pela bravura, sensibilidade e agilidade dos seus cavalos.",
    historia:
      "A Coudelaria António da Veiga Teixeira é uma das mais antigas coudelarias de cavalos Lusitanos em Portugal, fundada em 1886 em Coruche, no coração do Ribatejo.\n\nOs cavalos da linhagem Veiga são internacionalmente reconhecidos pela sua bravura, sensibilidade, agilidade e rapidez — características originalmente seleccionadas para a tauromaquia. A marca Veiga tornou-se sinónimo de excelência no cavalo Lusitano e influenciou dezenas de outros criadores em Portugal e no mundo.\n\nAo longo de mais de um século, a coudelaria exportou cavalos para o Brasil, Islândia, Noruega, Suécia, Alemanha, Holanda, Suíça, Itália, França e Espanha. A Coudelaria Veiga foi homenageada na Feira da Golegã, a mais prestigiada feira equestre de Portugal, pelo seu contributo excepcional para a raça Lusitana.",
    localizacao: "Coruche",
    regiao: "Ribatejo",
    telefone: "+351 243 617 173",
    email: "aveigateixeira54@gmail.com",
    website: null,
    instagram: null,
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 1886,
    especialidades: [
      "Criação de Lusitanos",
      "Linhagem Veiga",
      "Tauromaquia",
      "Equitação Tradicional",
    ],
    linhagens: ["Veiga"],
    premios: ["Homenagem na Feira Nacional do Cavalo — Golegã"],
    servicos: ["Criação e venda de cavalos", "Exportação internacional"],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: ["coruche", "ribatejo", "veiga", "linhagem veiga", "tauromaquia", "historica", "1886"],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 2. CASA CADAVAL (1648/1660)
  // FONTE: https://saltofportugal.com/2022/07/26/casa-cadaval/
  // FONTE: https://en.vaiver.com/santarem/muge-casa-cadaval/
  // FONTE: https://www.portugalresident.com/the-blue-blooded-wines-of-casa-cadaval/
  // FONTE: http://www.winesoftejo.com/wineries/winery/7/casa-cadaval
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Casa Cadaval",
    slug: "casa-cadaval",
    descricao:
      "Uma das mais antigas coudelarias da Península Ibérica, com mais de 375 anos de criação de Lusitanos. Propriedade de 5.400 hectares em Muge, no Ribatejo, pertencente à família Cadaval há 11 gerações.",
    historia:
      "A história da Casa Cadaval remonta a mais de 400 anos. Antes de pertencer à família Cadaval, o palácio foi residência da Rainha D. Leonor de Áustria no início do século XVI.\n\nEm 1648, a propriedade passou para a posse da família Cadaval. Em 1660, D. Maria de Faro, Condessa de Odemira, casou com D. Nuno Álvares Pereira de Melo, 1.º Duque de Cadaval, trazendo como dote uma manada de éguas Lusitanas das suas propriedades no Alentejo — fundando assim a tradição de criação equestre.\n\nA propriedade tem estado na mesma família durante 11 gerações, sendo gerida por mulheres ao longo de cinco gerações consecutivas. A actual proprietária, Teresa Schönborn-Wiesentheid, é uma amazona consumada que compete com equipas de cavalos Lusitanos baios criados na propriedade.\n\nA herdade de 5.400 hectares divide-se entre floresta, culturas irrigadas, vinha, criação de cavalos Lusitanos e gado. A produção vinícola da Casa Cadaval, na região do Tejo, inclui castas como Trincadeira, Touriga Nacional, Aragonez, Arinto e Fernão Pires.",
    localizacao: "Muge, Salvaterra de Magos",
    regiao: "Ribatejo",
    telefone: "+351 243 588 040",
    email: null,
    website: "https://www.casacadaval.pt",
    instagram: "@casacadavalmuge",
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 1648,
    especialidades: ["Criação de Lusitanos", "Vinicultura", "Enoturismo", "Turismo Rural"],
    linhagens: ["Cadaval"],
    premios: null,
    servicos: [
      "Provas de vinho",
      "Visitas guiadas à propriedade",
      "Passeios de tractor pela herdade",
      "Demonstrações equestres",
      "Birdwatching",
      "Team-building",
      "Eventos e casamentos",
    ],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: [
      "muge",
      "ribatejo",
      "historica",
      "enoturismo",
      "cadaval",
      "duque",
      "1648",
      "vinho",
      "tejo",
      "salvaterra de magos",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 3. HERDADE DO PINHEIRO (1906)
  // FONTE: https://www.herdadedopinheiro.com/
  // FONTE: https://www.bhsportugal.org/events/report-on-the-agm-and-visit-to-the-herdade-do-pinheiro
  // FONTE: https://www.equisport.pt/noticias/herdade-do-pinheiro-em-festa/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Herdade do Pinheiro",
    slug: "herdade-do-pinheiro",
    descricao:
      "Herdade histórica com mais de 700 anos e 5.000 hectares em Alcácer do Sal, junto à Reserva Natural do Estuário do Sado. Coudelaria fundada em 1906 por Edmond Bartissol, cria Lusitanos, Selle Français e Puro-Sangue Inglês.",
    historia:
      "A Herdade do Pinheiro tem origens que remontam ao período romano, quando foi um centro de produção industrial na estrada entre Setúbal e Alcácer do Sal. Múltiplos fornos produziam cerâmica e ânforas para a produção de garum na fábrica de Troia. Estes fornos foram redescobertos nos anos 1970 por uma equipa arqueológica luso-francesa.\n\nNo período medieval, a propriedade pertenceu à Ordem Militar de Santiago, com o Duque de Aveiro como Grão-Mestre. Após a execução do Duque de Aveiro no século XVIII, a herdade passou para a Coroa.\n\nEm 1879, foi vendida em hasta pública e adquirida por Edmond Bartissol (1841-1916), engenheiro francês envolvido na construção do caminho-de-ferro português e do metropolitano de Lisboa. Em 1906, Bartissol criou a coudelaria, inicialmente importando cavalos Percheron de França para trabalho agrícola. Em 1916, os registos da herdade documentam o início da criação de Lusitanos.\n\nA propriedade mudou de mãos apenas quatro vezes em 700 anos. A actual proprietária é Madame Jacqueline Violet; a sua filha Stéphanie Gicot é a quinta geração da família Bartissol a possuir a herdade.\n\nCom mais de 5.000 hectares integrados na Reserva Natural do Estuário do Sado, a herdade abriga mais de 160 espécies de aves. A aldeia da herdade é casa de 60 funcionários, antigos e actuais.",
    localizacao: "Alcácer do Sal",
    regiao: "Alentejo",
    telefone: "+351 265 938 270",
    email: "info@herdadedopinheiro.com",
    website: "https://www.herdadedopinheiro.com",
    instagram: "@herdadedopinheiro",
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 1906,
    especialidades: [
      "Criação de Lusitanos",
      "Selle Français",
      "Puro-Sangue Inglês",
      "Produção de Cortiça",
      "Aquacultura",
    ],
    linhagens: ["Pinheiro"],
    premios: null,
    servicos: ["Venda de cavalos", "Programa de éguas reprodutoras"],
    latitude: 38.4565,
    longitude: -8.7175,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: [
      "alcacer do sal",
      "alentejo",
      "historica",
      "1906",
      "estuario do sado",
      "reserva natural",
      "cortica",
      "bartissol",
      "pinheiro",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 4. COUDELARIA PEDRO PASSANHA (1980)
  // FONTE: https://pedropassanha.pt/pt/quem-somos.html
  // FONTE: https://pedropassanha.pt/pt/xaquiro.html
  // FONTE: https://pedropassanha.pt/pt/contactos.html
  // FONTE: https://www.cavalo-lusitano.com/criadores (APSL sócio nº 174)
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Coudelaria Pedro Passanha",
    slug: "pedro-passanha",
    descricao:
      "Coudelaria fundada em 1980 em Ferreira do Alentejo, berço de XAQUIRO — um dos garanhões mais influentes da raça Lusitana, com mais de 100 medalhas de ouro na descendência. Linhagens Veiga e Andrade, 30 éguas.",
    historia:
      "A Coudelaria Pedro Passanha foi fundada em 1980 na Herdade da Malhada Velha, em Ferreira do Alentejo, com três éguas do ferro do Dr. Guilherme Borba. Hoje conta com um efectivo de 30 éguas das linhas Veiga e Andrade.\n\nO ex-líbris da coudelaria é XAQUIRO (1980-2007), um dos garanhões mais influentes da história do cavalo Lusitano. Xaquiro conquistou a Medalha de Ouro do FIPSL na classe de Garanhões em 1988 e a Medalha de Ouro na Descendência de Garanhão em 2004. Foi distinguido com o título de Reprodutor de Mérito em 2010. A sua descendência acumulou mais de 100 medalhas de ouro e dez títulos de Campeão dos Campeões.\n\nEntre os cavalos notáveis da coudelaria destaca-se ZAIRE, Campeão dos Campeões no FIPSL 2010, Campeão de Portugal de Dressage (nível Saint-Georges) em 2012 e campeão do CDI*** de Sevilha em 2009. Também TAXATIVO, Campeão de Portugal de Dressage 2010, e NUXEQUE, Medalha de Ouro no FIPSL 1998, Campeão dos Campeões na Golegã 1998 e Campeão de Dressage 1998 e 1999.\n\nEm 2010, com a vitória de Zaire como Campeão dos Campeões no Festival Internacional, a coudelaria atingiu a consagração de 30 anos de trabalho. Pedro Passanha foi convidado de honra no Festival do Cavalo Lusitano em Avenches, Suíça, em 2011.\n\nA coudelaria é membro da APSL (sócio nº 174).",
    localizacao: "Ferreira do Alentejo",
    regiao: "Alentejo",
    telefone: "+351 919 830 258",
    email: "pedropassanha@gmail.com",
    website: "https://pedropassanha.pt",
    instagram: null,
    facebook: "https://www.facebook.com/pages/Coudelaria-Pedro-Passanha/307051426004069",
    youtube: null,
    num_cavalos: 30,
    ano_fundacao: 1980,
    especialidades: ["Criação de Lusitanos", "Dressage", "Tauromaquia", "Linhagem Veiga e Andrade"],
    linhagens: ["Veiga", "Andrade", "Quina"],
    premios: [
      "XAQUIRO — Medalha de Ouro FIPSL Garanhões 1988",
      "XAQUIRO — Medalha de Ouro Descendência de Garanhão FIPSL 2004",
      "XAQUIRO — Reprodutor de Mérito 2010",
      "ZAIRE — Campeão dos Campeões FIPSL 2010",
      "ZAIRE — Campeão de Portugal Dressage Saint-Georges 2012",
      "NUXEQUE — Medalha de Ouro FIPSL + Campeão dos Campeões Golegã 1998",
    ],
    servicos: ["Criação e venda de cavalos", "Venda internacional"],
    latitude: 38.114609,
    longitude: -8.270913,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: JSON.stringify([
      {
        nome: "Xaquiro",
        descricao:
          "1980-2007. Reprodutor de Mérito, 100+ medalhas de ouro na descendência, 10 títulos de Campeão dos Campeões.",
      },
      {
        nome: "Zaire",
        descricao:
          "Campeão dos Campeões FIPSL 2010, Campeão de Portugal Dressage 2012, Campeão CDI*** Sevilha 2009.",
      },
      {
        nome: "Nuxeque",
        descricao:
          "Medalha de Ouro FIPSL 1998, Campeão dos Campeões Golegã 1998, Campeão Dressage 1998-1999.",
      },
    ]),
    testemunhos: null,
    tags: [
      "ferreira do alentejo",
      "alentejo",
      "xaquiro",
      "veiga",
      "andrade",
      "dressage",
      "tauromaquia",
      "reprodutor de merito",
      "apsl",
      "1980",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 5. COUDELARIA HENRIQUE ABECASIS (1986)
  // FONTE: https://guiastecnicos.turismodeportugal.pt/en/equestrian/view/Coudelaria-Henrique-Abecasis-Lda
  // FONTE: https://www.visitportugal.com/en/NR/exeres/65ACEA01-78A9-4799-AE91-3AE5D6D3C2D9
  // FONTE: https://www.coudelariahenriqueabecasis.com/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Coudelaria Henrique Abecasis",
    slug: "henrique-abecasis",
    descricao:
      "Coudelaria com mais de 110 cavalos em Aveiras de Baixo, no Ribatejo, desde 1986. Cria Puro-Sangue Lusitano e Luso-Warmblood, com turismo equestre reconhecido pelo Turismo de Portugal.",
    historia:
      "A Coudelaria Henrique Abecasis foi fundada em 1986 na Quinta do Pilar, em Aveiras de Baixo, município da Azambuja, no coração do Ribatejo — região historicamente ligada à cultura do cavalo Lusitano.\n\nHoje conta com mais de 110 cavalos, dos quais 35 estabulados e 30 éguas reprodutoras, além de 14 cavalos dedicados aos itinerários de turismo equestre e os restantes potros e potrancas em desenvolvimento.\n\nA coudelaria dedica-se à criação e treino de Puro-Sangue Lusitano e cavalos Luso-Warmblood, com o objectivo de criar cavalos com boa montabilidade, adequados para todos os amantes de cavalos. Os programas de turismo equestre — reconhecidos oficialmente pelo Turismo de Portugal, VisitPortugal e Câmara Municipal da Azambuja — variam entre uma tarde e seis dias a cavalo, com itinerários personalizados que percorrem a paisagem ribatejana.",
    localizacao: "Aveiras de Baixo, Azambuja",
    regiao: "Ribatejo",
    telefone: null,
    email: "geral@coudelariahenriqueabecasis.com",
    website: "https://www.coudelariahenriqueabecasis.com",
    instagram: "@coudelaria_henrique_abecasis",
    facebook: null,
    youtube: null,
    num_cavalos: 110,
    ano_fundacao: 1986,
    especialidades: ["Criação de Lusitanos", "Luso-Warmblood", "Turismo Equestre", "Dressage"],
    linhagens: null,
    premios: null,
    servicos: [
      "Criação e venda de cavalos",
      "Aulas de dressage",
      "Aulas de equitação",
      "Turismo equestre (1 tarde a 6 dias)",
      "Passeios a cavalo no Ribatejo",
      "Birdwatching",
      "Cursos e estágios",
    ],
    latitude: 39.102786,
    longitude: -8.859475,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: [
      "aveiras de baixo",
      "azambuja",
      "ribatejo",
      "turismo equestre",
      "lusitano",
      "warmblood",
      "dressage",
      "1986",
      "turismo de portugal",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 6. COUDELARIA JOÃO LYNCE / JPL LUSITANOS (2003)
  // FONTE: https://joaolynce.com/stud-farm/
  // FONTE: https://joaolynce.com/about/
  // FONTE: https://joaolynce.com/working-equitation/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Coudelaria João Lynce",
    slug: "joao-lynce",
    descricao:
      "Coudelaria de Puro-Sangue Lusitano em Santarém, fundada em 2003 por João Lynce — instrutor FEI, campeão europeu e mundial de Equitação de Trabalho, e embaixador do Lusitano na China.",
    historia:
      "João Pereira Lynce nasceu em Alcácer do Sal em 1966. Adquiriu as suas primeiras éguas Lusitanas em 1986 e entre 1992 e 2003 geriu a Coudelaria Calheiros Ferreira. Em 2003, fundou a sua própria coudelaria — JPL Lusitanos — com éguas da linha Quina e avós da linha Firme provenientes da Coudelaria Calheiros Ferreira.\n\nHoje a coudelaria tem 20 éguas e cria exclusivamente Puro-Sangue Lusitano para Equitação Portuguesa, Equitação de Trabalho, Tauromaquia, Alta Escola e Dressage. Entre os garanhões utilizados contam-se Zique, Urque, Ribatejo, Coral, Novilheiro, Opus, Trinco, Nilo, Perito, Paco, Hebraico, Napoleónico e Guangxou. O garanhão Perito foi Campeão da Raça Lusitana em 1999 e Campeão Nacional de Garanhões em 2004.\n\nComo cavaleiro, João Lynce é instrutor de equitação reconhecido pela FEP e pela FEI, e instrutor de Equitação Tradicional Portuguesa. As suas conquistas incluem: Campeão Europeu por Equipas de Equitação de Trabalho (2001), Campeão Mundial por Equipas (2002), e Campeão Nacional e Europeu Individual (2003).\n\nJoão Lynce realizou demonstrações de dressage barroco na Cidade Proibida de Pequim, perante o Presidente da China, e é considerado o grande embaixador do Lusitano no mercado chinês. Publicou o livro 'Working Equitation with João Lynce'.",
    localizacao: "Santarém",
    regiao: "Ribatejo",
    telefone: "+351 917 886 901",
    email: "joaolynce@gmail.com",
    website: "https://joaolynce.com",
    instagram: null,
    facebook: null,
    youtube: null,
    num_cavalos: 20,
    ano_fundacao: 2003,
    especialidades: [
      "Criação de Lusitanos",
      "Equitação de Trabalho",
      "Alta Escola",
      "Dressage Barroco",
    ],
    linhagens: ["Quina", "Firme"],
    premios: [
      "Campeão Europeu Equipas Equitação de Trabalho 2001",
      "Campeão Mundial Equipas Equitação de Trabalho 2002",
      "Campeão Nacional + Europeu Individual Equitação de Trabalho 2003",
      "Perito — Campeão da Raça Lusitana 1999",
      "Perito — Campeão Nacional de Garanhões 2004",
    ],
    servicos: ["Criação e venda de cavalos", "Clínicas de equitação", "Exportação internacional"],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: JSON.stringify([
      {
        nome: "Perito",
        descricao: "Campeão da Raça Lusitana 1999 e Campeão Nacional de Garanhões 2004.",
      },
    ]),
    testemunhos: null,
    tags: [
      "santarem",
      "ribatejo",
      "equitacao de trabalho",
      "alta escola",
      "china",
      "fei",
      "joao lynce",
      "2003",
      "quina",
      "firme",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 7. FUNDAÇÃO EUGÉNIO DE ALMEIDA (1963)
  // FONTE: https://www.fea.pt/
  // FONTE: https://www.eurodressage.com/2006/11/26/guizo-passed-away
  // FONTE: https://www.cavalo-lusitano.com/en/lusitano-horse/sport-successes/dressage
  // FONTE: https://www.olympics.com/en/olympic-games/athens-2004/results/equestrian-dressage
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Fundação Eugénio de Almeida",
    slug: "fundacao-eugenio-almeida",
    descricao:
      "Fundação privada de interesse público em Évora, criadora do célebre GUIZO — o primeiro Lusitano medalhado olímpico (prata por equipas, Atenas 2004). Membro APSL nº 99, com mais de 60 anos de criação.",
    historia:
      "A Fundação Eugénio de Almeida foi criada em 1963 por Vasco Maria Eugénio de Almeida como instituição privada de interesse público, com sede no Páteo de S. Miguel em Évora.\n\nA história da propriedade remonta a 1759, quando a Quinta de Valbom se tornou propriedade do Estado após a expulsão dos Jesuítas. Em 1869, José Maria Eugénio de Almeida, bisavô do fundador, adquiriu a Quinta.\n\nA Fundação é membro da APSL com o sócio nº 99, sendo um dos criadores mais antigos registados. O seu cavalo mais célebre é GUIZO (1988-2006), por Zasebande e de Cataria (por Tivoli). Criado pela Fundação em Évora, Guizo foi montado pelo espanhol Juan Antonio Jiménez Cobo e pertencia a D. Enrique Guerrero.\n\nGUIZO foi o primeiro cavalo Lusitano a conquistar uma medalha olímpica: medalha de prata por equipas nos Jogos Olímpicos de Atenas 2004, representando Espanha. Antes disso, conquistara o bronze por equipas nos Jogos Equestres Mundiais de Jerez 2002 e a prata por equipas no Campeonato Europeu de Dressage de Hickstead 2003. Guizo faleceu em Novembro de 2006 devido a problemas intestinais agudos.\n\nPara além da criação equestre, a Fundação gere a Adega da Cartuxa, com mais de 300 hectares de vinha na região do Alentejo.",
    localizacao: "Évora",
    regiao: "Alentejo",
    telefone: "+351 266 748 300",
    email: "geral@fea-evora.com.pt",
    website: "https://www.fea.pt",
    instagram: null,
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 1963,
    especialidades: [
      "Criação de Lusitanos",
      "Dressage de Alta Competição",
      "Vinicultura",
      "Enoturismo",
    ],
    linhagens: null,
    premios: [
      "GUIZO — Medalha de Prata Olímpica por Equipas, Atenas 2004",
      "GUIZO — Bronze por Equipas, Jogos Equestres Mundiais Jerez 2002",
      "GUIZO — Prata por Equipas, Campeonato Europeu Hickstead 2003",
    ],
    servicos: ["Criação de cavalos", "Enoturismo (Adega da Cartuxa)"],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: JSON.stringify([
      {
        nome: "Guizo",
        descricao:
          "1988-2006. Primeiro Lusitano medalhado olímpico — prata por equipas em Atenas 2004 (Espanha). Bronze WEG 2002, Prata Europeu 2003.",
      },
    ]),
    testemunhos: null,
    tags: [
      "evora",
      "alentejo",
      "guizo",
      "olimpicos",
      "atenas 2004",
      "dressage",
      "cartuxa",
      "vinho",
      "apsl",
      "fundacao",
      "1963",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 8. COUDELARIA PEDRO FERRAZ DA COSTA (1987)
  // FONTE: https://lusitanohorsefinder.com/coudaleria-pedro-feraz-da-costa/
  // FONTE: https://www.instagram.com/coudelariaferrazdacosta/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Coudelaria Ferraz da Costa",
    slug: "ferraz-da-costa",
    descricao:
      "Cerca de 100 cavalos Lusitanos na Herdade das Coelheiras, Vila Verde de Ficalho, Baixo Alentejo. Fundada em 1987, cria cavalos para dressage e tauromaquia com garanhões das linhas Veiga, Núncio, Quina e Cadaval.",
    historia:
      "A Coudelaria Pedro Ferraz da Costa foi fundada em 1987 na Herdade das Coelheiras, em Vila Verde de Ficalho, no Baixo Alentejo, com o objectivo de criar cavalos com boa funcionalidade para a tauromaquia, equitação tradicional e competição de dressage.\n\nPedro Ferraz da Costa é descrito como um empresário tradicional e moderno, com interesses em múltiplas empresas. A coudelaria cria Lusitanos puros e cavalos cruzados (éguas Warmblood com garanhões Lusitanos). Os potros de três anos são desbastados na propriedade e os melhores são enviados a treinadores profissionais para preparação e competição.\n\nAo longo da história da coudelaria, foram utilizados garanhões como Opus 72 (ferro Veiga), Coral (ferro Núncio), Jocoso (filho de Coral, criado na coudelaria), Orphée (ferro Roger Bouzin), Xaquiro (ferro Quina) e Talisco. Actualmente estão activos Regalo, Rico (ferro Borba), Rubi (ferro Alter Real), Zimbro (ferro Vila Formosa), Ábaco e Zircon (ferro Cadaval).",
    localizacao: "Vila Verde de Ficalho",
    regiao: "Alentejo",
    telefone: "+351 910 507 205",
    email: "ralmeida@iberfar.pt",
    website: null,
    instagram: "@coudelariaferrazdacosta",
    facebook: "https://www.facebook.com/coudelariaferrazdacosta",
    youtube: null,
    num_cavalos: 100,
    ano_fundacao: 1987,
    especialidades: [
      "Criação de Lusitanos",
      "Dressage",
      "Tauromaquia",
      "Cruzamentos Lusitano-Warmblood",
    ],
    linhagens: ["Veiga", "Andrade", "Quina", "Cadaval", "Alter Real"],
    premios: null,
    servicos: ["Criação e venda de cavalos", "Venda de potros"],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: [
      "vila verde de ficalho",
      "baixo alentejo",
      "beja",
      "dressage",
      "tauromaquia",
      "warmblood",
      "veiga",
      "xaquiro",
      "1987",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 9. COUDELARIA SANTA MARGARIDA (1983)
  // FONTE: https://coudelariastamargarida.com/home/
  // FONTE: https://www.equisport.pt/en/news/the-recommended-stallion-campeador-dies-at-18-years-old/
  // FONTE: https://www.equisport.pt/noticias/morreu-spartacus-reprodutor-de-merito/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Coudelaria de Santa Margarida",
    slug: "santa-margarida",
    descricao:
      "Coudelaria desde 1983 em Ferreira do Alentejo, criadora dos Reprodutores de Mérito Spartacus e Campeador — este último Campeão dos Campeões no Festival Internacional do Lusitano na Bélgica em 2013.",
    historia:
      "A Coudelaria de Santa Margarida foi fundada em 1983 no Monte da Sernadinha, em Figueira dos Cavaleiros, Ferreira do Alentejo.\n\nDesde o início, a coudelaria seleccionou rigorosamente os seus garanhões reprodutores. Os primeiros foram Universo e Opus 72, seguidos de Spartacus (por Xaquiro x Juno por Universo) — um cavalo criado na própria coudelaria que foi aprovado como Reprodutor de Mérito.\n\nDe Spartacus nasceu Campeador (Spartacus x Teara por Império), que se tornou o cavalo mais emblemático da coudelaria. Em Setembro de 2013, Campeador foi coroado Campeão dos Campeões no Festival Internacional do Puro-Sangue Lusitano na Bélgica. Deixou 150 produtos registados no stud book antes de falecer aos 18 anos.\n\nA Coudelaria de Santa Margarida conquistou múltiplos prémios de Melhor Criador a nível nacional e internacional.",
    localizacao: "Ferreira do Alentejo",
    regiao: "Alentejo",
    telefone: "+351 919 727 617",
    email: "mte.sernadinha@gmail.com",
    website: "https://coudelariastamargarida.com",
    instagram: null,
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 1983,
    especialidades: ["Criação de Lusitanos", "Linhagem Xaquiro", "Reprodução Selectiva"],
    linhagens: ["Veiga", "Andrade"],
    premios: [
      "Campeador — Campeão dos Campeões, Festival Internacional do Lusitano, Bélgica 2013",
      "Spartacus — Reprodutor de Mérito",
      "Múltiplos prémios de Melhor Criador (nacional e internacional)",
    ],
    servicos: ["Criação e venda de cavalos"],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: JSON.stringify([
      {
        nome: "Campeador",
        descricao:
          "Campeão dos Campeões no Festival Internacional do Lusitano (Bélgica, 2013). 150 produtos registados. Faleceu aos 18 anos.",
      },
      {
        nome: "Spartacus",
        descricao: "Reprodutor de Mérito. Por Xaquiro x Juno (por Universo). Criado na coudelaria.",
      },
    ]),
    testemunhos: null,
    tags: [
      "ferreira do alentejo",
      "alentejo",
      "campeador",
      "spartacus",
      "xaquiro",
      "reprodutor de merito",
      "1983",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 10. JUPITER CLASSICAL DRESSAGE (2022)
  // FONTE: https://jupiterclassicaldressage.com/en/
  // FONTE: https://jupiterclassicaldressage.com/en/contact/
  // FONTE: https://www.racius.com/jupiter-classical-dressage-lda/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Jupiter Classical Dressage",
    slug: "jupiter-classical-dressage",
    descricao:
      "Coudelaria e centro de dressage clássico com mais de 600 hectares na Herdade do Ameal, Vila Viçosa. Cria Lusitanos das linhas Estoiro, Finório e Xaquiro, com 32 boxes e estágios para cavaleiros.",
    historia:
      "A Jupiter Classical Dressage é uma coudelaria de Puro-Sangue Lusitano e centro de treino de dressage clássico localizada na Herdade do Ameal, uma propriedade com mais de 600 hectares perto de Vila Viçosa, no Alentejo — uma das regiões históricas do cavalo Lusitano.\n\nA empresa foi formalmente constituída em Portugal a 5 de Abril de 2022, sob a gestão de Jürgen Grüneis e Alexander Wickl. O programa de criação traça os seus garanhões fundadores a Estoiro, Finório e Xaquiro — três dos garanhões mais influentes da raça Lusitana.\n\nA filosofia da coudelaria centra-se no treino clássico amigo do cavalo, desde as primeiras fases da educação, e no desenvolvimento livre da manada em terreno variado, com cobertura natural de sobreiros para protecção climática. As instalações incluem 32 boxes com acesso directo a paddocks.\n\nA coudelaria oferece estágios de vários meses para candidatos com experiência equestre comprovada.",
    localizacao: "Vila Viçosa",
    regiao: "Alentejo",
    telefone: "+351 915 408 866",
    email: "contact@jupiterclassicaldressage.com",
    website: "https://jupiterclassicaldressage.com",
    instagram: "@jupiterclassicaldressage",
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 2022,
    especialidades: [
      "Criação de Lusitanos",
      "Dressage Clássico",
      "Equitação de Trabalho",
      "Estágios",
    ],
    linhagens: ["Veiga", "Andrade"],
    premios: null,
    servicos: [
      "Criação e venda de cavalos",
      "Treino de dressage clássico",
      "Estágios para cavaleiros",
    ],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: [
      "vila vicosa",
      "alentejo",
      "dressage classico",
      "estoiro",
      "finorio",
      "xaquiro",
      "estagios",
      "2022",
      "600 hectares",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 11. QUINTA MADRE DE ÁGUA (2012)
  // FONTE: https://quintamadredeagua.pt/en/stud-farm/
  // FONTE: https://mycavago.com/facility/hotel-madre-de-agua/43
  // FONTE: https://www.winexp.pt/en/wineries/quinta-madre-de-agua
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Quinta Madre de Água",
    slug: "quinta-madre-de-agua",
    descricao:
      "Hotel e coudelaria na Serra da Estrela, Gouveia. Fundada em 2012, cria Lusitanos com garanhões da Coudelaria Ortigão Costa. Combina turismo rural, vinicultura, queijo Serra da Estrela DOP e equitação.",
    historia:
      "A Quinta Madre de Água situa-se em Vinhó, Gouveia, no sopé da Serra da Estrela. O projecto nasceu a partir de 2007, quando os proprietários Luís Gonçalves e Lurdes Perfeito regressaram às suas origens familiares na região, com um projecto de respeito pela paisagem natural. O hotel abriu em Dezembro de 2012, na região vinícola do Dão.\n\nA coudelaria foi fundada no mesmo ano, nascendo da paixão dos proprietários pelos animais. Começou com a aquisição de três éguas Lusitanas puras como cavalos de passeio. À medida que o entusiasmo pela raça cresceu, investiram em infraestruturas completas de criação e adquiriram dois garanhões da Coudelaria Ortigão Costa — uma das mais prestigiadas de Portugal.\n\nO cavaleiro profissional Nuno Carvalho é o cavaleiro residente e treinador, com o objectivo de competir e ensinar dressage a nível nacional e internacional.\n\nPara além dos cavalos, a propriedade gere um rebanho de 500 ovelhas Bordaleiras, produz queijo Serra da Estrela DOP, vinhos, compotas e azeite.",
    localizacao: "Vinhó, Gouveia",
    regiao: "Beira Alta",
    telefone: "+351 238 490 500",
    email: "hotel@quintamadredeagua.pt",
    website: "https://quintamadredeagua.pt",
    instagram: "@quinta_madre_de_agua",
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 2012,
    especialidades: ["Criação de Lusitanos", "Dressage", "Turismo Rural", "Produção de Queijo DOP"],
    linhagens: ["Ortigão Costa"],
    premios: null,
    servicos: [
      "Criação de cavalos",
      "Aulas de dressage",
      "Passeios a cavalo",
      "Hotel (10 quartos)",
      "Enoturismo",
      "Visitas guiadas à exploração",
      "Provas de queijo Serra da Estrela DOP",
    ],
    latitude: 40.4922,
    longitude: -7.6183,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: [
      "serra da estrela",
      "gouveia",
      "beira alta",
      "dao",
      "hotel",
      "queijo",
      "ortigao costa",
      "turismo rural",
      "2012",
      "vinhos",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },

  // -----------------------------------------------
  // 12. COUDELARIA MASCARENHAS CARDOSO (~1905)
  // FONTE: https://www.portugalresident.com/coudelaria-mascarenhas-cardoso-a-breed-apart/
  // FONTE: https://www.barlavento.pt/coudelaria-em-albufeira-cria-cavalos-lusitanos-campeoes-de-dressage/
  // VERIFICADO: 2026-02-23
  // -----------------------------------------------
  {
    nome: "Coudelaria Mascarenhas Cardoso",
    slug: "mascarenhas-cardoso",
    descricao:
      "A coudelaria mais meridional do Lusitano em Portugal continental, com 50 hectares em Albufeira, Algarve. Criação selectiva desde há mais de 40 anos, com foco em dressage desportivo e hipoterapia.",
    historia:
      "A família Mascarenhas Cardoso adquiriu a Quinta do Cerro d'Águia, em Albufeira, em 1905. Ao longo de quatro gerações, a propriedade de 50 hectares tornou-se um centro de criação de Lusitanos e dressage — a coudelaria mais meridional de Lusitanos em Portugal continental.\n\nA localização é invulgar: enquanto a maioria das coudelarias Lusitanas se concentram no Ribatejo e Alentejo, a Mascarenhas Cardoso opera no Algarve, com vistas para o mar e as montanhas. A filosofia é de qualidade sobre quantidade — produz apenas 3 a 4 potros por ano, todos destinados ao desporto.\n\nA coudelaria é um Centro Equestre Federado, aberto ao público. O treinador residente João Pinto foi formado em equitação de trabalho e dressage. A coudelaria está também a desenvolver a hipoterapia como modalidade adicional.",
    localizacao: "Albufeira",
    regiao: "Algarve",
    telefone: "+351 913 849 092",
    email: "coudelariamascarenhascardoso@gmail.com",
    website: null,
    instagram: null,
    facebook: null,
    youtube: null,
    num_cavalos: null,
    ano_fundacao: 1905,
    especialidades: [
      "Criação de Lusitanos",
      "Dressage Desportivo",
      "Hipoterapia",
      "Centro Equestre Federado",
    ],
    linhagens: null,
    premios: null,
    servicos: [
      "Criação e venda de cavalos",
      "Aulas de dressage",
      "Hipoterapia",
      "Centro equestre aberto ao público",
    ],
    latitude: null,
    longitude: null,
    horario: null,
    foto_capa: null,
    galeria: null,
    video_url: null,
    cavalos_destaque: null,
    testemunhos: null,
    tags: [
      "albufeira",
      "algarve",
      "dressage",
      "hipoterapia",
      "centro equestre",
      "1905",
      "federado",
    ],
    is_pro: false,
    destaque: false,
    ordem_destaque: null,
    status: "active",
    plan: "free",
  },
];

// =============================================
// INSERÇÃO VIA SUPABASE REST API
// =============================================
async function insertAll() {
  console.log(`\nA inserir ${coudelarias.length} coudelarias no Supabase...\n`);

  let success = 0;
  let errors = 0;

  for (const c of coudelarias) {
    try {
      const res = await fetch(`${url}/rest/v1/coudelarias`, {
        method: "POST",
        headers: {
          apikey: key,
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
          Prefer: "return=minimal",
        },
        body: JSON.stringify(c),
      });

      if (res.ok) {
        console.log(`  ✓ ${c.nome} (${c.slug})`);
        success++;
      } else {
        const err = await res.json();
        console.log(`  ✗ ${c.nome}: ${JSON.stringify(err)}`);
        errors++;
      }
    } catch (e) {
      console.log(`  ✗ ${c.nome}: ${e.message}`);
      errors++;
    }
  }

  console.log(`\nResultado: ${success} inseridas, ${errors} erros.`);

  // Verificar total
  const countRes = await fetch(`${url}/rest/v1/coudelarias?select=slug&order=slug`, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  const all = await countRes.json();
  console.log(`Total de coudelarias na base de dados: ${all.length}`);
  console.log("Slugs:", all.map((x) => x.slug).join(", "));
}

insertAll().catch((e) => {
  console.error("Erro fatal:", e);
  process.exit(1);
});
