/**
 * O texto que já está dentro de um PDF.
 *
 * ## Porque é que isto não é uma dependência
 *
 * A pergunta que este módulo responde não é «como é que esta página se
 * desenha», é **«a sequência 620015004471234 aparece algures neste
 * ficheiro?»**. Para essa pergunta, um leitor de PDF completo é a ferramenta
 * errada por três razões, e as três foram pesadas antes de se escrever a
 * primeira linha:
 *
 * 1. **Nós não desenhamos nada.** Não é preciso ordem de páginas, nem cores,
 *    nem imagens, nem formulários. O que é preciso é apanhar cadeias de
 *    caracteres. Um varrimento directo aos objectos do ficheiro apanha-as
 *    **mesmo quando a tabela de referências cruzadas está partida**, que é o
 *    estado normal de um PDF que passou por uma actualização incremental, por
 *    um remendo à mão ou por um download cortado a meio. Um leitor correcto
 *    desiste onde este continua.
 * 2. **O `package.json` é partilhado.** Acrescentar um pacote de dois
 *    megabytes — e o `package-lock.json` que vem com ele — a um repositório
 *    onde há trabalho a decorrer em paralelo é mexer em estado alheio para
 *    resolver um problema que o `node:zlib`, que já cá está, resolve.
 * 3. **A parte perigosa não é a que a biblioteca faz.** O que estraga tudo
 *    neste trabalho é texto mal lido, porque texto mal lido inventa
 *    contradições — e uma contradição inventada manda um anúncio verdadeiro
 *    para a fila de revisão e ensina quem revê a ignorar os avisos. Essa parte
 *    é o **crivo de legibilidade** aqui em baixo, e teria de ser escrita à
 *    mesma por cima de qualquer biblioteca.
 *
 * ## O que se lê, e o que não se lê
 *
 * Lê-se: objectos soltos e objectos dentro de um `ObjStm`, streams com
 * `FlateDecode`, formulários (`XObject` de tipo `Form`, que é onde os
 * produtores modernos metem quase todo o texto), fontes simples de um byte, e
 * fontes `Type0`/`Identity-H` de dois bytes **desde que tragam `ToUnicode`** —
 * que é o caso de tudo o que saia de um Word, de um InDesign, de um navegador
 * ou de um digitalizador com reconhecimento de texto.
 *
 * Não se lê: PDFs cifrados, filtros que não sejam o `FlateDecode`, streams
 * com preditor, e fontes de dois bytes sem `ToUnicode`. Em nenhum destes
 * casos se devolve o que se conseguiu apanhar: devolve-se **nada**, com
 * `origem: "nenhuma"`. Meio texto é pior do que nenhum, porque parece texto.
 *
 * ## Porque é que as larguras dos glifos estão aqui
 *
 * Parecem um pormenor de tipografia e são a diferença entre isto servir e não
 * servir. Um PDF não guarda espaços: guarda posições. O produtor deste
 * repositório — o motor do Chrome — escreve **um glifo por operação**, cada um
 * com o seu deslocamento. Sem saber que largura tem cada glifo não há maneira
 * de distinguir «o próximo caractere vem a seguir a este» de «o próximo
 * caractere vem depois de um espaço», e as duas leituras erradas custam as
 * duas: juntar tudo cola o nome do cavalo ao rótulo seguinte, e separar tudo
 * parte `620015004471234` em quinze algarismos soltos. Com as larguras, o
 * espaço aparece onde o autor o pôs.
 *
 * Corre **só do lado do servidor** — usa o `node:zlib`, e portanto não vive
 * no runtime Edge nem no navegador.
 */

import { inflateRawSync, inflateSync } from "node:zlib";

// ---------------------------------------------------------------------------
// Tectos
//
// Todos existem contra o mesmo: um ficheiro pequeno que se desdobra em muito.
// Um PDF de dez megabytes tem direito a ser lido; um que insista em produzir
// duzentos megabytes de stream não tem.
// ---------------------------------------------------------------------------

/** O contrato já limita o upload a 10MB; isto é a rede por baixo dessa. */
const MAX_BYTES_PDF = 32 * 1024 * 1024;
/** Um stream inflado maior do que isto é uma bomba, não um Livro Azul. */
const MAX_BYTES_INFLADO = 24 * 1024 * 1024;
/** Mais texto do que isto não serve a ninguém que reveja um documento. */
const MAX_CARACTERES = 400_000;
/** Um Livro Azul tem duas páginas; um exame veterinário, dez. */
const MAX_PAGINAS = 60;
/** Um `ObjStm` com mais objectos do que isto não é o documento de um cavalo. */
const MAX_OBJECTOS_COMPRIMIDOS = 10_000;
/** Formulários dentro de formulários: oito níveis chegam a qualquer desenho. */
const MAX_FUNDO_XOBJECT = 8;

/**
 * A fracção de caracteres reconhecíveis abaixo da qual se declara que não se
 * leu nada. Uma fonte de dois bytes lida como se fosse de um byte dá metade
 * dos caracteres a zero — cai muito abaixo disto.
 */
const MINIMO_LEGIVEL = 0.85;

/**
 * A fracção de códigos que se conseguiu traduzir, abaixo da qual não se
 * devolve texto nenhum. Conta-se código a código, e não caractere a
 * caractere: um código sem tradução não produz caractere nenhum, logo o crivo
 * de cima nunca o veria.
 */
