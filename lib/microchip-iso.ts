/**
 * O microchip de um equídeo, segundo a ISO 11784/11785.
 *
 * O que a norma fixa, e é por isso que estas regras podem existir sem
 * inventar nada:
 *
 * - **A ISO 11784** define a estrutura do código: 64 bits, dos quais o campo
 *   de identificação são **15 algarismos decimais**. Não são 14 nem 16, e não
 *   levam letras.
 * - **Os três primeiros algarismos** são o *country code*. Ou é o código
 *   numérico do país segundo a **ISO 3166-1** — 620 é Portugal, 724 Espanha,
 *   250 França, 276 Alemanha, 380 Itália, 826 Reino Unido —, ou está na gama
 *   **900–999**, que a ICAR reserva a fabricantes para chips sem país
 *   atribuído.
 * - **A ISO 11785** define a transmissão; não acrescenta restrições ao
 *   número, e por isso não acrescenta regras aqui.
 *
 * O que este módulo **não** faz: dizer se o chip existe. Isso só se sabe
 * lendo-o com um leitor, ou perguntando à base de dados nacional (SIRE/DGAV),
 * e nenhuma das duas coisas está ao alcance de um formulário. O que se apanha
 * aqui é a gralha — um algarismo a mais, um a menos, o número do passaporte
 * escrito na caixa errada.
 *
 * A regra de ouro é a mesma do email em `components/vender-cavalo/validacao.ts`:
 * recusar um número válido custa um anúncio, e sai mais caro do que deixar
 * passar um número improvável.
 */

/** Um código de identificação ISO 11784 tem exactamente quinze algarismos. */
export const DIGITOS_MICROCHIP = 15;

/**
 * O código de país mais baixo que a ISO 3166-1 numérica atribui é o 004
 * (Afeganistão). Abaixo disso não há país nem fabricante: 000, 001, 002 e 003
 * não são código de coisa nenhuma, e um número que comece por eles é sempre
 * uma gralha.
 */
const MENOR_CODIGO_PAIS = 4;

/** A gama que a ICAR reserva a fabricantes, para chips sem país atribuído. */
const PRIMEIRO_CODIGO_FABRICANTE = 900;

/** Os países de onde vêm, na prática, os Lusitanos que aqui se anunciam. */
const PAISES_ISO_3166: Readonly<Record<number, string>> = {
  56: "Bélgica",
  76: "Brasil",
  250: "França",
  276: "Alemanha",
  372: "Irlanda",
  380: "Itália",
  528: "Países Baixos",
  620: "Portugal",
  724: "Espanha",
  756: "Suíça",
  826: "Reino Unido",
  840: "Estados Unidos",
};

export type OrigemMicrochip =
  /** O prefixo é um código ISO 3166-1; `pais` só vem preenchido para os que a
   *  tabela acima conhece — não conhecer o código não o torna inválido. */
  { tipo: "pais"; codigo: number; pais: string | null } | { tipo: "fabricante"; codigo: number };

export type ProblemaMicrochip = "comprimento" | "nao-numerico" | "prefixo-impossivel" | "repetido";

export interface LeituraMicrochip {
  /** Só os algarismos, sem espaços nem pontos. */
  normalizado: string;
  valido: boolean;
  problema?: ProblemaMicrochip;
  /** Quantos algarismos faltam (positivo) ou sobram (negativo). */
  diferencaDigitos?: number;
  origem?: OrigemMicrochip;
}

/**
 * Tira o que não é algarismo. Quem copia um microchip de um Livro Azul traz
 * quase sempre espaços de três em três, e por vezes pontos ou traços — nada
 * disso faz parte do número.
 */
export function normalizarMicrochip(valor: string): string {
  return valor.replace(/\D/g, "");
}

/** O que os três primeiros algarismos dizem sobre a origem do chip. */
export function origemMicrochip(prefixo: number): OrigemMicrochip {
  if (prefixo >= PRIMEIRO_CODIGO_FABRICANTE) return { tipo: "fabricante", codigo: prefixo };
  return { tipo: "pais", codigo: prefixo, pais: PAISES_ISO_3166[prefixo] ?? null };
}

/**
 * Lê um microchip. Devolve sempre uma leitura — nunca lança —, para que quem
 * chama decida o que é erro e o que é pergunta.
 */
export function lerMicrochip(valor: string): LeituraMicrochip {
  const bruto = valor.trim();
  const normalizado = normalizarMicrochip(bruto);

  // Uma letra pelo meio não é um separador: é sinal de que ali foi escrito
  // outro número qualquer — o do passaporte, por exemplo, que leva letras.
  if (/[^\d\s.\-/]/.test(bruto)) {
    return { normalizado, valido: false, problema: "nao-numerico" };
  }

  if (normalizado.length !== DIGITOS_MICROCHIP) {
    return {
      normalizado,
      valido: false,
      problema: "comprimento",
      diferencaDigitos: DIGITOS_MICROCHIP - normalizado.length,
    };
  }

  // Quinze algarismos iguais não são um código: são uma tecla presa.
  if (/^(\d)\1{14}$/.test(normalizado)) {
    return { normalizado, valido: false, problema: "repetido" };
  }

  const prefixo = Number(normalizado.slice(0, 3));
  if (prefixo < MENOR_CODIGO_PAIS) {
    return { normalizado, valido: false, problema: "prefixo-impossivel" };
  }

  return { normalizado, valido: true, origem: origemMicrochip(prefixo) };
}
