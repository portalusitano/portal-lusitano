/**
 * PDFs feitos à mão, para os testes da leitura de documentos.
 *
 * São PDFs a sério — bytes que um leitor abre — e não amostras gravadas. A
 * razão é que o que se está a testar é o **parser**, e um parser testado
 * contra um ficheiro fixo só prova que sabe ler esse ficheiro. Aqui monta-se
 * cada caso: com camada de texto e sem, comprimido e não, com fonte de um
 * byte e de dois, com o `ToUnicode` e sem ele.
 *
 * Não há tabela de referências cruzadas em nenhum deles, e isso é de
 * propósito: o leitor não a usa, varre os objectos. Um ficheiro sem xref é
 * portanto também o teste dessa decisão.
 */

import { deflateSync } from "node:zlib";

export interface ObjectoDeProva {
  numero: number;
  dicionario: string;
  stream?: string | Uint8Array;
  /** Comprimir o stream com `FlateDecode`. */
  comprimir?: boolean;
}

function bytesDe(valor: string | Uint8Array): Uint8Array {
  return typeof valor === "string" ? new Uint8Array(Buffer.from(valor, "latin1")) : valor;
}

/** Monta um PDF a partir dos objectos, pela ordem em que vêm. */
export function montarPdf(objectos: ObjectoDeProva[], cabecalho = "%PDF-1.7\n"): Uint8Array {
  const pedacos: Uint8Array[] = [bytesDe(cabecalho)];

  for (const objecto of objectos) {
    if (objecto.stream === undefined) {
      pedacos.push(bytesDe(`${objecto.numero} 0 obj\n${objecto.dicionario}\nendobj\n`));
      continue;
    }

    const crus = bytesDe(objecto.stream);
    const dados = objecto.comprimir ? new Uint8Array(deflateSync(crus)) : crus;
    const filtro = objecto.comprimir ? "/Filter /FlateDecode " : "";
    const dicionario = objecto.dicionario.replace(
      /\s*>>\s*$/,
      ` ${filtro}/Length ${dados.length} >>`
    );
    pedacos.push(bytesDe(`${objecto.numero} 0 obj\n${dicionario}\nstream\n`));
    pedacos.push(dados);
    pedacos.push(bytesDe("\nendstream\nendobj\n"));
  }

  pedacos.push(bytesDe("trailer\n<< /Root 1 0 R >>\n%%EOF\n"));

  const total = pedacos.reduce((soma, p) => soma + p.length, 0);
  const saida = new Uint8Array(total);
  let escrito = 0;
  for (const pedaco of pedacos) {
    saida.set(pedaco, escrito);
    escrito += pedaco.length;
  }
  return saida;
}

/** Escapa o que um literal `( … )` de um stream de conteúdo não pode ter cru. */
function escapar(texto: string): string {
  return texto.replace(/[\\()]/g, "\\$&");
}

/**
 * Um stream de conteúdo com uma linha por entrada, todas com a mesma fonte.
 *
 * Vinte pontos entre linhas: bem acima do limiar que o leitor usa para decidir
 * que mudou de linha, e portanto o teste não fica dependente desse número.
 */
export function conteudoEmLinhas(linhas: string[], fonte = "F1", tamanho = 12): string {
  const corpo = linhas
    .map((linha, i) => `${i === 0 ? "50 700 Td" : "0 -20 Td"} (${escapar(linha)}) Tj`)
    .join("\n");
  return `BT\n/${fonte} ${tamanho} Tf\n${corpo}\nET\n`;
}

/**
 * Um PDF com camada de texto e uma fonte simples de um byte.
 *
 * É o caso mais comum de todos: um Livro Azul passado num multifunções com
 * reconhecimento de texto, ou um documento gerado por um computador.
 */
