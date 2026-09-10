/**
 * O que a APSL devolveu, contra o que o vendedor declarou.
 *
 * ## O que é uma divergência, e o que não é
 *
 * Uma divergência é **uma contradição verificável**: a APSL diz que o cavalo
 * com aquele NIN nasceu em 2014 e é ruço, o anúncio diz 2019 e castanho, e os
 * quatro valores estão ali lado a lado para quem revê ver. É a mesma ideia — e
 * a mesma forma — do `Conflito` que o `leitura/cruzar.ts` produz entre o
 * documento e o formulário, e é de propósito que se parecem: quem revê aprende
 * a ler uma coisa, não duas.
 *
 * O que **não** é divergência:
 *
 * - **Um dos lados não tem o campo.** Faltar um dado não é mentir. A APSL nem
 *   sempre mostra tudo, e o anúncio muitas vezes não traz os pais.
 * - **A mesma coisa escrita de outra maneira.** «MAESTOSO XV» e «Maestoso  xv»
 *   são o mesmo cavalo.
 * - **A forma curta de um nome.** Um vendedor que escreve «Rubi» onde a APSL
 *   tem «Rubi da Broa» não está a contradizer coisa nenhuma — está a escrever
 *   como se fala. É por isso que os nomes batem certo por conterem-se e não por
 *   serem iguais: o que se procura é a contradição («Rubi» contra «Xaquiro»),
 *   não a abreviatura.
 * - **A pelagem dita com mais ou menos detalhe.** «Castanho» e «Castanho
 *   escuro» são o mesmo cavalo visto por duas pessoas. Pela mesma regra do
 *   conter-se.
 *
 * O número de registo é a excepção às duas últimas: é um identificador, e num
 * identificador conter-se não quer dizer nada — `123` cabe dentro de `1234` e
 * são dois cavalos diferentes. Compara-se por igualdade e mais nada.
 *
 * ## E o que uma divergência faz
 *
 * **Nada, por si.** Não recusa o anúncio, não o marca como falso, e não impede
 * a publicação. Vai para a fila de quem revê com os dois valores lado a lado, e
 * é uma pessoa que decide. Um cavalo que a APSL não conhece **não é um cavalo
 * falso** — pode ser um erro de escrita, um cavalo estrangeiro por inscrever ou
 * um número antigo —, e um cavalo que a APSL conhece com outra data também não:
 * pode ser o vendedor a enganar-se a copiar do passaporte.
 */

import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";
import { chaveDeNome } from "@/lib/documentos/leitura/normalizar";

import { normalizarData } from "./analisador";
import type { RegistoGuardado } from "./contrato";

/**
 * O anúncio, reduzido ao que se pode confrontar com o stud-book.
 *
 * Os nomes seguem as colunas de `cavalos_venda`, com uma tradução única e
 * assinalada: a APSL chama **pelagem** ao que a coluna chama `cor`. É a mesma
 * coisa e são duas palavras, e escondê-lo seria pior do que dizê-lo aqui.
 */
export interface AnuncioParaStudBook {
  /** `nome` — o nome por que o cavalo é conhecido. */
  nome?: string | null;
  /** `nome_registo` — o nome registado. Bater com qualquer um dos dois é bater. */
  nomeRegisto?: string | null;
  /** `data_nascimento`, como a coluna a guarda. */
  dataNascimento?: string | null;
  /** `cor` no anúncio, pelagem na APSL. */
  cor?: string | null;
  /** `pai` e `mae` — texto livre. */
  pai?: string | null;
  mae?: string | null;
  /** `registro_apsl` — o NIN. */
  numeroRegisto?: string | null;
}

export const CAMPOS_DE_DIVERGENCIA = [
  "nome",
  "data_nascimento",
  "pelagem",
  "pai",
  "mae",
  "numero_registo",
] as const;
export type CampoDeDivergencia = (typeof CAMPOS_DE_DIVERGENCIA)[number];

/**
 * Uma contradição entre o anúncio e o stud-book.
 *
 * Os dois valores vão **como estão escritos**, não como foram normalizados:
 * quem revê tem de ver o que o vendedor escreveu e o que a APSL respondeu, e
 * não a versão em maiúsculas sem acentos que serviu para os comparar.
 */
export interface DivergenciaComStudBook {
  campo: CampoDeDivergencia;
  noAnuncio: string;
  noStudBook: string;
}

/**
 * Um nome curto de mais para se dizer que está contido noutro.
 *
 * Com dois caracteres, quase tudo cabe dentro de quase tudo, e a regra do
 * conter-se deixava de apanhar seja o que for.
 */
const MINIMO_PARA_CONTER = 3;

