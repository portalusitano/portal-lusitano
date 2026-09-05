/**
 * O PDF visto como bytes, para as perguntas que o `leitura/texto-pdf.ts` não
 * faz.
 *
 * ## Porque é que isto não chama o leitor que já cá está
 *
 * Chama o que pode — nada aqui volta a escrever descodificação de fontes, nem
 * larguras de glifos, nem `ToUnicode`, nem reconstrução de linhas, que é onde
 * vivem novecentas das mil e cem linhas do `texto-pdf.ts`. O que aqui está é a
 * camada por baixo dessa: abrir o ficheiro, achar os objectos, tirar o valor de
 * uma chave, inflar um stream. São as mesmas quatro operações e estão escritas
 * da mesma maneira, de propósito — quem souber ler uma sabe ler a outra.
 *
 * Não se importam de lá porque são privadas do módulo, e o `leitura/` não é meu
 * para lhe acrescentar exportações. Fica portanto uma duplicação de umas cento
 * e cinquenta linhas, deliberada e assumida, em vez de uma alteração a um
 * ficheiro de outra pessoa. Se um dia estas quatro funções subirem a um módulo
 * partilhado, este ficheiro fica com metade do tamanho e não perde nada.
 *
 * ## Onde é que diverge, e é por precisar
 *
 * O índice do `texto-pdf.ts` guarda a **última** definição de cada objecto,
 * porque é essa que o documento mostra. Este guarda **todas as ocorrências**,
 * porque o mesmo número de objecto definido três vezes é exactamente o vestígio
 * que se anda a procurar: é o registo de que o ficheiro foi reescrito por cima
 * de si mesmo. O que ali é ruído a descartar, aqui é o achado.
 *
 * Corre **só do lado do servidor** — usa o `node:zlib`.
 */

import { inflateRawSync, inflateSync } from "node:zlib";

/** O contrato limita o upload a 10MB; isto é a rede por baixo dessa. */
export const MAX_BYTES_PDF = 32 * 1024 * 1024;
/** Um stream inflado maior do que isto é uma bomba, não um Livro Azul. */
export const MAX_BYTES_INFLADO = 24 * 1024 * 1024;
/** Um Livro Azul tem duas páginas; um exame veterinário, dez. */
export const MAX_PAGINAS = 60;

/**
 * O tecto de caracteres de qualquer texto que saia daqui para o painel.
 *
 * Todos estes valores vêm de dentro do ficheiro, e o ficheiro é de quem o
 * enviou. Um `/Producer` de dez megabytes é um ficheiro legítimo do ponto de
 * vista do formato e um problema do ponto de vista de quem tem de mostrar
 * aquilo num painel.
 */
export const MAX_CARACTERES_DE_CAMPO = 240;

export interface ObjectoCru {
  /** `«12 0»`, o número e a geração. */
  chave: string;
  /** O texto entre `obj` e o `stream` ou o `endobj`. */
  dicionario: string;
  /** Onde começam os bytes do stream, quando o objecto tem um. */
  inicioDados?: number;
  /** O byte onde a declaração `12 0 obj` começa. */
  deslocamento: number;
}

/**
 * Os bytes vistos como texto, com os **mesmos índices**.
 *
 * Os bytes 0–255 correspondem um a um aos primeiros 256 pontos de código, e por
 * isso um índice na string é um índice no array. É o que permite procurar `obj`
 * com as funções de string e usar o resultado para cortar bytes.
 */
export function vistaLatin1(bytes: Uint8Array): string {
  let saida = "";
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) {
    saida += String.fromCharCode(...bytes.subarray(i, Math.min(i + passo, bytes.length)));
  }
  return saida;
}

const DELIMITADOR = new Set([" ", "\t", "\r", "\n", "\f", "\0", ">", "]", "%"]);

/**
 * Todos os objectos, por ordem de aparecimento no ficheiro.
 *
 * Varre-se em vez de se ler a tabela de referências cruzadas, pela mesma razão
 * que o `texto-pdf.ts` dá: a tabela é a primeira coisa que se estraga, e um
 * ficheiro remendado à mão é precisamente o caso que interessa examinar. Um
 * examinador que desistisse à primeira tabela partida desistia sempre no
 * momento errado.
 */
