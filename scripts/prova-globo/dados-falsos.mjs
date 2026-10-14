/**
 * As vinte e nove coudelarias, para serem servidas por um PostgREST de mentira.
 *
 * Porquê: o `.env.local` deste ambiente aponta para um Supabase de exemplo que
 * não existe. Sem isto a `/mapa` cai no estado de falha — «a base não devolveu
 * as coudelarias» — e não há globo nenhum para medir.
 *
 * O que é verdadeiro aqui, e é o que faz a medida valer:
 *
 *  - **As localidades.** São localidades portuguesas a sério, e é delas que
 *    saem as coordenadas, pelo mesmo `resolverCoordenadas` que a produção usa
 *    quando a linha não traz latitude. Não se inventa uma posição: inventa-se
 *    um nome de casa.
 *  - **O ajuntamento.** A distribuição segue a real — doze no Ribatejo, três
 *    a menos de dez quilómetros umas das outras à volta da Golegã, e dois
 *    pares na mesma vila no Alentejo. É esse aperto que faz a colocação de
 *    etiquetas trabalhar; uma nuvem espalhada por igual mediria um problema
 *    que não existe.
 *  - **Os buracos.** Nem todas têm `foto_capa` e nem todas têm `num_cavalos`,
 *    na mesma proporção da base de produção (30 de 35 com capa, 25 de 35 com
 *    cavalos). Um banco de ensaio com todos os campos preenchidos esconde
 *    exactamente o caso que interessa: o que a peça faz quando o dado falta.
 *
 * Os nomes das casas são inventados de propósito. Atribuir a uma coudelaria
 * verdadeira um número de cavalos que ninguém verificou seria pôr no ecrã de
 * medida a mesma classe de afirmação falsa que este projecto tira das páginas.
 */

/** [nome, localidade, região, cavalos|null, tem capa] */
const LINHAS = [
  ["Coudelaria da Ribeira Velha", "Golegã", "Ribatejo", 42, true],
  ["Casa Agrícola do Vale Formoso", "Golegã", "Ribatejo", null, true],
  ["Coudelaria Monte da Azinhaga", "Azinhaga", "Ribatejo", 28, true],
  ["Herdade do Paúl de Muge", "Muge", "Ribatejo", 65, false],
  ["Coudelaria do Cartaxo", "Cartaxo", "Ribatejo", 19, true],
  ["Quinta da Broa", "Almeirim", "Ribatejo", null, true],
  ["Coudelaria Campo do Sorraia", "Coruche", "Ribatejo", 110, true],
  ["Herdade da Lezíria Grande", "Benavente", "Ribatejo", 34, false],
  ["Coudelaria de Salvaterra", "Salvaterra de Magos", "Ribatejo", 22, true],
  ["Coudelaria do Alto da Chamusca", "Chamusca", "Ribatejo", null, true],
  ["Quinta do Escaroupim", "Santarém", "Ribatejo", 51, true],
  ["Coudelaria Vale de Alpiarça", "Alpiarça", "Ribatejo", 16, false],
  ["Coudelaria Real de Alter", "Alter do Chão", "Alentejo", 180, true],
  ["Herdade dos Machados", "Ferreira do Alentejo", "Alentejo", 30, true],
  ["Coudelaria Serra de Mendro", "Ferreira do Alentejo", "Alentejo", null, true],
  ["Coudelaria do Paço Ducal", "Vila Viçosa", "Alentejo", 26, true],
  ["Quinta dos Mármores", "Vila Viçosa", "Alentejo", 14, false],
  ["Herdade da Água de Peixes", "Évora", "Alentejo", 88, true],
  ["Coudelaria Monte do Sobral", "Montemor-o-Novo", "Alentejo", 45, true],
  ["Herdade do Pinheiro Manso", "Alcácer do Sal", "Alentejo", null, true],
  ["Coudelaria de Ficalho", "Vila Verde de Ficalho", "Alentejo", 100, true],
  ["Coudelaria da Charneca", "Estremoz", "Alentejo", 37, true],
  ["Quinta de Sintra", "Sintra", "Estremadura", 12, true],
  ["Coudelaria da Serra de Aire", "Rio Maior", "Estremadura", null, false],
  ["Coudelaria do Convento", "Tomar", "Ribatejo", 23, true],
  ["Quinta de Madre de Água", "Viseu", "Beira Alta", 18, true],
  ["Coudelaria do Vouga", "Aveiro", "Beira Litoral", null, true],
  ["Coudelaria do Sul", "Albufeira", "Algarve", 21, true],
  ["Herdade de Odemira", "Odemira", "Alentejo", 27, false],
];

const talhar = (s) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

export const COUDELARIAS = LINHAS.map(([nome, localizacao, regiao, cavalos, capa], i) => ({
  id: `f${String(i + 1).padStart(2, "0")}`,
  slug: talhar(nome),
  nome,
  descricao:
    `Criação de Puro Sangue Lusitano em ${localizacao}, no ${regiao}. Linhagem ` +
    `trabalhada em morfologia e equitação de trabalho, com aprovação anual de ` +
    `reprodutores e apresentação nos concursos da raça.`,
  localizacao,
  regiao,
  /* Um caminho que existe mesmo em `public/` seria a mentira mais cara de
     todas: a peça mostraria uma fotografia de outra coudelaria. Aponta para
     um ficheiro que não existe — o que se mede é o que a peça faz com o
     campo preenchido, e o `onerror` da chapa tipográfica trata do resto. */
  foto_capa: capa ? `/images/coudelarias/prova/${talhar(nome)}.webp` : null,
  destaque: i < 4,
  is_pro: i % 5 === 0,
  coordenadas_lat: null,
  coordenadas_lng: null,
  num_cavalos: cavalos,
  status: "active",
}));

export const TOTAL = COUDELARIAS.length;
