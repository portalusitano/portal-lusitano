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
 * **Não valida o bloco do meio.** A lista dos códigos de base de dados é
 * mantida pelos organismos do UELN e não a temos; inventar quais são os
 * válidos seria recusar passaportes reais por causa de uma lista adivinhada.
 * Verifica-se o que o formato garante — o comprimento e o bloco do país serem
 * algarismos — e mais nada.
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

  return { limpo, pareceUeln: true, problema: null, codigoPais: pais };
}