const MINIMO_TRADUZIDO = 0.8;

/** Um salto lateral maior do que isto, em ems, é um espaço. */
const ESPACO_EM = 0.22;
/** Um salto vertical maior do que isto, em ems, é uma linha nova. */
const LINHA_EM = 0.4;
/** Um recuo para trás maior do que isto, em ems, também é uma linha nova. */
const RETORNO_EM = 2;

/** Quando não se sabe a largura de um glifo. Meia em é a média de uma serifada. */
const LARGURA_OMISSAO = 500;

export interface TextoDePdf {
  /** Vazio quando `origem` é `"nenhuma"`. */
  texto: string;
  origem: "pdf" | "nenhuma";
}

const NADA: TextoDePdf = { texto: "", origem: "nenhuma" };

// ---------------------------------------------------------------------------
// O ficheiro visto como texto
//
// Os bytes 0–255 correspondem um a um aos primeiros 256 pontos de código, e
// por isso um `latin1` do ficheiro inteiro tem os **mesmos índices** que o
// array de bytes. É o que permite procurar `obj` e `endstream` com as funções
// de string e usar o resultado para cortar bytes.
// ---------------------------------------------------------------------------

function comoLatin1(bytes: Uint8Array): string {
  let saida = "";
  const passo = 0x8000;
  for (let i = 0; i < bytes.length; i += passo) {
    saida += String.fromCharCode(...bytes.subarray(i, Math.min(i + passo, bytes.length)));
  }
  return saida;
}

interface ObjectoPdf {
  /** O texto entre `obj` e o `stream` ou o `endobj`. */
  dicionario: string;
  /** Onde começam os bytes do stream, quando o objecto tem um. */
  inicioDados?: number;
}

const DELIMITADOR = new Set([" ", "\t", "\r", "\n", "\f", "\0", ">", "]", "%"]);

/**
 * O índice dos objectos, feito a varrer o ficheiro em vez de a ler a tabela de
 * referências cruzadas.
 *
 * É de propósito. A tabela é a primeira coisa que se estraga — numa
 * actualização incremental mal fechada, num ficheiro cortado a meio de um
 * download, num PDF remendado à mão. O varrimento não depende dela, e para
 * quem só quer apanhar cadeias de caracteres o custo é uma passagem pelo
 * ficheiro.
 *
 * Um objecto declarado duas vezes fica com a **última** definição, que é o que
 * uma actualização incremental quer dizer.
 */
function indexar(vista: string): Map<string, ObjectoPdf> {
  const indice = new Map<string, ObjectoPdf>();
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

    if (temStream) {
      let dados = posStream + "stream".length;
      if (vista[dados] === "\r") dados += 1;
      if (vista[dados] === "\n") dados += 1;
      indice.set(`${Number(m[1])} ${Number(m[2])}`, {
        dicionario: vista.slice(corpo, posStream),
        inicioDados: dados,
      });
    } else {
      indice.set(`${Number(m[1])} ${Number(m[2])}`, {
        dicionario: vista.slice(corpo, posFim === -1 ? corpo : posFim),
      });
    }
  }

  return indice;
}

/** `5 0 R` → a chave do índice. `null` quando o valor não é uma referência. */
function referencia(valor: string | null): string | null {
  if (valor === null) return null;
  const m = /^\s*(\d{1,10})\s+(\d{1,5})\s+R\b/.exec(valor);
  return m ? `${Number(m[1])} ${Number(m[2])}` : null;
}

/**
 * O valor de uma chave dentro de um dicionário, em texto cru.
 *
 * Não se monta uma árvore do dicionário porque não é preciso: o que se procura
 * são meia dúzia de chaves conhecidas, e recortar da chave até ao fim do valor
 * chega para todas. O que **é** preciso é equilibrar `<< >>` e `[ ]`, senão um
 * `/Resources` com um dicionário lá dentro sai cortado a meio.
 */
function valorDe(dicionario: string, chave: string): string | null {
  const m = new RegExp(`/${chave}\\b`).exec(dicionario);
  if (!m) return null;

  let i = m.index + m[0].length;
  while (i < dicionario.length && /\s/.test(dicionario[i])) i += 1;
  if (i >= dicionario.length) return null;

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
      } else {
        j += 1;
      }
    }
    return dicionario.slice(i);
  }

  // Um valor simples: nome, número, ou uma referência indirecta.
  const resto = dicionario.slice(i, i + 64);
  const ref = /^\d{1,10}\s+\d{1,5}\s+R\b/.exec(resto);
  if (ref) return ref[0];
  const simples = /^(\/[^\s/<>[\]()]*|[-+.\d]+|true|false|null)/.exec(resto);
  return simples ? simples[0] : null;
}

// ---------------------------------------------------------------------------
// Streams
// ---------------------------------------------------------------------------

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

class Documento {
  /** As fontes já lidas, para não se voltar a inflar o mesmo `ToUnicode`. */
  private readonly fontesLidas = new Map<string, Fonte>();

  constructor(
    private readonly bruto: Uint8Array,
    private readonly vista: string,
    readonly indice: Map<string, ObjectoPdf>
  ) {}

  objecto(chave: string | null): ObjectoPdf | null {
    return chave ? (this.indice.get(chave) ?? null) : null;
  }

