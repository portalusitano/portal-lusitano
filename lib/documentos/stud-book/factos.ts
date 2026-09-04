/**
 * O que a consulta ao stud-book dá a quem revê.
 *
 * ## A fronteira, outra vez, porque é a que mais depressa se perde
 *
 * Um facto aqui é **um facto contado**: «a APSL respondeu sobre este NIN e diz
 * que o cavalo nasceu em 2014; o anúncio diz 2019; os ids são estes». Não é uma
 * acusação, não é uma pontuação de confiança, e não é uma decisão. Quem decide
 * é uma pessoa, no painel de revisão.
 *
 * É a mesma forma do `lib/documentos/sinais.ts`, e é a mesma de propósito: um
 * painel com duas gramáticas de aviso é um painel que ninguém lê bem. Como lá,
 * não há aqui — nem pode vir a haver — `gravidade`, `risco`, `score`,
 * `pontuacao`, `accao` ou `decisao`. Há um teste que compara as chaves da saída
 * contra essa lista.
 *
 * ## Os quatro, e o que cada um sabe mesmo
 *
 * 1. **`divergencia_com_o_stud_book`** — o mais forte, e mesmo assim não é um
 *    veredicto. A APSL conhece o cavalo e um campo não bate certo com o
 *    anúncio. Pode ser falsificação e pode ser o vendedor a copiar mal uma data
 *    do passaporte; nós não sabemos qual, e não é a nós que compete saber.
 * 2. **`registo_desconhecido`** — a APSL respondeu e não conhece o número.
 *    **Isto não é um cavalo falso.** Um erro de escrita, um cavalo estrangeiro
 *    por inscrever, um número antigo e uma falsificação produzem exactamente o
 *    mesmo silêncio. É um facto para quem revê, como todos os outros.
 * 3. **`consulta_por_confirmar`** — não se conseguiu saber, ou nem se
 *    perguntou. É o estado por omissão de todo o site enquanto o interruptor
 *    estiver em baixo, e é **inofensivo**: a indisponibilidade da APSL, o nosso
 *    tecto diário e o nosso próprio interruptor não podem virar uma acusação a
 *    um vendedor.
 * 4. **`registo_confirmado`** — a APSL confirmou, e nada diverge. É o único
 *    facto que autoriza o site a dizer alguma coisa ao público, e mesmo assim
 *    só na afirmativa: nunca «não consta».
 */

import { cruzarComStudBook, type AnuncioParaStudBook, type DivergenciaComStudBook } from "./cruzar";
import type {
  ConsultaGuardada,
  EstadoDaConsulta,
  IdentificadorDeConsulta,
  MotivoDeIndisponivel,
  RegistoGuardado,
} from "./contrato";

export const TIPOS_DE_FACTO = [
  "divergencia_com_o_stud_book",
  "registo_desconhecido",
  "consulta_por_confirmar",
  "registo_confirmado",
] as const;
export type TipoDeFacto = (typeof TIPOS_DE_FACTO)[number];

/** Um cavalo e o que dele se sabe, à entrada. */
export interface EntradaDoStudBook {
  cavaloId: string;
  /** O que o anúncio declara, para cruzar. */
  anuncio: AnuncioParaStudBook;
  /** O que ficou guardado da última consulta. `null` se nunca se perguntou. */
  consulta?: ConsultaGuardada | null;
}

/** A APSL conhece o cavalo e um ou mais campos não batem certo com o anúncio. */
export interface FactoDivergencia {
  tipo: "divergencia_com_o_stud_book";
  cavaloId: string;
  identificador: IdentificadorDeConsulta;
  divergencias: DivergenciaComStudBook[];
}

/**
 * A APSL respondeu e não conhece este identificador.
 *
 * O `identificador` está aqui porque muda a leitura: um NIN que a APSL não
 * conhece diz mais do que um microchip copiado à mão de uma fotografia torta.
 */
export interface FactoDesconhecido {
  tipo: "registo_desconhecido";
  cavaloId: string;
  identificador: IdentificadorDeConsulta;
}

