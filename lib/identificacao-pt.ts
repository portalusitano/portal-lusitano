/**
 * Os dois números portugueses que este site pede: o NIF e o telefone.
 *
 * Os dois têm regra pública e verificável, e é por isso que estão aqui. O que
 * não tem regra pública não entra neste ficheiro — inventar um formato para
 * um identificador que não se consegue consultar recusa números válidos, e
 * recusar um número válido custa um anúncio.
 */

// ---------------------------------------------------------------------------
// NIF
// ---------------------------------------------------------------------------

/**
 * O NIF português tem nove algarismos e o último é um dígito de controlo por
 * **módulo 11**. O algoritmo é público (Autoridade Tributária) e é este:
 *
 *   soma = d1×9 + d2×8 + d3×7 + d4×6 + d5×5 + d6×4 + d7×3 + d8×2
 *   resto = soma mod 11
 *   controlo = resto < 2 ? 0 : 11 − resto
 *
 * É esta conta que distingue um NIF de nove algarismos quaisquer: das mil
 * milhões de sequências de nove algarismos, só uma em onze passa. Validar só
 * o comprimento deixava passar dez em cada onze gralhas.
 */
const PESOS_NIF = [9, 8, 7, 6, 5, 4, 3, 2] as const;

/**
 * O primeiro algarismo diz que tipo de contribuinte é — e isso casa, ou não
 * casa, com o «Tipo de Vendedor» que a pessoa escolheu no formulário.
 *
 * A repartição é a que a Autoridade Tributária usa:
 * - **1, 2, 3** — pessoa singular;
 * - **45** — pessoa singular não residente;
 * - **5** — pessoa colectiva (sociedades);
 * - **6** — organismo da administração pública;
 * - **70, 74, 75** — herança indivisa e afins;
 * - **71** — pessoa colectiva não residente;
 * - **72** — fundos de investimento;
 * - **77** — atribuição oficiosa;
 * - **78** — não residentes abrangidos pelo balcão único;
 * - **79** — regime excepcional;
 * - **8** — empresário em nome individual (deixou de ser atribuído);
 * - **9** — condomínios, sociedades irregulares e outras entidades.
 */
export type TipoContribuinte = "singular" | "colectiva" | "desconhecido";

export type ProblemaNif = "comprimento" | "nao-numerico" | "prefixo" | "controlo";

export interface LeituraNif {
  normalizado: string;
  valido: boolean;
  problema?: ProblemaNif;
  tipo: TipoContribuinte;
}

/** Tira espaços, pontos e traços. Não tira mais nada. */
export function normalizarNif(valor: string): string {
  return valor.replace(/[\s.\-]/g, "");
}

/** Qual é o dígito de controlo que estes oito algarismos exigem. */
export function digitoControloNif(oitoPrimeiros: string): number {
  const soma = PESOS_NIF.reduce((acc, peso, i) => acc + Number(oitoPrimeiros[i]) * peso, 0);
  const resto = soma % 11;
  return resto < 2 ? 0 : 11 - resto;
}

/** Que tipo de contribuinte é, pelo prefixo. */
export function tipoContribuinteNif(nif: string): TipoContribuinte {
  const n = normalizarNif(nif);
  const um = n.slice(0, 1);
  const dois = n.slice(0, 2);
  if (["1", "2", "3", "8"].includes(um) || dois === "45") return "singular";
  if (["5", "6", "9"].includes(um)) return "colectiva";
  if (["70", "71", "72", "74", "75", "77", "78", "79"].includes(dois)) return "colectiva";
  return "desconhecido";
}

export function lerNif(valor: string): LeituraNif {
  const normalizado = normalizarNif(valor.trim());
  const tipo = tipoContribuinteNif(normalizado);

  if (!/^\d*$/.test(normalizado)) {
    return { normalizado, valido: false, problema: "nao-numerico", tipo };
  }
  if (normalizado.length !== 9) {
    return { normalizado, valido: false, problema: "comprimento", tipo };
  }
  // Um NIF nunca começa por 0 nem por 4 sozinho — o 4 só existe no par «45».
  if (
    normalizado.startsWith("0") ||
    (normalizado.startsWith("4") && !normalizado.startsWith("45"))
  ) {
    return { normalizado, valido: false, problema: "prefixo", tipo };
  }
  if (digitoControloNif(normalizado.slice(0, 8)) !== Number(normalizado[8])) {
    return { normalizado, valido: false, problema: "controlo", tipo };
  }
  return { normalizado, valido: true, tipo };
}

