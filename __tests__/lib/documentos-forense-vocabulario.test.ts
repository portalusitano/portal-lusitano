/**
 * A disciplina da saída, verificada por máquina.
 *
 * O `sinais.ts` tem um teste que compara as chaves da sua saída contra uma
 * lista proibida. Este faz o mesmo, e mais três coisas — porque a regra que
 * este módulo tem de cumprir é mais exigente do que a dele: aqui cada achado
 * tem de trazer a **explicação inocente** ao lado, e essa não pode ser uma
 * frase que alguém se esqueça de escrever no dia em que acrescentar o décimo
 * segundo exame.
 *
 * A razão de isto ser um teste e não uma nota no cabeçalho: um número que diz
 * «73% de suspeita» é lido como sentença, e o preço de estar errado é acusar de
 * falsificação um criador que digitalizou o Livro Azul com o software que
 * tinha. Uma regra que dependa de quem revê o código se lembrar dela é uma
 * regra que se perde à primeira pressa.
 */

import { describe, expect, it } from "vitest";

import type { MimeDeDocumento } from "@/lib/documentos/contrato";
import { reunirForense, TIPOS_DE_ACHADO, type Achado } from "@/lib/documentos/forense";

import {
  acrescentarRevisao,
  esqueleto,
  montarJpeg,
  montarPdfComRemate,
  montarPng,
  montarTiff,
  montarWebp,
} from "./documentos-forense-ficheiros";

// ─── O corpo de prova ────────────────────────────────────────────────────────

const XMP = `<x:xmpmeta xmlns:x="adobe:ns:meta/"><rdf:RDF>
  <xmpMM:History><rdf:Seq>
    <rdf:li stEvt:action="saved" stEvt:softwareAgent="Adobe Photoshop 24.0"/>
  </rdf:Seq></xmpMM:History></rdf:RDF></x:xmpmeta>`;

const EXIF_COMPLETO = montarTiff({
  ifd0: [
    { etiqueta: 0x010f, valor: { ascii: "Apple" } },
    { etiqueta: 0x0131, valor: { ascii: "Adobe Photoshop 24.0" } },
  ],
  exif: [
    { etiqueta: 0xa002, valor: { long: 4032 } },
    { etiqueta: 0xa003, valor: { long: 3024 } },
  ],
  gps: [
    { etiqueta: 0x0001, valor: { ascii: "N" } },
    {
      etiqueta: 0x0002,
      valor: {
        rationals: [
          [38, 1],
          [43, 1],
          [0, 1],
        ],
      },
    },
    { etiqueta: 0x0003, valor: { ascii: "W" } },
    {
      etiqueta: 0x0004,
      valor: {
        rationals: [
          [9, 1],
          [8, 1],
          [0, 1],
        ],
      },
    },
  ],
});

/** Um PDF que dispara tudo o que um PDF pode disparar. */
function pdfComTudo(): Uint8Array {
  const base = montarPdfComRemate(
    [
      ...esqueleto(
        "BT /F1 10 Tf 100 700 Td (Microchip 620015004471234) Tj ET\n" +
          "1 1 1 rg\n90 690 200 20 re\nf\n"
      ),
      {
        numero: 8,
        dicionario:
          "<< /Producer (Adobe Photoshop 24.0) /Creator (Xerox WorkCentre) " +
          "/CreationDate (D:20240115103000Z) /ModDate (D:20240320120000Z) >>",
      },
      { numero: 9, dicionario: "<< /Type /Metadata /Subtype /XML >>", stream: XMP },
      {
        numero: 10,
        dicionario:
          "<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached " +
          "/Name (Joao Ferreira) /ByteRange [0 10 20 30] /Contents <00> >>",
      },
      { numero: 11, dicionario: "<< /FT /Sig /T (Assinatura2) >>" },
    ],
    { trailer: "<< /Root 1 0 R /Info 8 0 R >>" }
  );
  return acrescentarRevisao(base, [{ numero: 12, dicionario: "<< /Type /Annot >>" }]);
}