/**
 * Não se conseguiu saber, ou não se perguntou.
 *
 * `estado` e `motivo` dizem o que se passou **do nosso lado**. Nenhum deles diz
 * seja o que for sobre o cavalo, e é por isso que estão todos no mesmo facto.
 */
export interface FactoPorConfirmar {
  tipo: "consulta_por_confirmar";
  cavaloId: string;
  /** `desligado`, `indisponivel`, `sem_identificador`, ou `nunca_consultado`. */
  estado: EstadoDaConsulta | "nunca_consultado";
  motivo?: MotivoDeIndisponivel;
  tentativas: number;
}

/** A APSL confirmou, e nada diverge. */
export interface FactoConfirmado {
  tipo: "registo_confirmado";
  cavaloId: string;
  identificador: IdentificadorDeConsulta;
  registo: RegistoGuardado;
}

export type FactoDoStudBook =
  | FactoDivergencia
  | FactoDesconhecido
  | FactoPorConfirmar
  | FactoConfirmado;

/** A ordem da saída é sempre a mesma para a mesma entrada. Ver `sinais.ts`. */
function porTexto(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/**
 * Os factos de um cavalo.
 *
 * Um cavalo confirmado com divergências dá **dois** factos e não um: «a APSL
 * conhece este cavalo» e «e há campos que não batem certo» são duas coisas
 * diferentes, e quem revê precisa das duas. Juntá-las num facto só obrigaria a
 * ler o segundo dentro do primeiro.
 */
export function factosDoAnuncio(entrada: EntradaDoStudBook): FactoDoStudBook[] {
  const { cavaloId, anuncio, consulta } = entrada;

  if (!consulta) {
    return [
      { tipo: "consulta_por_confirmar", cavaloId, estado: "nunca_consultado", tentativas: 0 },
    ];
  }

  if (consulta.estado === "confirmado") {
    const registo = consulta.registo ?? {};
    const identificador = consulta.identificador;
    // Um `confirmado` sem identificador guardado é uma linha estragada na base,
    // não um cavalo confirmado. Trata-se como por confirmar, que é o lado que
    // não afirma nada.
    if (!identificador) {
      return [
        {
          tipo: "consulta_por_confirmar",
          cavaloId,
          estado: "nunca_consultado",
          tentativas: consulta.tentativas ?? 0,
        },
      ];
    }

    const factos: FactoDoStudBook[] = [
      { tipo: "registo_confirmado", cavaloId, identificador, registo },
    ];
    const divergencias = cruzarComStudBook(registo, anuncio);
    if (divergencias.length > 0) {
      factos.push({ tipo: "divergencia_com_o_stud_book", cavaloId, identificador, divergencias });
    }
    return factos;
  }

  if (consulta.estado === "desconhecido" && consulta.identificador) {
    return [{ tipo: "registo_desconhecido", cavaloId, identificador: consulta.identificador }];
  }

  const facto: FactoPorConfirmar = {
    tipo: "consulta_por_confirmar",
    cavaloId,
    estado: consulta.estado,
    tentativas: consulta.tentativas ?? 0,
  };
  if (consulta.motivo) facto.motivo = consulta.motivo;
  return [facto];
}

/**
 * Todos os factos, na ordem por que valem a pena ser lidos.
 *
 * A ordem é a do trabalho que cada um dá a quem revê — uma contradição pede
 * olhos, um confirmado não pede nada —, e **não é uma escala de gravidade**. Um
 * `registo_desconhecido` acima de um `registo_confirmado` na lista não quer
 * dizer que o cavalo seja mais suspeito: quer dizer que há ali uma pergunta por
 * responder e no outro não há.
 */
export function reunirFactosDoStudBook(entradas: readonly EntradaDoStudBook[]): FactoDoStudBook[] {
  const todos = entradas.flatMap(factosDoAnuncio);
  const ordem = new Map<TipoDeFacto, number>(TIPOS_DE_FACTO.map((t, i) => [t, i]));

  return todos.sort((a, b) => {
    const porTipo = (ordem.get(a.tipo) ?? 0) - (ordem.get(b.tipo) ?? 0);
    if (porTipo !== 0) return porTipo;
    return porTexto(a.cavaloId, b.cavaloId);
  });
}