/** Iguais, ou um contido no outro. Ver o cabeçalho. */
function combinam(a: string, b: string): boolean {
  if (a === b) return true;
  if (a.length < MINIMO_PARA_CONTER || b.length < MINIMO_PARA_CONTER) return false;
  return a.includes(b) || b.includes(a);
}

/**
 * A data do anúncio em `AAAA-MM-DD`.
 *
 * A coluna é uma data do Postgres e chega quase sempre já em ISO, por vezes com
 * a hora atrás. Corta-se a hora; o que não for ISO passa pelo mesmo leitor de
 * datas do analisador, para que não haja duas ideias de data neste sistema.
 */
function dataDoAnuncio(valor: string): string | undefined {
  const texto = valor.trim();
  const iso = /^(\d{4}-\d{2}-\d{2})(?:[T ]|$)/.exec(texto);
  if (iso) return normalizarData(iso[1]);
  return normalizarData(texto);
}

function texto(valor: string | null | undefined): string | undefined {
  if (typeof valor !== "string") return undefined;
  const limpo = valor.trim();
  return limpo === "" ? undefined : limpo;
}

/**
 * As contradições entre o stud-book e o anúncio.
 *
 * Devolve uma lista vazia quando não há nada a apontar, que é — e deve
 * continuar a ser — o resultado da esmagadora maioria dos cavalos.
 */
export function cruzarComStudBook(
  registo: RegistoGuardado,
  anuncio: AnuncioParaStudBook
): DivergenciaComStudBook[] {
  const divergencias: DivergenciaComStudBook[] = [];

  const apontar = (campo: CampoDeDivergencia, noAnuncio: string, noStudBook: string) => {
    divergencias.push({ campo, noAnuncio, noStudBook });
  };

  // ── O nome. Bate com o nome ou com o nome de registo; basta um. ───────────
  const nomeStudBook = texto(registo.nome);
  if (nomeStudBook) {
    const chaveStudBook = chaveDeNome(nomeStudBook);
    const candidatos = [texto(anuncio.nome), texto(anuncio.nomeRegisto)].filter(
      (v): v is string => v !== undefined
    );
    const comparaveis = candidatos.map((v) => chaveDeNome(v)).filter((v) => v !== "");
    if (chaveStudBook && comparaveis.length > 0) {
      if (!comparaveis.some((c) => combinam(c, chaveStudBook))) {
        apontar("nome", candidatos[0], nomeStudBook);
      }
    }
  }

  // ── A data de nascimento. Igualdade estrita: uma data ou é a mesma ou não. ─
  const nascimentoStudBook = texto(registo.dataNascimento);
  const nascimentoAnuncio = texto(anuncio.dataNascimento);
  if (nascimentoStudBook && nascimentoAnuncio) {
    const a = dataDoAnuncio(nascimentoAnuncio);
    const b = normalizarData(nascimentoStudBook);
    // Uma data que não se percebe não contradiz nada. Não se inventa a partir
    // do que não se conseguiu ler.
    if (a && b && a !== b) apontar("data_nascimento", nascimentoAnuncio, nascimentoStudBook);
  }

  // ── A pelagem, pela regra do conter-se. ──────────────────────────────────
  const pelagemStudBook = texto(registo.pelagem);
  const corAnuncio = texto(anuncio.cor);
  if (pelagemStudBook && corAnuncio) {
    const a = chaveDeNome(corAnuncio);
    const b = chaveDeNome(pelagemStudBook);
    if (a && b && !combinam(a, b)) apontar("pelagem", corAnuncio, pelagemStudBook);
  }

  // ── Os pais, pela mesma regra dos nomes. ─────────────────────────────────
  for (const [campo, doStudBook, doAnuncio] of [
    ["pai", registo.pai, anuncio.pai],
    ["mae", registo.mae, anuncio.mae],
  ] as const) {
    const s = texto(doStudBook);
    const n = texto(doAnuncio);
    if (!s || !n) continue;
    const a = chaveDeNome(n);
    const b = chaveDeNome(s);
    if (a && b && !combinam(a, b)) apontar(campo, n, s);
  }

  // ── O número de registo. Identificador: igualdade e mais nada. ───────────
  const registoStudBook = texto(registo.numeroRegisto);
  const registoAnuncio = texto(anuncio.numeroRegisto);
  if (registoStudBook && registoAnuncio) {
    const a = chaveRegistoApsl(registoAnuncio);
    const b = chaveRegistoApsl(registoStudBook);
    if (a && b && a !== b) apontar("numero_registo", registoAnuncio, registoStudBook);
  }

  return divergencias;
}