  /** Segue uma referência indirecta, se o valor for uma; senão devolve-o. */
  resolver(valor: string | null): string | null {
    if (valor === null) return null;
    const ref = referencia(valor);
    if (!ref) return valor;
    return this.indice.get(ref)?.dicionario ?? null;
  }

  /** Uma fonte, lida uma vez só por objecto. */
  fonte(chave: string): Fonte {
    const cache = this.fontesLidas.get(chave);
    if (cache) return cache;
    const objecto = this.indice.get(chave);
    const fonte = objecto ? lerFonte(this, objecto.dicionario) : FONTE_POR_OMISSAO;
    this.fontesLidas.set(chave, fonte);
    return fonte;
  }

  /** Os bytes de um stream, já inflados. `null` quando não se sabe lê-lo. */
  dados(objecto: ObjectoPdf): Uint8Array | null {
    if (objecto.inicioDados === undefined) return null;

    // Um preditor quer dizer que os bytes vêm filtrados linha a linha. Não se
    // usa em streams de conteúdo; onde aparece, é num sítio que não lemos.
    // Devolver os bytes por desfiltrar seria devolver lixo com ar de texto.
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

/**
 * Os objectos que vivem dentro de um `ObjStm`, acrescentados ao índice.
 *
 * Um PDF comprimido guarda os dicionários das páginas e das fontes lá dentro;
 * sem isto, um ficheiro desses parece não ter páginas nenhumas.
 */
function abrirObjectosComprimidos(doc: Documento): void {
  for (const objecto of [...doc.indice.values()]) {
    if (!/\/Type\s*\/ObjStm\b/.test(objecto.dicionario)) continue;

    const dados = doc.dados(objecto);
    if (!dados) continue;

    const n = Number.parseInt(doc.resolver(valorDe(objecto.dicionario, "N")) ?? "", 10);
    const primeiro = Number.parseInt(doc.resolver(valorDe(objecto.dicionario, "First")) ?? "", 10);
    if (!Number.isFinite(n) || !Number.isFinite(primeiro)) continue;
    if (n <= 0 || n > MAX_OBJECTOS_COMPRIMIDOS || primeiro < 0) continue;

    const texto = comoLatin1(dados);
    const cabecalho = texto.slice(0, primeiro).trim().split(/\s+/);
    for (let i = 0; i < n; i += 1) {
      const numero = Number(cabecalho[i * 2]);
      const posicao = Number(cabecalho[i * 2 + 1]);
      if (!Number.isFinite(numero) || !Number.isFinite(posicao)) continue;
      const seguinte = Number(cabecalho[i * 2 + 3]);
      const fim = i + 1 < n && Number.isFinite(seguinte) ? primeiro + seguinte : texto.length;
      const chave = `${numero} 0`;
      // Um objecto solto ganha ao comprimido: se o ficheiro traz os dois, o
      // solto é o da actualização mais recente.
      if (!doc.indice.has(chave)) {
        doc.indice.set(chave, { dicionario: texto.slice(primeiro + posicao, fim) });
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Fontes: de códigos para caracteres, e de caracteres para larguras
// ---------------------------------------------------------------------------

interface Fonte {
  /** Quantos bytes tem cada código. */
  largura: 1 | 2;
  /** Código → texto, vindo do `ToUnicode`. */
  mapa: Map<number, string> | null;
  /** Código → largura do glifo, em milésimos de em. */
  larguras: Map<number, number>;
  /** A largura de quem não está na tabela. */
  larguraOmissao: number;
}

/**
 * A fonte que se usa quando não se descobriu qual é.
 *
 * Um byte por código e sem tabela quer dizer «assume-se latin1», que é o que
 * as fontes simples com `WinAnsiEncoding` ou `StandardEncoding` fazem para
 * tudo o que nos interessa — algarismos e letras sem acento estão no mesmo
 * sítio nas três tabelas. Onde não estiverem, o crivo de legibilidade apanha.
 */
const FONTE_POR_OMISSAO: Fonte = {
  largura: 1,
  mapa: null,
  larguras: new Map(),
  larguraOmissao: LARGURA_OMISSAO,
};

function hexParaTexto(hex: string): string {
  let saida = "";
  for (let i = 0; i + 4 <= hex.length; i += 4) {
    saida += String.fromCharCode(Number.parseInt(hex.slice(i, i + 4), 16));
  }
  return saida;
}

/**
 * Um `ToUnicode` traduzido para uma tabela.
 *
 * São três formas, e as três aparecem no mesmo ficheiro: `bfchar` um a um,
 * `bfrange` com um destino que avança, e `bfrange` com uma lista de destinos.
 */
function lerToUnicode(cmap: string): { mapa: Map<number, string>; largura: 1 | 2 } {
  const mapa = new Map<number, string>();

  // O espaço de códigos diz quantos bytes tem cada código. `<0000> <ffff>` são
  // dois bytes; `<00> <ff>` é um. Sem isto, uma fonte Identity-H lia-se byte a
  // byte e cada caractere saía partido em dois.
  let largura: 1 | 2 = 1;
  const espaco = /begincodespacerange([\s\S]*?)endcodespacerange/.exec(cmap);
  if (espaco) {
    const primeiro = /<([0-9A-Fa-f]+)>/.exec(espaco[1]);
    if (primeiro && primeiro[1].length >= 4) largura = 2;
  }

  for (const bloco of cmap.matchAll(/beginbfchar([\s\S]*?)endbfchar/g)) {
    for (const par of bloco[1].matchAll(/<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]*)>/g)) {
      mapa.set(Number.parseInt(par[1], 16), hexParaTexto(par[2]));
    }
  }

  for (const bloco of cmap.matchAll(/beginbfrange([\s\S]*?)endbfrange/g)) {
    const linhas = /<([0-9A-Fa-f]+)>\s*<([0-9A-Fa-f]+)>\s*(<[0-9A-Fa-f]*>|\[[\s\S]*?\])/g;
    for (const linha of bloco[1].matchAll(linhas)) {
      const de = Number.parseInt(linha[1], 16);
      const ate = Number.parseInt(linha[2], 16);
      // Um intervalo absurdo é um ficheiro estragado, não uma fonte enorme.
      if (!Number.isFinite(de) || !Number.isFinite(ate) || ate < de || ate - de > 0xffff) continue;

      if (linha[3].startsWith("[")) {
        const destinos = [...linha[3].matchAll(/<([0-9A-Fa-f]*)>/g)];
        for (let i = 0; i <= ate - de && i < destinos.length; i += 1) {
          mapa.set(de + i, hexParaTexto(destinos[i][1]));
        }
      } else {
        const base = linha[3].slice(1, -1);
        const inicio = Number.parseInt(base, 16);
        if (!Number.isFinite(inicio)) continue;
        // Só o último caractere avança: um destino de vários caracteres é uma
        // ligadura, e uma ligadura não se incrementa.
        const prefixo = hexParaTexto(base.slice(0, Math.max(0, base.length - 4)));
        const ultimo = inicio & 0xffff;
        for (let i = 0; i <= ate - de; i += 1) {
          mapa.set(de + i, prefixo + String.fromCharCode((ultimo + i) & 0xffff));
        }
      }
    }
  }

  return { mapa, largura };
}

function numerosDe(bloco: string): number[] {
  return [...bloco.matchAll(/-?\d+(?:\.\d+)?/g)].map((m) => Number(m[0]));
}

/** As larguras de uma fonte simples: `/FirstChar` mais o array `/Widths`. */
function largurasSimples(doc: Documento, dicionario: string): Map<number, number> {
  const larguras = new Map<number, number>();
  const primeiro = Number.parseInt(doc.resolver(valorDe(dicionario, "FirstChar")) ?? "", 10);
  const bloco = doc.resolver(valorDe(dicionario, "Widths"));
  if (!bloco || !Number.isFinite(primeiro)) return larguras;

  const valores = numerosDe(bloco);
  for (let i = 0; i < valores.length; i += 1) {
    if (valores[i] > 0) larguras.set(primeiro + i, valores[i]);
  }
  return larguras;
}

/**
 * As larguras de uma fonte composta: o array `/W` do descendente.
 *
 * Tem duas formas, `c [w …]` e `cInicio cFim w`, e um ficheiro usa as duas.
 * Percorre-se à mão porque distinguir uma da outra é olhar para o que vem a
 * seguir ao primeiro número.
 */
function largurasCompostas(bloco: string): Map<number, number> {
  const larguras = new Map<number, number>();
  const simbolos = [...bloco.matchAll(/\[|\]|-?\d+(?:\.\d+)?/g)].map((m) => m[0]);

  // O primeiro `[` é o do próprio array `/W`.
  let i = simbolos[0] === "[" ? 1 : 0;
  while (i < simbolos.length) {
    const inicio = Number(simbolos[i]);
    if (!Number.isFinite(inicio)) break;
    i += 1;

    if (simbolos[i] === "[") {
      i += 1;
      let codigo = inicio;
      while (i < simbolos.length && simbolos[i] !== "]") {
        const w = Number(simbolos[i]);
        if (Number.isFinite(w) && w > 0) larguras.set(codigo, w);
        codigo += 1;
        i += 1;
      }
      i += 1;
    } else {
      const fim = Number(simbolos[i]);
      const w = Number(simbolos[i + 1]);
      i += 2;
      if (!Number.isFinite(fim) || !Number.isFinite(w) || fim < inicio) continue;
      // Um intervalo absurdo é um ficheiro estragado, não uma fonte enorme.
      if (fim - inicio > 0xffff) continue;
      for (let c = inicio; c <= fim; c += 1) if (w > 0) larguras.set(c, w);
    }
  }

  return larguras;
}

function lerFonte(doc: Documento, dicionario: string): Fonte {
  const paraUnicode = doc.objecto(referencia(valorDe(dicionario, "ToUnicode")));
  const composta = /\/Subtype\s*\/Type0\b/.test(dicionario);

  let mapa: Map<number, string> | null = null;
  let largura: 1 | 2 = composta ? 2 : 1;

  if (paraUnicode) {
    const dados = doc.dados(paraUnicode);
    if (dados) {
      const lido = lerToUnicode(comoLatin1(dados));
      if (lido.mapa.size > 0) {
        mapa = lido.mapa;
        if (!composta) largura = lido.largura;
      }
    }
  }

  if (composta) {
    const descendentes = doc.resolver(valorDe(dicionario, "DescendantFonts"));
    const primeiro = descendentes
      ? doc.objecto(referencia(/\d{1,10}\s+\d{1,5}\s+R/.exec(descendentes)?.[0] ?? null))
      : null;
    const dicDescendente = primeiro?.dicionario ?? descendentes ?? "";
    const w = doc.resolver(valorDe(dicDescendente, "W"));
    const dw = Number.parseInt(doc.resolver(valorDe(dicDescendente, "DW")) ?? "", 10);
    return {
      largura: 2,
      mapa,
      larguras: w ? largurasCompostas(w) : new Map(),
      // O PDF fixa mil milésimos como a largura por omissão de uma fonte
      // composta, e essa não é um palpite nosso: está na norma.
      larguraOmissao: Number.isFinite(dw) && dw > 0 ? dw : 1000,
    };
  }

  const larguras = largurasSimplesSeguras(doc, dicionario);
  return { largura, mapa, larguras, larguraOmissao: LARGURA_OMISSAO };
}

function largurasSimplesSeguras(doc: Documento, dicionario: string): Map<number, number> {
  try {
    return largurasSimples(doc, dicionario);
  } catch {
    return new Map();
  }
}

/** Os `/F1 5 0 R` de um `/Resources /Font`, já lidos. */
function lerFontes(doc: Documento, recursos: string | null): Map<string, Fonte> {
  const fontes = new Map<string, Fonte>();
  if (!recursos) return fontes;

  const bloco = doc.resolver(valorDe(recursos, "Font"));
  if (!bloco) return fontes;

  for (const m of bloco.matchAll(/\/([^\s/<>[\]()]+)\s*(\d{1,10}\s+\d{1,5}\s+R)/g)) {
    const chave = referencia(m[2]);
    if (chave) fontes.set(m[1], doc.fonte(chave));
  }

  return fontes;
}

// ---------------------------------------------------------------------------
// O stream de conteúdo
// ---------------------------------------------------------------------------

type Simbolo =
  | { k: "num"; v: number }
  | { k: "str"; v: number[] }
  | { k: "nome"; v: string }
  | { k: "op"; v: string }
  | { k: "abre" }
  | { k: "fecha" };

const ESPACO_PDF = new Set([" ", "\t", "\r", "\n", "\f", "\0"]);

const ESCAPES: Readonly<Record<string, number>> = {
  n: 10,
  r: 13,
  t: 9,
  b: 8,
  f: 12,
  "(": 40,
  ")": 41,
  "\\": 92,
};

function* simbolos(s: string): Generator<Simbolo> {
  let i = 0;
  while (i < s.length) {
    const c = s[i];

    if (ESPACO_PDF.has(c)) {
      i += 1;
    } else if (c === "%") {
      while (i < s.length && s[i] !== "\n" && s[i] !== "\r") i += 1;
    } else if (c === "(") {
      const bytes: number[] = [];
      let fundo = 1;
      i += 1;
      while (i < s.length && fundo > 0) {
        const d = s[i];
        if (d === "\\") {
          const e = s[i + 1];
          if (e === undefined) {
            i += 1;
          } else if (e >= "0" && e <= "7") {
            let octal = "";
            i += 1;
            while (octal.length < 3 && s[i] >= "0" && s[i] <= "7") {
              octal += s[i];
              i += 1;
            }
            bytes.push(Number.parseInt(octal, 8) & 0xff);
          } else if (e === "\n" || e === "\r") {
            // Barra ao fim da linha: continuação, não produz caractere.
            i += 2;
            if (e === "\r" && s[i] === "\n") i += 1;
          } else {
            bytes.push(ESCAPES[e] ?? e.charCodeAt(0));
            i += 2;
          }
        } else if (d === "(") {
          fundo += 1;
          bytes.push(40);
          i += 1;
        } else if (d === ")") {
          fundo -= 1;
          if (fundo > 0) bytes.push(41);
          i += 1;
        } else {
          bytes.push(d.charCodeAt(0) & 0xff);
          i += 1;
        }
      }
      yield { k: "str", v: bytes };
    } else if (c === "<" && s[i + 1] === "<") {
      // Um dicionário em linha (`BDC`, `gs`) não tem texto lá dentro que nos
      // interesse; salta-se equilibrado para não confundir o resto.
      let fundo = 0;
      while (i < s.length) {
        if (s.startsWith("<<", i)) {
          fundo += 1;
          i += 2;
        } else if (s.startsWith(">>", i)) {
          fundo -= 1;
          i += 2;
          if (fundo === 0) break;
        } else {
          i += 1;
        }
      }
    } else if (c === "<") {
      let hex = "";
      i += 1;
      while (i < s.length && s[i] !== ">") {
        if (/[0-9A-Fa-f]/.test(s[i])) hex += s[i];
        i += 1;
      }
      i += 1;
      if (hex.length % 2 === 1) hex += "0";
      const bytes: number[] = [];
      for (let j = 0; j < hex.length; j += 2) bytes.push(Number.parseInt(hex.slice(j, j + 2), 16));
      yield { k: "str", v: bytes };
    } else if (c === "[") {
      i += 1;
      yield { k: "abre" };
    } else if (c === "]") {
      i += 1;
      yield { k: "fecha" };
    } else if (c === "/") {
      let nome = "";
      i += 1;
      while (i < s.length && !ESPACO_PDF.has(s[i]) && !"/<>[]()%".includes(s[i])) {
        nome += s[i];
        i += 1;
      }
      yield { k: "nome", v: nome };
    } else if (/[-+.\d]/.test(c)) {
      let numero = "";
      while (i < s.length && /[-+.\d]/.test(s[i])) {
        numero += s[i];
        i += 1;
      }
      const v = Number.parseFloat(numero);
      yield { k: "num", v: Number.isFinite(v) ? v : 0 };
    } else {
      let op = "";
      while (i < s.length && !ESPACO_PDF.has(s[i]) && !"/<>[]()%".includes(s[i])) {
        op += s[i];
        i += 1;
      }
      if (op === "") i += 1;
      else yield { k: "op", v: op };
    }
  }
}

interface Contagem {
  /** Códigos que a fonte soube traduzir. */
  traduzidos: number;
  /** Códigos que ficaram por traduzir. */
  perdidos: number;
}

/** Um código mostrado: o texto que dá e a largura que ocupa. */
interface Glifo {
  texto: string;
  largura: number;
  espaco: boolean;
}

function glifosDe(bytes: number[], fonte: Fonte, contagem: Contagem): Glifo[] {
  const glifos: Glifo[] = [];
  const passo = fonte.largura;

  for (let i = 0; i + passo <= bytes.length; i += passo) {
    const codigo = passo === 2 ? (bytes[i] << 8) | bytes[i + 1] : bytes[i];
    const traduzido = fonte.mapa?.get(codigo);

    let texto: string;
    if (traduzido !== undefined) {
      texto = traduzido;
      contagem.traduzidos += 1;
    } else if (fonte.mapa || passo === 2) {
      // Há tabela e o código não está lá, ou são dois bytes sem tabela
      // nenhuma: em qualquer dos casos não se sabe que caractere é este.
      // Escrever um palpite seria inventar texto.
      texto = "";
      contagem.perdidos += 1;
    } else {
      texto = String.fromCharCode(codigo);
      contagem.traduzidos += 1;
    }

    glifos.push({
      texto,
      largura: fonte.larguras.get(codigo) ?? fonte.larguraOmissao,
      espaco: passo === 1 && codigo === 32,
    });
  }

  return glifos;
}

/** Uma matriz de texto: `a b c d e f`. */
type Matriz = [number, number, number, number, number, number];

function transladar(tx: number, ty: number, m: Matriz): Matriz {
  return [m[0], m[1], m[2], m[3], tx * m[0] + ty * m[2] + m[4], tx * m[1] + ty * m[3] + m[5]];
}

interface Estado {
  fonte: Fonte;
  tamanho: number;
  /** `Tc`, espaço entre caracteres. */
  tc: number;
  /** `Tw`, espaço entre palavras. */
  tw: number;
  /** `Tz`, escala horizontal, já dividida por cem. */
  th: number;
  /** `TL`, entrelinha. */
  tl: number;
}

function estadoNovo(): Estado {
  return { fonte: FONTE_POR_OMISSAO, tamanho: 0, tc: 0, tw: 0, th: 1, tl: 0 };
}

/**
 * Passa um stream de conteúdo a texto.
 *
 * O espaçamento sai da geometria e não dos operadores. Um `Td` a seguir a um
 * `Tj` pode ser a continuação da mesma palavra — é o que o motor do Chrome
 * escreve, um glifo de cada vez — ou pode ser um espaço, ou uma linha nova.
 * Quem decide é a distância que sobra depois de descontar a largura do que já
 * se escreveu.
 */
function textoDeConteudo(
  doc: Documento,
  conteudo: string,
  recursos: string | null,
  contagem: Contagem,
  fundo: number,
  visitados: Set<string>
): string {
  const fontes = lerFontes(doc, recursos);
  const partes: string[] = [];

  let estado = estadoNovo();
  const pilhaEstados: Estado[] = [];
  let tm: Matriz = [1, 0, 0, 1, 0, 0];
  let tlm: Matriz = [1, 0, 0, 1, 0, 0];
  let pilha: Simbolo[] = [];

  /**
   * Onde ficou a pena depois do último caractere escrito.
   *
   * Vive **fora** dos blocos `BT`/`ET` de propósito. Há produtores que abrem e
   * fecham um bloco por cada glifo — o motor do Chrome faz isso onde a fonte
   * muda a meio da palavra —, e quem tratasse cada bloco como um recomeço
   * partia essas palavras em pedaços de uma letra. O que separa duas escritas
   * é a distância entre elas, e a distância não sabe onde estão os blocos.
   */
  let pena: Matriz = [1, 0, 0, 1, 0, 0];

  /** A altura de uma em, na escala em que a matriz de texto está a trabalhar. */
  const em = () => {
    const escala = Math.sqrt(Math.abs(tm[0] * tm[3] - tm[1] * tm[2])) || 1;
    return Math.max(estado.tamanho * escala * estado.th, 0.001);
  };

  /** O que separa o que se escreveu do que se vai escrever a seguir. */
  const separar = () => {
    const unidade = em();
    const dy = tm[5] - pena[5];
    const dx = tm[4] - pena[4];
    if (Math.abs(dy) > LINHA_EM * unidade || dx < -RETORNO_EM * unidade) partes.push("\n");
    else if (dx > ESPACO_EM * unidade) partes.push(" ");
  };

  const mostrar = (simbolo: Simbolo | undefined) => {
    if (simbolo?.k !== "str") return;
    const glifos = glifosDe(simbolo.v, estado.fonte, contagem);
    let avanco = 0;
    for (const glifo of glifos) {
      partes.push(glifo.texto);
      avanco +=
        (glifo.largura / 1000) * estado.tamanho + estado.tc + (glifo.espaco ? estado.tw : 0);
    }
    tm = transladar(avanco * estado.th, 0, tm);
    pena = tm;
  };

  for (const simbolo of simbolos(conteudo)) {
    if (simbolo.k !== "op") {
      pilha.push(simbolo);
      // Um `[ … ]` de `TJ` cabe aqui; qualquer outra coisa é lixo que a
      // próxima operação limpa. O tecto evita que um stream estragado cresça
      // sem fim.
      if (pilha.length > 4096) pilha = pilha.slice(-2048);
      continue;
    }

    const num = (n: number): number => {
      const s = pilha[pilha.length - n];
      return s?.k === "num" ? s.v : 0;
    };

    switch (simbolo.v) {
      case "q":
        pilhaEstados.push({ ...estado });
        break;
      case "Q": {
        const anterior = pilhaEstados.pop();
        if (anterior) estado = anterior;
        break;
      }
      case "BT":
        tm = [1, 0, 0, 1, 0, 0];
        tlm = tm;
        break;
      case "Tf": {
        const nome = pilha.findLast((s) => s.k === "nome");
        if (nome?.k === "nome") estado.fonte = fontes.get(nome.v) ?? FONTE_POR_OMISSAO;
        estado.tamanho = num(1);
        break;
      }
      case "Tc":
        estado.tc = num(1);
        break;
      case "Tw":
        estado.tw = num(1);
        break;
      case "Tz":
        estado.th = (num(1) || 100) / 100;
        break;
      case "TL":
        estado.tl = num(1);
        break;
      case "Tm": {
        tlm = [num(6), num(5), num(4), num(3), num(2), num(1)];
        tm = tlm;
        separar();
        break;
      }
      case "Td":
      case "TD": {
        if (simbolo.v === "TD") estado.tl = -num(1);
        tlm = transladar(num(2), num(1), tlm);
        tm = tlm;
        separar();
        break;
      }
      case "T*": {
        tlm = transladar(0, -estado.tl, tlm);
        tm = tlm;
        separar();
        break;
      }
      case "Tj":
        mostrar(pilha[pilha.length - 1]);
        break;
      case "'":
      case '"': {
        if (simbolo.v === '"') {
          estado.tw = num(3);
          estado.tc = num(2);
        }
        tlm = transladar(0, -estado.tl, tlm);
        tm = tlm;
        separar();
        mostrar(pilha[pilha.length - 1]);
        break;
      }
      case "TJ": {
        let inicio = pilha.length - 1;
        while (inicio >= 0 && pilha[inicio].k !== "abre") inicio -= 1;
        for (let i = inicio + 1; i < pilha.length; i += 1) {
          const item = pilha[i];
          if (item.k === "str") {
            mostrar(item);
          } else if (item.k === "num") {
            // Um deslocamento dentro de um `TJ` é medido em milésimos de em e
            // conta ao contrário: positivo aproxima, negativo afasta.
            const recuo = (-item.v / 1000) * estado.tamanho * estado.th;
            tm = transladar(recuo, 0, tm);
            separar();
          }
        }
        break;
      }
      case "Do": {
        const nome = pilha.findLast((s) => s.k === "nome");
        if (nome?.k === "nome" && fundo < MAX_FUNDO_XOBJECT) {
          partes.push(textoDeXObject(doc, nome.v, recursos, contagem, fundo + 1, visitados));
        }
        break;
      }
      default:
        break;
    }

    pilha = [];
  }

  return partes.join("");
}

/**
 * Um formulário desenhado com `Do`.
 *
 * Não é um pormenor: o motor do Chrome, que produziu o único PDF a sério deste
 * repositório, mete quase todo o texto das páginas dentro destes. Sem os
 * seguir, um documento desses parece uma folha em branco.
 */
function textoDeXObject(
  doc: Documento,
  nome: string,
  recursos: string | null,
  contagem: Contagem,
  fundo: number,
  visitados: Set<string>
): string {
  if (!recursos) return "";
  const bloco = doc.resolver(valorDe(recursos, "XObject"));
  if (!bloco) return "";

  const escapado = nome.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(`/${escapado}\\s*(\\d{1,10}\\s+\\d{1,5}\\s+R)`).exec(bloco);
  const chave = referencia(m?.[1] ?? null);
  if (!chave || visitados.has(chave)) return "";

  const objecto = doc.indice.get(chave);
  if (!objecto || !/\/Subtype\s*\/Form\b/.test(objecto.dicionario)) return "";

  // Um formulário que se desenhe a si próprio é um ciclo, e um ciclo aqui é
  // uma pilha cheia. Marca-se antes de entrar e não se desmarca.
  visitados.add(chave);

  const dados = doc.dados(objecto);
  if (!dados) return "";

  const proprios = doc.resolver(valorDe(objecto.dicionario, "Resources"));
  return textoDeConteudo(doc, comoLatin1(dados), proprios ?? recursos, contagem, fundo, visitados);
}

// ---------------------------------------------------------------------------
// As páginas
// ---------------------------------------------------------------------------

/** Os `/Resources` da página, ou os do primeiro antepassado que os tenha. */
function recursosDaPagina(doc: Documento, pagina: ObjectoPdf): string | null {
  let actual: ObjectoPdf | null = pagina;
  for (let salto = 0; actual && salto < 32; salto += 1) {
    const recursos = doc.resolver(valorDe(actual.dicionario, "Resources"));
    if (recursos) return recursos;
    actual = doc.objecto(referencia(valorDe(actual.dicionario, "Parent")));
  }
  return null;
}

function conteudoDaPagina(doc: Documento, pagina: ObjectoPdf): string {
  const conteudos = valorDe(pagina.dicionario, "Contents");
  if (!conteudos) return "";

  const chaves: string[] = [];
  const directa = referencia(conteudos);
  if (directa) {
    // Pode ser uma referência para um array de referências.
    const alvo = doc.indice.get(directa);
    if (alvo && alvo.inicioDados === undefined && alvo.dicionario.trim().startsWith("[")) {
      for (const m of alvo.dicionario.matchAll(/\d{1,10}\s+\d{1,5}\s+R/g)) {
        const chave = referencia(m[0]);
        if (chave) chaves.push(chave);
      }
    } else {
      chaves.push(directa);
    }
  } else if (conteudos.trim().startsWith("[")) {
    for (const m of conteudos.matchAll(/\d{1,10}\s+\d{1,5}\s+R/g)) {
      const chave = referencia(m[0]);
      if (chave) chaves.push(chave);
    }
  }

  const partes: string[] = [];
  for (const chave of chaves) {
    const objecto = doc.indice.get(chave);
    if (!objecto) continue;
    const dados = doc.dados(objecto);
    if (dados) partes.push(comoLatin1(dados));
  }
  // O PDF manda tratar os vários streams de uma página como um só, e há
  // produtores que cortam a meio de um operador.
  return partes.join("\n");
}

// ---------------------------------------------------------------------------
// O crivo
// ---------------------------------------------------------------------------

/**
 * Um caractere que se aceita como texto lido.
 *
 * A régua é larga de propósito — cabe lá o alfabeto latino inteiro com
 * acentos, pontuação e os sinais que aparecem num documento oficial. O que
 * fica de fora são os caracteres de controlo e os blocos de outros
 * alfabetos, que é onde uma descodificação errada vai parar.
 */
function reconhecivel(codigo: number): boolean {
  if (codigo === 9 || codigo === 10 || codigo === 13) return true;
  if (codigo < 32) return false;
  if (codigo === 0xfffd) return false;
  return codigo <= 0x024f || (codigo >= 0x2000 && codigo <= 0x206f) || codigo === 0x20ac;
}

function limpar(texto: string): string {
  return texto
    .replace(/[^\S\n]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---------------------------------------------------------------------------
// A porta
// ---------------------------------------------------------------------------

/**
 * O texto de um PDF, ou nada.
 *
 * Nunca lança: um documento que não se sabe ler não é uma excepção, é o caso
 * normal. Quem chama recebe sempre uma resposta, e a resposta pode ser
 * «não li nada».
 */
export function extrairTextoDePdf(conteudo: Uint8Array): TextoDePdf {
  if (conteudo.length === 0 || conteudo.length > MAX_BYTES_PDF) return NADA;

  const vista = comoLatin1(conteudo);
  // O cabeçalho pode não estar no byte zero: há ficheiros com lixo à frente, e
  // o PDF manda procurá-lo nos primeiros mil bytes.
  if (!vista.slice(0, 1024).includes("%PDF-")) return NADA;

  // Um PDF cifrado dá streams que o zlib recusa — mas antes disso dá horas a
  // procurar porquê. Diz-se já aqui que não se leu nada.
  if (/\/Encrypt\b/.test(vista)) return NADA;

  const contagem: Contagem = { traduzidos: 0, perdidos: 0 };
  const partes: string[] = [];

  try {
    const doc = new Documento(conteudo, vista, indexar(vista));
    abrirObjectosComprimidos(doc);

    let paginas = 0;
    let escritos = 0;
    for (const objecto of doc.indice.values()) {
      if (paginas >= MAX_PAGINAS || escritos > MAX_CARACTERES) break;
      if (!/\/Type\s*\/Page(?![sA-Za-z])/.test(objecto.dicionario)) continue;
      paginas += 1;

      const folha = conteudoDaPagina(doc, objecto);
      if (!folha) continue;

      const texto = textoDeConteudo(
        doc,
        folha,
        recursosDaPagina(doc, objecto),
        contagem,
        0,
        new Set()
      );
      escritos += texto.length;
      partes.push(texto);
    }
  } catch {
    // Um ficheiro estragado a meio do caminho não deita fora o que já se leu,
    // mas também não passa por cima do crivo aqui em baixo.
  }

  const texto = limpar(partes.join("\n").slice(0, MAX_CARACTERES));
  if (texto.length === 0) return NADA;

  // Os dois crivos medem coisas diferentes, e são precisos os dois. O primeiro
  // conta o que a fonte não soube traduzir — códigos que nunca chegam a virar
  // caractere e que por isso são invisíveis ao segundo. O segundo conta o que
  // saiu mas não se parece com texto — o caso de uma fonte de dois bytes lida
  // byte a byte.
  const codigos = contagem.traduzidos + contagem.perdidos;
  if (codigos > 0 && contagem.traduzidos / codigos < MINIMO_TRADUZIDO) return NADA;

  const caracteres = [...texto];
  let bons = 0;
  for (const caractere of caracteres) {
    if (reconhecivel(caractere.codePointAt(0) ?? 0)) bons += 1;
  }
  if (bons / caracteres.length < MINIMO_LEGIVEL) return NADA;

  return { texto, origem: "pdf" };
}