export function indexarObjectos(vista: string): ObjectoCru[] {
  const objectos: ObjectoCru[] = [];
  const padrao = /(\d{1,10})[ \t\r\n]+(\d{1,5})[ \t\r\n]+obj/g;

  for (let m = padrao.exec(vista); m !== null; m = padrao.exec(vista)) {
    // Os bytes comprimidos de um stream também contêm `12 0 obj` de vez em
    // quando. Exigir um delimitador antes tira quase todos esses falsos.
    const antes = m.index === 0 ? "\n" : vista[m.index - 1];
    if (!DELIMITADOR.has(antes)) continue;

    const corpo = m.index + m[0].length;
    const posStream = vista.indexOf("stream", corpo);
    const posFim = vista.indexOf("endobj", corpo);
    const temStream = posStream !== -1 && (posFim === -1 || posStream < posFim);
    const chave = `${Number(m[1])} ${Number(m[2])}`;

    if (temStream) {
      let dados = posStream + "stream".length;
      if (vista[dados] === "\r") dados += 1;
      if (vista[dados] === "\n") dados += 1;
      objectos.push({
        chave,
        dicionario: vista.slice(corpo, posStream),
        inicioDados: dados,
        deslocamento: m.index,
      });
    } else {
      objectos.push({
        chave,
        dicionario: vista.slice(corpo, posFim === -1 ? corpo : posFim),
        deslocamento: m.index,
      });
    }
  }

  return objectos;
}

/** `5 0 R` → a chave do índice. `null` quando o valor não é uma referência. */
export function referencia(valor: string | null): string | null {
  if (valor === null) return null;
  const m = /^\s*(\d{1,10})\s+(\d{1,5})\s+R\b/.exec(valor);
  return m ? `${Number(m[1])} ${Number(m[2])}` : null;
}

/**
 * O valor de uma chave dentro de um dicionário, em texto cru.
 *
 * O que é preciso equilibrar é `<< >>`, `[ ]` e `( )` — senão um `/Producer`
 * com um parêntesis lá dentro sai cortado a meio, e um `/Resources` com um
 * dicionário aninhado também.
 */
export function valorDe(dicionario: string, chave: string): string | null {
  const m = new RegExp(`/${chave}(?![A-Za-z0-9])`).exec(dicionario);
  if (!m) return null;

  let i = m.index + m[0].length;
  while (i < dicionario.length && /\s/.test(dicionario[i])) i += 1;
  if (i >= dicionario.length) return null;

  if (dicionario[i] === "(") return recortarLiteral(dicionario, i);

  if (dicionario.startsWith("<<", i) || dicionario[i] === "[") {
    const abre = dicionario[i] === "[" ? "[" : "<<";
    const fecha = abre === "[" ? "]" : ">>";
    let fundo = 0;
    let j = i;
    while (j < dicionario.length) {
      if (dicionario.startsWith(abre, j)) {
        fundo += 1;
        j += abre.length;
      } else if (dicionario.startsWith(fecha, j)) {
        fundo -= 1;
        j += fecha.length;
        if (fundo === 0) return dicionario.slice(i, j);
      } else if (dicionario[j] === "(") {
        j += recortarLiteral(dicionario, j).length;
      } else {
        j += 1;
      }
    }
    return dicionario.slice(i);
  }

  if (dicionario[i] === "<") {
    const fim = dicionario.indexOf(">", i);
    return fim === -1 ? dicionario.slice(i) : dicionario.slice(i, fim + 1);
  }

  // Um valor simples: nome, número, ou uma referência indirecta.
  const resto = dicionario.slice(i, i + 64);
  const ref = /^\d{1,10}\s+\d{1,5}\s+R\b/.exec(resto);
  if (ref) return ref[0];
  const simples = /^(\/[^\s/<>[\]()]*|[-+.\d]+|true|false|null)/.exec(resto);
  return simples ? simples[0] : null;
}

/** Um `( … )` inteiro, contando os parêntesis aninhados e as barras de escape. */
function recortarLiteral(texto: string, inicio: number): string {
  let fundo = 0;
  for (let j = inicio; j < texto.length; j += 1) {
    const c = texto[j];
    if (c === "\\") {
      j += 1;
      continue;
    }
    if (c === "(") fundo += 1;
    else if (c === ")") {
      fundo -= 1;
      if (fundo === 0) return texto.slice(inicio, j + 1);
    }
  }
  return texto.slice(inicio);
}

function inflar(bytes: Uint8Array): Uint8Array | null {
  const limite = { maxOutputLength: MAX_BYTES_INFLADO };
  try {
    return new Uint8Array(inflateSync(bytes, limite));
  } catch {
    // Alguns produtores escrevem o fluxo sem o cabeçalho de dois bytes do
    // zlib. Não é um ficheiro corrompido, é outra maneira de o escrever.
    try {
      return new Uint8Array(inflateRawSync(bytes, limite));
    } catch {
      return null;
    }
  }
}