const CORPO: readonly { nome: string; bytes: Uint8Array; mime: MimeDeDocumento }[] = [
  { nome: "PDF com tudo", bytes: pdfComTudo(), mime: "application/pdf" },
  {
    nome: "PDF limpo",
    bytes: montarPdfComRemate(esqueleto("BT /F1 12 Tf 50 700 Td (Livro Azul) Tj ET\n")),
    mime: "application/pdf",
  },
  { nome: "PDF vazio", bytes: new Uint8Array(0), mime: "application/pdf" },
  { nome: "PDF que não é PDF", bytes: new Uint8Array([1, 2, 3]), mime: "application/pdf" },
  {
    nome: "JPEG com tudo",
    bytes: montarJpeg({
      exif: EXIF_COMPLETO,
      xmp: XMP,
      comentario: "gd-jpeg",
      photoshop: true,
      largura: 1200,
      altura: 900,
      depoisDoFim: new Uint8Array([9, 9, 9]),
    }),
    mime: "image/jpeg",
  },
  { nome: "JPEG pelado", bytes: montarJpeg({}), mime: "image/jpeg" },
  {
    nome: "PNG com texto",
    bytes: montarPng({ texto: [["Software", "GIMP 2.10"]] }),
    mime: "image/png",
  },
  { nome: "WebP com EXIF", bytes: montarWebp({ exif: EXIF_COMPLETO }), mime: "image/webp" },
  { nome: "PNG que não é PNG", bytes: new Uint8Array([7, 7, 7]), mime: "image/png" },
];

function todosOsAchados(): Achado[] {
  return CORPO.flatMap((caso) => reunirForense(caso.bytes, caso.mime));
}

// ─── As chaves proibidas ─────────────────────────────────────────────────────

const CHAVES_PROIBIDAS = ["gravidade", "risco", "score", "pontuacao", "accao", "decisao"] as const;

/** Todas as chaves da saída, incluindo as dos objectos lá dentro. */
function chavesDe(valor: unknown, encontradas = new Set<string>()): Set<string> {
  if (Array.isArray(valor)) {
    for (const item of valor) chavesDe(item, encontradas);
    return encontradas;
  }
  if (valor !== null && typeof valor === "object") {
    for (const [chave, dentro] of Object.entries(valor)) {
      encontradas.add(chave);
      chavesDe(dentro, encontradas);
    }
  }
  return encontradas;
}

/** Todos os textos da saída, para se lhes poder ler o vocabulário. */
function textosDe(valor: unknown, encontrados: string[] = []): string[] {
  if (typeof valor === "string") encontrados.push(valor);
  else if (Array.isArray(valor)) for (const item of valor) textosDe(item, encontrados);
  else if (valor !== null && typeof valor === "object") {
    for (const dentro of Object.values(valor)) textosDe(dentro, encontrados);
  }
  return encontrados;
}

describe("a saída não se parece com um veredicto", () => {
  it("nenhuma chave da lista proibida aparece, nem no fundo dos objectos", () => {
    const chaves = chavesDe(todosOsAchados());
    for (const proibida of CHAVES_PROIBIDAS) {
      expect(chaves.has(proibida)).toBe(false);
    }
  });

  it("a busca de chaves desce mesmo até ao fundo", () => {
    // Sem esta prova, o teste de cima passaria a olhar só para o primeiro nível
    // e ninguém daria por isso.
    expect(chavesDe([{ a: { b: [{ risco: 1 }] } }]).has("risco")).toBe(true);
  });

  it("nenhum texto traz uma percentagem, uma nota ou uma probabilidade", () => {
    for (const texto of textosDe(todosOsAchados())) {
      expect(texto).not.toMatch(/\d{1,3}\s?%/);
      expect(texto).not.toMatch(/probabilidade|pontuaç|classificaç[ãa]o de|n[íi]vel de risco/i);
      expect(texto).not.toMatch(/\b(alto|m[ée]dio|baixo)\s+risco\b/i);
    }
  });

  /**
   * As palavras «assinatura verificada» aparecem — a negá-lo.
   *
   * Uma proibição cega da expressão obrigaria a explicação a dizer por rodeios
   * exactamente aquilo que ela existe para dizer de frente. O que se proíbe é a
   * **afirmação**, e por isso a prova exige uma negação por perto.
   */
  const AFIRMACAO_DE_VALIDADE =
    /assinatura\s+(?:v[áa]lida|verificada|de confian[çc]a)|certificado\s+v[áa]lido/gi;

  it("em lado nenhum se afirma que uma assinatura é válida", () => {
    for (const texto of textosDe(todosOsAchados())) {
      for (const encontro of texto.matchAll(AFIRMACAO_DE_VALIDADE)) {
        const antes = texto.slice(Math.max(0, (encontro.index ?? 0) - 40), encontro.index);
        expect(antes).toMatch(/\b(n[ãa]o|nunca|sem)\b/i);
      }
    }
  });

  it("e a prova de validade apanharia mesmo uma afirmação", () => {
    const afirmar = (texto: string) => {
      for (const encontro of texto.matchAll(AFIRMACAO_DE_VALIDADE)) {
        const antes = texto.slice(Math.max(0, (encontro.index ?? 0) - 40), encontro.index);
        if (!/\b(n[ãa]o|nunca|sem)\b/i.test(antes)) return true;
      }
      return false;
    };
    expect(afirmar("O documento traz uma assinatura válida.")).toBe(true);
    expect(afirmar("Não se confirmou que a assinatura é verificada.")).toBe(false);
  });
});

