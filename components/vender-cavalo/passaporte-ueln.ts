import { BASES_UELN } from "@/lib/documentos/ueln-bases";
/**
 * O número do passaporte equino, lido pelo UELN.
 *
 * ## A fonte
 *
 * **UELN — Universal Equine Life Number.** É o identificador único e vitalício
 * de um equídeo, acordado entre as organizações de stud-book e as federações
 * (WBFSH, FEI, entre outras) e adoptado pela legislação da União: o
 * Regulamento de Execução (UE) 2015/262, que fixou o modelo do documento de
 * identificação dos equídeos, manda que o passaporte traga o UELN, e o
 * 2021/963, que o substituiu, mantém-no.
 *
 * O formato são **quinze caracteres em três blocos**:
 *
 * ```
 *   620  015  004471234
 *   └┬┘  └┬┘  └───┬───┘
 *    │    │       └── 9 caracteres: o número do animal nessa base
 *    │    └────────── 3 caracteres: o código da base de dados / stud-book
 *    └─────────────── 3 algarismos: o código do país, ISO 3166-1 numérico
 * ```
 *
 * Portugal é o **620** no ISO 3166-1 numérico; Espanha o 724, França o 250,
 * o Brasil o 076.
 *
 * ## O que este módulo não faz, e porquê
 *
 * **Não recusa nada.** Tudo o que sai daqui é um aviso, e a razão é a mesma
 * que fez o número de registo da APSL não ter verificação nenhuma: o formato é
 * conhecido, mas o parque de documentos não é. Um cavalo nascido antes de o
 * UELN ser exigido tem um passaporte com outro número, perfeitamente válido, e
 * um formulário que o recusasse estaria a impedir de publicar precisamente os
 * cavalos mais velhos. O que se pode fazer com honestidade é dizer «isto não
 * parece um UELN» a quem tinha um UELN para escrever e se enganou a copiá-lo.
 *
 * **O bloco do meio já se reconhece, e continua a não recusar nada.** Dizia-se
 * aqui que a lista dos códigos de base de dados «é mantida pelos organismos do
 * UELN e não a temos». Passou a haver: está em `lib/documentos/ueln-bases.ts`,
 * gerada a partir de `dados/oficiais/ueln-bases.csv`, com 720 códigos.
 *
 * O que se ganha é dizer de quem é o número — «620003, APSL» — e assinalar um
 * bloco que não consta. O que **não** se ganha é o direito de recusar: a lista
 * é a cópia de um dia, organizações novas entram, e um código que aqui não
 * esteja pode ser de uma base que existe. Recusá-lo seria repetir, com uma
 * lista a sério, o erro que se evitou quando não havia lista nenhuma.
 *
 * Vale a pena o registo: antes de a lista chegar tinha-se suposto que a APSL
 * era `620015`. **Não existe.** É `620003`.
 */

export interface PassaporteLido {
  /** Só letras e algarismos, em maiúsculas. É assim que o UELN se escreve. */
  limpo: string;
  /** Parece um UELN completo e bem formado. */
  pareceUeln: boolean;
  /**
   * O que está fora do formato. `null` quando parece um UELN, ou quando não há
   * nada de útil a dizer.
   */
  problema: "comprimento" | "pais-nao-numerico" | null;
  /** Quantos caracteres faltam (negativo se sobram). Só com `comprimento`. */
  diferenca?: number;
  /** O bloco do país, quando são três algarismos. */
  codigoPais?: string;
  /** O bloco do meio: a base de dados ou stud-book que emitiu o número. */
  codigoBase?: string;
  /**
   * A organização a que o bloco do meio pertence, quando a conhecemos.
   *
   * `undefined` quer dizer **não sabemos**, e nunca «não presta». Ver o
   * cabeçalho.
   */
  organizacao?: string;
}

/** Quinze caracteres: 3 do país, 3 da base de dados, 9 do animal. */
export const COMPRIMENTO_UELN = 15;

/** Portugal no ISO 3166-1 numérico. Serve as mensagens, não a validação. */
export const CODIGO_PAIS_PORTUGAL = "620";

/**
 * Tira o que não é letra nem algarismo.
 *
 * Um UELN é escrito com espaços e traços em quase todos os passaportes —
 * `620 015 004471234` —, e quem o copia traz os separadores atrás. Não são um
 * erro: são a maneira como o número está impresso.
 */
export function limparPassaporte(valor: string): string {
  return valor.replace(/[^0-9A-Za-z]/g, "").toUpperCase();
}

export function lerPassaporte(valor: string): PassaporteLido {
  const limpo = limparPassaporte(valor);

  if (limpo.length === 0) {
    return { limpo, pareceUeln: false, problema: null };
  }

  if (limpo.length !== COMPRIMENTO_UELN) {
    return {
      limpo,
      pareceUeln: false,
      problema: "comprimento",
      diferenca: COMPRIMENTO_UELN - limpo.length,
    };
  }

  const pais = limpo.slice(0, 3);
  if (!/^\d{3}$/.test(pais)) {
    return { limpo, pareceUeln: false, problema: "pais-nao-numerico" };
  }

  /* Os seis primeiros são o país mais a base, e é assim que a lista os guarda:
     `620003` e não `620` + `003`. O nome pode não estar lá, e isso não é
     problema nenhum — é a diferença entre saber e não saber. */
  const base = limpo.slice(0, 6);

  return {
    limpo,
    pareceUeln: true,
    problema: null,
    codigoPais: pais,
    codigoBase: limpo.slice(3, 6),
    organizacao: BASES_UELN[base],
  };
}