export function pdfComTexto(linhas: string[], opcoes: { comprimir?: boolean } = {}): Uint8Array {
  return montarPdf([
    { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
    { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
    {
      numero: 3,
      dicionario:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    },
    {
      numero: 4,
      dicionario:
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    },
    {
      numero: 5,
      dicionario: "<< >>",
      stream: conteudoEmLinhas(linhas),
      comprimir: opcoes.comprimir,
    },
  ]);
}

// ---------------------------------------------------------------------------
// Fonte composta: dois bytes por código
// ---------------------------------------------------------------------------

/**
 * Uma fonte `Identity-H` inventada para o teste: o código de cada caractere é
 * a sua posição na cadeia `alfabeto`, mais um.
 *
 * O «mais um» não é um pormenor: o código zero é o `.notdef` de qualquer fonte
 * e não aparece num `ToUnicode` verdadeiro.
 */
export function codificarIdentity(texto: string, alfabeto: string): string {
  let hex = "";
  for (const caractere of texto) {
    const indice = alfabeto.indexOf(caractere);
    hex += (indice === -1 ? 0 : indice + 1).toString(16).padStart(4, "0");
  }
  return hex;
}

function cmapDe(alfabeto: string): string {
  const entradas = [...alfabeto]
    .map((c, i) => `<${(i + 1).toString(16).padStart(4, "0")}> <${hexUtf16(c)}>`)
    .join("\n");
  return [
    "/CIDInit /ProcSet findresource begin",
    "12 dict begin begincmap",
    "1 begincodespacerange",
    "<0000> <FFFF>",
    "endcodespacerange",
    `${[...alfabeto].length} beginbfchar`,
    entradas,
    "endbfchar",
    "endcmap end end",
  ].join("\n");
}

function hexUtf16(caractere: string): string {
  let hex = "";
  for (let i = 0; i < caractere.length; i += 1) {
    hex += caractere.charCodeAt(i).toString(16).padStart(4, "0");
  }
  return hex;
}

/**
 * Um PDF com fonte composta de dois bytes.
 *
 * Com `comToUnicode` a `false` fica o caso que o leitor **tem** de recusar: os
 * códigos são índices de glifo dentro de uma fonte que não temos, e não há
 * maneira honesta de os traduzir.
 */
export function pdfComFonteComposta(
  linhas: string[],
  opcoes: { comToUnicode?: boolean } = {}
): Uint8Array {
  const alfabeto = [...new Set(linhas.join(""))].join("");
  const corpo = linhas
    .map(
      (linha, i) =>
        `${i === 0 ? "50 700 Td" : "0 -20 Td"} <${codificarIdentity(linha, alfabeto)}> Tj`
    )
    .join("\n");

  const objectos: ObjectoDeProva[] = [
    { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
    { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
    {
      numero: 3,
      dicionario:
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
        "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    },
    {
      numero: 4,
      dicionario:
        "<< /Type /Font /Subtype /Type0 /BaseFont /Prova /Encoding /Identity-H " +
        "/DescendantFonts [6 0 R]" +
        (opcoes.comToUnicode === false ? "" : " /ToUnicode 7 0 R") +
        " >>",
    },
    {
      numero: 5,
      dicionario: "<< >>",
      stream: `BT\n/F1 12 Tf\n${corpo}\nET\n`,
    },
    {
      numero: 6,
      dicionario:
        "<< /Type /Font /Subtype /CIDFontType2 /BaseFont /Prova " +
        "/CIDSystemInfo << /Registry (Adobe) /Ordering (Identity) /Supplement 0 >> /DW 600 >>",
    },
  ];

  if (opcoes.comToUnicode !== false) {
    objectos.push({ numero: 7, dicionario: "<< >>", stream: cmapDe(alfabeto), comprimir: true });
  }

  return montarPdf(objectos);
}

/**
 * O mesmo conteúdo, mas com a página e a fonte metidas dentro de um `ObjStm`.
 *
 * É como um PDF comprimido guarda os dicionários. Sem abrir o `ObjStm`, um
 * ficheiro destes parece não ter páginas nenhumas.
 */
export function pdfComObjectosComprimidos(linhas: string[]): Uint8Array {
  const dicionarios = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] " +
      "/Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
  ];

  let deslocamento = 0;
  const cabecalho: string[] = [];
  const corpo: string[] = [];
  dicionarios.forEach((dicionario, i) => {
    cabecalho.push(`${i + 1} ${deslocamento}`);
    corpo.push(dicionario);
    deslocamento += dicionario.length + 1;
  });

  const inicio = `${cabecalho.join(" ")}\n`;
  return montarPdf([
    {
      numero: 8,
      dicionario: `<< /Type /ObjStm /N ${dicionarios.length} /First ${inicio.length} >>`,
      stream: inicio + corpo.join("\n") + "\n",
      comprimir: true,
    },
    { numero: 5, dicionario: "<< >>", stream: conteudoEmLinhas(linhas) },
  ]);
}