// ---------------------------------------------------------------------------
// Telefone
// ---------------------------------------------------------------------------

/**
 * O plano nacional de numeração da ANACOM, na parte que interessa a um
 * formulário de contacto:
 *
 * - **Móvel: `9` seguido de `1`, `2`, `3` ou `6`, e mais sete algarismos.**
 *   O 91, o 92, o 93 e o 96 são os quatro prefixos móveis atribuídos; o 94,
 *   o 95, o 97, o 98 e o 99 não são de ninguém.
 * - **Fixo: `2` e mais oito algarismos.** O segundo algarismo é o indicativo
 *   geográfico (21 Lisboa, 22 Porto, 289 Faro…), e não vale a pena descer a
 *   esse detalhe: quem escreve um indicativo que não existe escreve-o com
 *   nove algarismos na mesma, e recusá-lo não ajuda ninguém.
 * - **Nómada: `30` e `31`**, que é o que a ANACOM reservou para voz sobre IP.
 *   Não estava na conta e é um número legítimo; recusá-lo custaria anúncios.
 *
 * O indicativo de país pode vir como `+351`, `00351` ou `351`, ou não vir de
 * todo. Espaços, pontos, traços e parênteses são decoração de quem escreve.
 */
const MOVEL_PT = /^9[1236]\d{7}$/;
const FIXO_PT = /^2\d{8}$/;
const NOMADA_PT = /^3[01]\d{7}$/;

/** O máximo que a recomendação E.164 da UIT permite a um número, país incluído. */
const MAX_DIGITOS_E164 = 15;
/** Abaixo disto não há número de telefone em país nenhum. */
const MIN_DIGITOS_INTERNACIONAL = 7;

export type EspecieTelefone = "movel" | "fixo" | "nomada";

export interface LeituraTelefone {
  /** Os nove algarismos nacionais, sem indicativo e sem decoração. */
  nacional: string;
  /** Como se escreve para se ler: `912 345 678`. */
  formatado: string;
  valido: boolean;
  especie?: EspecieTelefone;
}

/** Tira decoração e o indicativo de Portugal, se lá estiver. */
export function normalizarTelefonePT(valor: string): string {
  const digitos = valor.replace(/[^\d+]/g, "").replace(/(?!^)\+/g, "");
  const semMais = digitos.startsWith("+") ? digitos.slice(1) : digitos;
  if (semMais.startsWith("00351")) return semMais.slice(5);
  if (semMais.length > 9 && semMais.startsWith("351")) return semMais.slice(3);
  return semMais;
}

export function lerTelefonePT(valor: string): LeituraTelefone {
  const nacional = normalizarTelefonePT(valor);
  const especie: EspecieTelefone | undefined = MOVEL_PT.test(nacional)
    ? "movel"
    : FIXO_PT.test(nacional)
      ? "fixo"
      : NOMADA_PT.test(nacional)
        ? "nomada"
        : undefined;
  const formatado =
    nacional.length === 9
      ? `${nacional.slice(0, 3)} ${nacional.slice(3, 6)} ${nacional.slice(6)}`
      : nacional;
  return { nacional, formatado, valido: especie !== undefined, especie };
}

/**
 * Um número de fora de Portugal. Não se aplica a regra portuguesa a quem vive
 * noutro país — a numeração de cada país é a dele —, mas há um mínimo que vale
 * em todo o lado: a recomendação E.164 da UIT fixa o máximo em quinze
 * algarismos, e abaixo de sete não há número em rede nenhuma.
 */
export function pareceTelefoneInternacional(valor: string): boolean {
  const digitos = valor.replace(/\D/g, "");
  return digitos.length >= MIN_DIGITOS_INTERNACIONAL && digitos.length <= MAX_DIGITOS_E164;
}