// ─── A explicação inocente ───────────────────────────────────────────────────

describe("cada achado traz a sua explicação inocente", () => {
  it("todos os achados do corpo de prova a têm, e não é uma frase de encher", () => {
    const achados = todosOsAchados();
    expect(achados.length).toBeGreaterThan(10);

    for (const achado of achados) {
      expect(achado.observacao.trim().length).toBeGreaterThan(20);
      expect(achado.explicacaoInocente.trim().length).toBeGreaterThan(60);
      expect(achado.explicacaoInocente).not.toBe(achado.observacao);
    }
  });

  it("cada espécie de achado é produzida por pelo menos um ficheiro de prova", () => {
    // A cobertura é o que impede que um exame novo entre sem passar por aqui:
    // um tipo declarado e nunca produzido é um tipo que ninguém testou.
    const produzidos = new Set(todosOsAchados().map((a) => a.tipo));
    for (const tipo of TIPOS_DE_ACHADO) {
      expect(produzidos.has(tipo)).toBe(true);
    }
  });

  it("uma lista vazia nunca quer dizer «não se examinou»", () => {
    // Um ficheiro por examinar diz-se sempre por escrito. Sem isto, um painel
    // dava por limpo o único documento que ninguém abriu.
    for (const caso of CORPO) {
      const achados = reunirForense(caso.bytes, caso.mime);
      const naoExaminado = achados.some((a) => a.tipo === "nao_examinado");
      expect(achados.length > 0 || !naoExaminado).toBe(true);
    }
    expect(reunirForense(new Uint8Array(0), "application/pdf")).toHaveLength(1);
  });
});

// ─── Nunca lança ─────────────────────────────────────────────────────────────

/** Um gerador determinista: um teste que falha de vez em quando não serve. */
function aleatorios(semente: number): () => number {
  let estado = semente >>> 0;
  return () => {
    estado = (estado * 1664525 + 1013904223) >>> 0;
    return estado / 0x100000000;
  };
}

describe("o exame nunca lança, aconteça o que acontecer aos bytes", () => {
  const PREFIXOS: readonly (readonly [MimeDeDocumento, number[]])[] = [
    ["application/pdf", [0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x37, 0x0a]],
    ["image/jpeg", [0xff, 0xd8, 0xff, 0xe1]],
    ["image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]],
    ["image/webp", [0x52, 0x49, 0x46, 0x46, 0xff, 0xff, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50]],
  ];

  it("bytes ao acaso atrás de um cabeçalho verdadeiro não rebentam nada", () => {
    const proximo = aleatorios(20260904);
    for (const [mime, prefixo] of PREFIXOS) {
      for (let volta = 0; volta < 60; volta += 1) {
        const bytes = new Uint8Array(prefixo.length + 256);
        bytes.set(prefixo);
        for (let i = prefixo.length; i < bytes.length; i += 1) {
          bytes[i] = Math.floor(proximo() * 256);
        }
        expect(() => reunirForense(bytes, mime)).not.toThrow();
        expect(Array.isArray(reunirForense(bytes, mime))).toBe(true);
      }
    }
  });

  it("um ficheiro de prova cortado em qualquer sítio não rebenta", () => {
    for (const caso of CORPO) {
      if (caso.bytes.length < 8) continue;
      for (let corte = 1; corte < caso.bytes.length; corte += 11) {
        expect(() => reunirForense(caso.bytes.subarray(0, corte), caso.mime)).not.toThrow();
      }
    }
  });

  it("um PDF que se declare enorme dentro de um stream não faz alocar nada", () => {
    const bytes = montarPdfComRemate([
      { numero: 1, dicionario: "<< /Type /Catalog /Pages 2 0 R >>" },
      { numero: 2, dicionario: "<< /Type /Pages /Kids [3 0 R] /Count 1 >>" },
      {
        numero: 3,
        dicionario: "<< /Type /Page /Parent 2 0 R /Contents 4 0 R >>",
      },
      { numero: 4, dicionario: "<< /Length 999999999 >>", stream: "BT ET" },
    ]);
    expect(() => reunirForense(bytes, "application/pdf")).not.toThrow();
  });

  it("um valor de metadados enorme chega ao painel truncado", () => {
    const bytes = montarPdfComRemate(
      [
        ...esqueleto("BT ET\n"),
        { numero: 8, dicionario: `<< /Producer (${"A".repeat(50_000)}) >>` },
      ],
      { trailer: "<< /Root 1 0 R /Info 8 0 R >>" }
    );

    for (const texto of textosDe(reunirForense(bytes, "application/pdf"))) {
      expect(texto.length).toBeLessThan(1_000);
    }
  });
});
