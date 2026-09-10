/**
 * Os dois encurtamentos que as etiquetas do globo fazem ao texto.
 *
 * Vivem aqui, e não dentro do `GloboTerra`, porque são regras sobre os dados
 * e não sobre o desenho: assim testam-se sem arrastar o three.js atrás.
 */

/* «Coudelaria de Alter Real» → «Alter Real».
   Numa lista de coudelarias a palavra «Coudelaria» não distingue nenhuma das
   outras: dezasseis dos vinte e nove nomes começam por ela. Ocupa setenta
   pixéis de linha por etiqueta, que é precisamente o que falta para caber
   mais um nome no Ribatejo. O nome inteiro fica no `aria-label` e no `title`. */
export function nomeCurto(nome: string) {
  return maisDistintivo(nome.replace(/^coudelaria\s+(?:d[eoa]s?\s+)?/i, "").trim() || nome);
}

/* Quatro dos nomes trazem um segundo nome atrás de um travessão, e a etiqueta
   só tem 168px: «Quinta Lusitânia - Couto do Mosteiro» aparecia cortado a
   meio, «Quinta Lusitânia - Couto do …», que é o pior dos dois mundos — nem
   se lê o nome todo nem se percebe que foi cortado de propósito.
   Fica o lado que distingue. Quase sempre é o primeiro, que é a marca; a
   excepção é quando o primeiro é uma sigla («CL», «SA»), e aí quem identifica
   é o que vem depois dela. O nome inteiro continua no `title` e no
   `aria-label`, para quem quiser o resto. */
function maisDistintivo(nome: string) {
  const partes = nome
    .split(/\s+[-–—]\s+/)
    .map((x) => x.trim())
    .filter(Boolean);
  if (partes.length < 2) return nome;
  const [primeira, segunda] = partes;
  const sigla = primeira.length <= 4 && primeira === primeira.toUpperCase();
  return sigla ? segunda : primeira;
}

/* «Rua do Calvário n.º 1, 3440-126 Couto do Mosteiro» → «Couto do Mosteiro».
 *
 * O campo `localizacao` da base não é uma localidade: em treze das vinte e
 * nove é a morada completa, com rua, número e código postal. Debaixo do nome
 * da coudelaria, numa linha de 11px sobre a fotografia do planeta, uma morada
 * é ruído — e ainda por cima é a morada truncada a meio, porque não cabe.
 *
 * A regra é a mesma para as vinte e nove: a última parte antes das vírgulas é
 * sempre o concelho ou a vila, e o que lhe fica à frente é código postal. Não
 * se inventa aqui uma tabela de sítios: quem não encaixar no molde fica com o
 * texto como está, que é pior do que o ideal mas nunca errado.
 */
export function sitioCurto(localizacao: string) {
  const inteiro = localizacao.trim();
  if (!inteiro) return "";
  /* Partes vazias fora: um «Beja,» com vírgula pendurada não pode fazer a
     última parte ser a string vazia. */
  const partes = inteiro
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
  const ultima = partes.length ? partes[partes.length - 1] : inteiro;
  // 2100-047 ou 2100, sempre à cabeça da parte final.
  const semPostal = ultima.replace(/^\d{4}(?:-\d{3})?\s+/, "").trim();
  return semPostal || ultima || inteiro;
}