/**
 * O ficheiro aberto: os bytes, a vista, e os objectos indexados.
 *
 * Guarda o índice de duas maneiras porque as duas perguntas são diferentes:
 * `objectos` é a lista por ordem de ficheiro, que é onde se vê que o objecto
 * `4 0` aparece três vezes; `porChave` dá a **última** definição, que é a que o
 * documento mostra e a única que faz sentido seguir numa referência.
 */
export class PdfCru {
  readonly objectos: readonly ObjectoCru[];
  private readonly porChave = new Map<string, ObjectoCru>();

  constructor(
    readonly bruto: Uint8Array,
    readonly vista: string
  ) {
    this.objectos = indexarObjectos(vista);
    for (const objecto of this.objectos) this.porChave.set(objecto.chave, objecto);
  }

  objecto(chave: string | null): ObjectoCru | null {
    return chave ? (this.porChave.get(chave) ?? null) : null;
  }

  /** Segue uma referência indirecta, se o valor for uma; senão devolve-o. */
  resolver(valor: string | null): string | null {
    if (valor === null) return null;
    const ref = referencia(valor);
    if (!ref) return valor;
    return this.porChave.get(ref)?.dicionario ?? null;
  }

  /** Os bytes de um stream, já inflados. `null` quando não se sabe lê-lo. */
  dados(objecto: ObjectoCru): Uint8Array | null {
    if (objecto.inicioDados === undefined) return null;

    // Um preditor quer dizer que os bytes vêm filtrados linha a linha.
    // Devolvê-los por desfiltrar seria devolver lixo com ar de conteúdo.
    const parametros = this.resolver(valorDe(objecto.dicionario, "DecodeParms"));
    if (parametros && /\/Predictor\s+([2-9]|\d\d)/.test(parametros)) return null;

    const filtro = valorDe(objecto.dicionario, "Filter") ?? "";
    if (filtro && !filtro.includes("FlateDecode")) return null;

    const inicio = objecto.inicioDados;
    let fim = -1;

    const comprimento = this.resolver(valorDe(objecto.dicionario, "Length"));
    const declarado = comprimento !== null ? Number.parseInt(comprimento.trim(), 10) : Number.NaN;
    if (Number.isFinite(declarado) && declarado >= 0 && inicio + declarado <= this.bruto.length) {
      const depois = this.vista.slice(inicio + declarado, inicio + declarado + 20);
      if (/^\s*endstream/.test(depois)) fim = inicio + declarado;
    }

    // O `/Length` mente com frequência — é dos campos que mais se estraga ao
    // remendar um PDF à mão. Quando mente, quem manda é o `endstream`.
    if (fim === -1) {
      const marca = this.vista.indexOf("endstream", inicio);
      if (marca === -1) return null;
      fim = marca;
      while (fim > inicio && (this.vista[fim - 1] === "\n" || this.vista[fim - 1] === "\r")) {
        fim -= 1;
      }
    }

    if (fim <= inicio || fim - inicio > MAX_BYTES_INFLADO) return null;
    const crus = this.bruto.subarray(inicio, fim);
    return filtro ? inflar(crus) : crus;
  }
}

// ─── Texto que veio de dentro do ficheiro ────────────────────────────────────

const ESCAPES: Readonly<Record<string, string>> = {
  n: "\n",
  r: "\r",
  t: "\t",
  b: "\b",
  f: "\f",
  "(": "(",
  ")": ")",
  "\\": "\\",
};

/**
 * Uma string do PDF — `( … )` ou `< … >` — em texto legível.
 *
 * Vem sempre limpa e truncada. Não é asseio: estes valores são escritos por
 * quem envia o ficheiro e acabam num painel de revisão, e um `/Producer` com
 * caracteres de controlo, com sequências de escape de terminal ou com dois
 * megabytes de comprimento é uma coisa que se manda a um painel de propósito,
 * não por acaso.
 */
export function textoDeStringPdf(cru: string | null): string {
  if (cru === null) return "";
  const bruto = cru.trim();

  if (bruto.startsWith("(")) return limparCampo(decodificarBytes(literalParaBytes(bruto)));
  if (bruto.startsWith("<")) return limparCampo(decodificarBytes(hexParaBytes(bruto)));
  // Um nome (`/Adobe#20Acrobat`) ou um valor solto.
  return limparCampo(
    bruto
      .replace(/^\//, "")
      .replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(Number.parseInt(h, 16)))
  );
}

function literalParaBytes(literal: string): number[] {
  const corpo = literal.slice(1, literal.endsWith(")") ? -1 : undefined);
  const bytes: number[] = [];
  for (let i = 0; i < corpo.length && bytes.length < 4096; i += 1) {
    const c = corpo[i];
    if (c !== "\\") {
      bytes.push(corpo.charCodeAt(i));
      continue;
    }
    const seguinte = corpo[i + 1];
    if (seguinte === undefined) break;
    if (seguinte === "\n") {
      i += 1;
      continue;
    }
    if (seguinte >= "0" && seguinte <= "7") {
      let octal = "";
      while (octal.length < 3 && corpo[i + 1] >= "0" && corpo[i + 1] <= "7") {
        octal += corpo[i + 1];
        i += 1;
      }
      bytes.push(Number.parseInt(octal, 8) & 0xff);
      continue;
    }
    bytes.push((ESCAPES[seguinte] ?? seguinte).charCodeAt(0));
    i += 1;
  }
  return bytes;
}

function hexParaBytes(hex: string): number[] {
  const digitos = hex.replace(/[^0-9A-Fa-f]/g, "").slice(0, 8192);
  const bytes: number[] = [];
  for (let i = 0; i + 1 < digitos.length; i += 2) {
    bytes.push(Number.parseInt(digitos.slice(i, i + 2), 16));
  }
  if (digitos.length % 2 === 1) bytes.push(Number.parseInt(digitos.slice(-1) + "0", 16));
  return bytes;
}

/**
 * Bytes de uma string do PDF em texto.
 *
 * Com a marca `FE FF` à cabeça são UTF-16 de dois bytes; sem ela é
 * PDFDocEncoding, que para o que aqui interessa se comporta como latin-1.
 */
function decodificarBytes(bytes: number[]): string {
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) {
    let saida = "";
    for (let i = 2; i + 1 < bytes.length; i += 2) {
      saida += String.fromCharCode((bytes[i] << 8) | bytes[i + 1]);
    }
    return saida;
  }
  return String.fromCharCode(...bytes);
}

/**
 * Um valor pronto para o painel: sem controlos, sem espaços a mais, truncado.
 *
 * O `\p{C}` apanha os caracteres de controlo, os de formatação invisível e os
 * substitutos soltos — que é por onde passam tanto o lixo de uma
 * descodificação errada como um `[` metido de propósito.
 */
export function limparCampo(valor: string): string {
  const limpo = valor.replace(/\p{C}/gu, " ").replace(/\s+/g, " ").trim();
  return limpo.length > MAX_CARACTERES_DE_CAMPO
    ? `${limpo.slice(0, MAX_CARACTERES_DE_CAMPO)}…`
    : limpo;
}

/**
 * Uma data do PDF — `D:20240115103000+01'00'` — em ISO-8601.
 *
 * Devolve `null` no que não perceber, e é `null` que fica: um painel que mostre
 * uma data inventada a partir de meia data é pior do que um painel que mostre a
 * cadeia crua tal como ela está no ficheiro.
 */
export function dataPdfParaIso(valor: string): string | null {
  const m =
    /^\s*(?:D:)?(\d{4})(\d{2})?(\d{2})?(\d{2})?(\d{2})?(\d{2})?(?:\s*([+-Z])\s*(\d{2})?'?(\d{2})?)?/.exec(
      valor
    );
  if (!m) return null;

  const ano = Number(m[1]);
  const mes = Number(m[2] ?? "01");
  const dia = Number(m[3] ?? "01");
  const hora = Number(m[4] ?? "00");
  const minuto = Number(m[5] ?? "00");
  const segundo = Number(m[6] ?? "00");
  if (ano < 1000 || ano > 9999 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  if (hora > 23 || minuto > 59 || segundo > 60) return null;

  const sinal = m[7] === "-" ? -1 : 1;
  const deslocamento =
    m[7] === undefined || m[7] === "Z"
      ? 0
      : sinal * (Number(m[8] ?? "00") * 60 + Number(m[9] ?? "00"));

  const instante = Date.UTC(ano, mes - 1, dia, hora, minuto, Math.min(segundo, 59));
  if (!Number.isFinite(instante)) return null;
  return new Date(instante - deslocamento * 60_000).toISOString();
}
