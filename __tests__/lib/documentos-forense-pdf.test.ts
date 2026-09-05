/**
 * O exame da estrutura, dos metadados e das assinaturas de um PDF.
 *
 * Os casos que mais interessam aqui não são os que apanham alguma coisa: são os
 * que **não apanham**. Um PDF escrito de uma vez não pode dar «guardado duas
 * vezes», e um PDF optimizado para a web — que tem dois `%%EOF` sem nunca ter
 * sido editado — também não. Um aviso que dispare nesses dois é um aviso que
 * dispara em metade dos ficheiros bons, e um aviso desses ensina quem revê a
 * não ler avisos.
 */

import { describe, expect, it } from "vitest";

import { reunirForense } from "@/lib/documentos/forense";
import {
  dataPdfParaIso,
  PdfCru,
  textoDeStringPdf,
  valorDe,
  vistaLatin1,
} from "@/lib/documentos/forense/pdf-cru";
import {
  examinarAssinaturas,
  examinarCamposPorAssinar,
  examinarHistoricoXmp,
  examinarMetadados,
  examinarRevisoes,
} from "@/lib/documentos/forense/pdf-historia";

import {
  acrescentarRevisao,
  esqueleto,
  montarPdfComRemate,
  type ObjectoPdf,
} from "./documentos-forense-ficheiros";

function abrir(bytes: Uint8Array): PdfCru {
  return new PdfCru(bytes, vistaLatin1(bytes));
}

const CONTEUDO = "BT /F1 12 Tf 50 700 Td (Livro Azul) Tj ET\n";

function pdf(extras: readonly ObjectoPdf[] = [], trailer?: string): Uint8Array {
  return montarPdfComRemate([...esqueleto(CONTEUDO), ...extras], trailer ? { trailer } : {});
}

/** Um PDF optimizado para leitura na web: o objecto `/Linearized` vem à cabeça. */
function linearizado(): Uint8Array {
  return montarPdfComRemate([
    { numero: 9, dicionario: "<< /Linearized 1 /L 1234 /O 3 /E 900 /N 1 /T 800 >>" },
    ...esqueleto(CONTEUDO),
  ]);
}

// ─── Revisões ────────────────────────────────────────────────────────────────

describe("quantas vezes o ficheiro foi guardado", () => {
  it("um PDF escrito de uma vez não dá achado nenhum", () => {
    expect(examinarRevisoes(abrir(pdf()))).toBeNull();
  });

  it("uma actualização incremental conta duas revisões", () => {
    const base = pdf();
    const depois = acrescentarRevisao(base, [
      { numero: 6, dicionario: "<< /Type /Annot /Subtype /Widget >>" },
    ]);

    const achado = examinarRevisoes(abrir(depois));
    expect(achado?.revisoes).toBe(2);
    expect(achado?.linearizado).toBe(false);
    expect(achado?.tabelasEncadeadas).toBe(1);
  });

  it("um objecto reescrito por cima do original fica listado", () => {
    const base = pdf();
    const depois = acrescentarRevisao(base, [
      { numero: 4, dicionario: "<< >>", stream: "BT /F1 12 Tf 50 700 Td (Outra coisa) Tj ET\n" },
    ]);

    const achado = examinarRevisoes(abrir(depois));
    expect(achado?.objectosRedefinidos).toEqual(["4 0"]);
  });

  it("um PDF linearizado tem dois remates e não é dado como editado", () => {
    // A optimização para a web escreve uma tabela ao princípio e outra ao fim.
    // Sem o desconto, todo o PDF servido por um site aparecia como editado — e
    // um aviso que dispara em metade dos ficheiros bons não é um aviso.
    const comDoisRemates = acrescentarRevisao(linearizado(), []);
    expect(examinarRevisoes(abrir(comDoisRemates))).toBeNull();
  });

  it("mas um linearizado que depois foi mesmo editado conta a edição", () => {
    const base = acrescentarRevisao(linearizado(), []);
    const editado = acrescentarRevisao(base, [
      { numero: 4, dicionario: "<< >>", stream: "BT /F1 12 Tf 50 700 Td (Outra) Tj ET\n" },
    ]);

    const achado = examinarRevisoes(abrir(editado));
    expect(achado?.linearizado).toBe(true);
    expect(achado?.revisoes).toBe(2);
  });

  it("um %%EOF que caia dentro de um stream comprimido não conta como remate", () => {
    // Cinco bytes aparecem por acaso; `startxref`, algarismos e `%%EOF` não.
    const armadilha = pdf([
      { numero: 7, dicionario: "<< >>", stream: "lixo %%EOF mais lixo %%EOF\n" },
    ]);
    expect(examinarRevisoes(abrir(armadilha))).toBeNull();
  });

  it("bytes a seguir ao último %%EOF são contados", () => {
    const base = pdf();
    const comCauda = new Uint8Array(base.length + 5);
    comCauda.set(base);
    comCauda.set([0x41, 0x42, 0x43, 0x44, 0x45], base.length);

    expect(examinarRevisoes(abrir(comCauda))?.bytesDepoisDoFim).toBe(5);
  });
});

// ─── Metadados ───────────────────────────────────────────────────────────────

describe("os metadados do dicionário de informação", () => {
  const comInfo = (campos: string) =>
    pdf([{ numero: 8, dicionario: `<< ${campos} >>` }], "<< /Root 1 0 R /Info 8 0 R >>");

  it("lê o produtor, o criador e as datas", () => {
    const achado = examinarMetadados(
      abrir(
        comInfo(
          "/Producer (Adobe Photoshop 24.0) /Creator (Xerox WorkCentre) " +
            "/CreationDate (D:20240115103000+01'00') /ModDate (D:20240220120000+01'00')"
        )
      )
    );

    const porCampo = new Map(achado?.campos.map((c) => [c.campo, c]));
    expect(porCampo.get("Producer")?.valor).toBe("Adobe Photoshop 24.0");
    expect(porCampo.get("CreationDate")?.iso).toBe("2024-01-15T09:30:00.000Z");
    expect(achado?.diasEntreCriacaoEModificacao).toBe(36);
  });

  it("as famílias das ferramentas não são uma escala: o digitalizador aparece como o editor", () => {
    const achado = examinarMetadados(
      abrir(comInfo("/Producer (Adobe Photoshop 24.0) /Creator (Xerox WorkCentre 7845)"))
    );

    const familias = new Map(achado?.ferramentas.map((f) => [f.campo, f.familia]));
    expect(familias.get("Producer")).toBe("editor_de_imagem");
    expect(familias.get("Creator")).toBe("digitalizador");
  });

  it("uma ferramenta que não se reconhece não é adivinhada, mas o valor cru fica", () => {
    const achado = examinarMetadados(abrir(comInfo("/Producer (Coudelaria Scan Tool 9)")));
    expect(achado?.campos.some((c) => c.valor === "Coudelaria Scan Tool 9")).toBe(true);
  });

  it("uma gravação incremental deixa dois dicionários, e vêm os dois", () => {
    const base = pdf(
      [{ numero: 8, dicionario: "<< /Producer (Impressora do escritorio) >>" }],
      "<< /Root 1 0 R /Info 8 0 R >>"
    );
    const depois = acrescentarRevisao(
      base,
      [{ numero: 10, dicionario: "<< /Producer (Adobe Photoshop 24.0) >>" }],
      { trailer: `<< /Root 1 0 R /Info 10 0 R /Prev ${base.length} >>` }
    );

    const achado = examinarMetadados(abrir(depois));
    expect(achado?.dicionarios).toBe(2);
    const valores = achado?.campos.map((c) => c.valor) ?? [];
    expect(valores).toContain("Impressora do escritorio");
    expect(valores).toContain("Adobe Photoshop 24.0");
  });

  it("uma string em UTF-16 lê-se, e os caracteres de controlo saem", () => {
    // `FE FF` à cabeça é a marca de dois bytes por caractere.
    const hex = "FEFF00500061007300730061007000" + "6F007200740065";
    const achado = examinarMetadados(abrir(comInfo(`/Producer <${hex}>`)));
    expect(achado?.campos[0].valor).toBe("Passaporte");
  });

  it("um valor com caracteres de controlo chega ao painel sem eles", () => {
    const achado = examinarMetadados(abrir(comInfo("/Producer (linha\\rum\\nlinha dois)")));
    expect(achado?.campos[0].valor).toBe("linha um linha dois");
  });

  it("um PDF sem dicionário de informação não dá achado nenhum", () => {
    expect(examinarMetadados(abrir(pdf()))).toBeNull();
  });
});

// ─── XMP ─────────────────────────────────────────────────────────────────────

describe("o histórico de edição que o XMP guarda", () => {
  const XMP = `<?xpacket begin=""?><x:xmpmeta xmlns:x="adobe:ns:meta/">
    <rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#">
      <rdf:Description xmlns:xmpMM="http://ns.adobe.com/xap/1.0/mm/">
        <xmpMM:History>
          <rdf:Seq>
            <rdf:li stEvt:action="created" stEvt:softwareAgent="Adobe InDesign 19.0"/>
            <rdf:li stEvt:action="saved" stEvt:softwareAgent="Adobe Photoshop 24.0"/>
            <rdf:li stEvt:action="saved" stEvt:softwareAgent="Adobe Photoshop 24.0"/>
          </rdf:Seq>
        </xmpMM:History>
      </rdf:Description>
    </rdf:RDF></x:xmpmeta><?xpacket end="w"?>`;

  it("conta as entradas e nomeia as ferramentas sem as repetir", () => {
    const achado = examinarHistoricoXmp(
      abrir(pdf([{ numero: 11, dicionario: "<< /Type /Metadata /Subtype /XML >>", stream: XMP }]))
    );

    expect(achado?.entradas).toBe(3);
    expect(achado?.ferramentas).toEqual(["Adobe InDesign 19.0", "Adobe Photoshop 24.0"]);
    expect(achado?.operacoes).toEqual(["created", "saved"]);
  });

  it("lê o XMP mesmo comprimido, que é como quase sempre vem", () => {
    const achado = examinarHistoricoXmp(
      abrir(
        pdf([
          {
            numero: 11,
            dicionario: "<< /Type /Metadata /Subtype /XML >>",
            stream: XMP,
            comprimir: true,
          },
        ])
      )
    );
    expect(achado?.entradas).toBe(3);
  });

  it("um PDF sem XMP não dá achado nenhum", () => {
    expect(examinarHistoricoXmp(abrir(pdf()))).toBeNull();
  });
});

// ─── Assinaturas ─────────────────────────────────────────────────────────────

describe("as assinaturas digitais", () => {
  it("regista a presença e o formato, e não diz que é válida", () => {
    const bytes = pdf([
      {
        numero: 12,
        dicionario:
          "<< /Type /Sig /Filter /Adobe.PPKLite /SubFilter /adbe.pkcs7.detached " +
          "/Name (Joao Ferreira) /Reason (Aprovacao) /M (D:20240301090000Z) " +
          "/ByteRange [0 100 200 300] /Contents <00> >>",
      },
    ]);

    const [achado] = examinarAssinaturas(abrir(bytes));
    expect(achado.formato).toBe("adbe.pkcs7.detached");
    expect(achado.motor).toBe("Adobe.PPKLite");
    expect(achado.carimboDoTempo).toBe(false);
    expect(achado.campos.find((c) => c.campo === "Name")?.valor).toBe("Joao Ferreira");
    expect(achado.campos.find((c) => c.campo === "M")?.iso).toBe("2024-03-01T09:00:00.000Z");

    // A regra que não se negoceia: em lado nenhum se afirma validade.
    const texto = `${achado.observacao} ${achado.explicacaoInocente}`.toLowerCase();
    expect(texto).toContain("não se verificou");
    expect(texto).not.toMatch(/assinatura válida|validad[ae] confirmada|certificado de confiança/);
  });

  it("mede os bytes que ficam fora do intervalo declarado, sem abrir certificado nenhum", () => {
    const bytes = pdf([
      {
        numero: 12,
        dicionario:
          "<< /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [0 10 20 30] /Contents <00> >>",
      },
    ]);

    const [achado] = examinarAssinaturas(abrir(bytes));
    expect(achado.bytesForaDoIntervaloAssinado).toBe(bytes.length - 50);
  });

  it("um /ByteRange que declare mais bytes do que o ficheiro tem não produz um número", () => {
    const bytes = pdf([
      {
        numero: 12,
        dicionario:
          "<< /Type /Sig /SubFilter /adbe.pkcs7.detached /ByteRange [0 10 20 999999] /Contents <00> >>",
      },
    ]);
    expect(examinarAssinaturas(abrir(bytes))[0].bytesForaDoIntervaloAssinado).toBeUndefined();
  });

  it("distingue um carimbo do tempo de uma assinatura de pessoa", () => {
    const bytes = pdf([
      {
        numero: 12,
        dicionario:
          "<< /Type /DocTimeStamp /SubFilter /ETSI.RFC3161 /ByteRange [0 10 20 30] /Contents <00> >>",
      },
    ]);
    expect(examinarAssinaturas(abrir(bytes))[0].carimboDoTempo).toBe(true);
  });

  it("um campo de assinatura por preencher conta-se à parte", () => {
    const bytes = pdf([{ numero: 13, dicionario: "<< /FT /Sig /T (Assinatura1) >>" }]);
    expect(examinarCamposPorAssinar(abrir(bytes))?.campos).toBe(1);
  });

  it("um campo já assinado não conta como por assinar", () => {
    const bytes = pdf([{ numero: 13, dicionario: "<< /FT /Sig /T (Assinatura1) /V 12 0 R >>" }]);
    expect(examinarCamposPorAssinar(abrir(bytes))).toBeNull();
  });
});

// ─── A porta ─────────────────────────────────────────────────────────────────

describe("a porta do exame de um PDF", () => {
  it("um ficheiro cifrado diz que não foi examinado, e não que está limpo", () => {
    const bytes = pdf([], "<< /Root 1 0 R /Encrypt 9 0 R >>");
    const [achado] = reunirForense(bytes, "application/pdf");
    expect(achado.tipo).toBe("nao_examinado");
    expect(achado).toMatchObject({ porque: "pdf_cifrado" });
  });

  it("bytes que não são um PDF dizem que não foi examinado", () => {
    const [achado] = reunirForense(new Uint8Array([1, 2, 3, 4]), "application/pdf");
    expect(achado).toMatchObject({ tipo: "nao_examinado", porque: "nao_parece_o_formato" });
  });

  it("um ficheiro vazio diz que não foi examinado", () => {
    const [achado] = reunirForense(new Uint8Array(0), "application/pdf");
    expect(achado).toMatchObject({ tipo: "nao_examinado", porque: "ficheiro_vazio" });
  });

  it("um PDF limpo não devolve nada, o que é diferente de não ter sido examinado", () => {
    const achados = reunirForense(pdf(), "application/pdf");
    expect(achados).toEqual([]);
  });
});

// ─── As peças soltas ─────────────────────────────────────────────────────────

describe("as peças de leitura crua", () => {
  it("um valor com parêntesis lá dentro não sai cortado a meio", () => {
    expect(textoDeStringPdf(valorDe("<< /Producer (Acrobat (versao 9)) /X 1 >>", "Producer"))).toBe(
      "Acrobat (versao 9)"
    );
  });

  it("uma chave não casa com outra que comece pelas mesmas letras", () => {
    expect(valorDe("<< /ModDateOriginal (x) /ModDate (y) >>", "ModDate")).toBe("(y)");
  });

  it("uma data que não se percebe fica por perceber, em vez de ser inventada", () => {
    expect(dataPdfParaIso("ontem de manhã")).toBeNull();
    expect(dataPdfParaIso("D:20249915103000")).toBeNull();
  });

  it("uma data sem fuso lê-se como estando em UTC", () => {
    expect(dataPdfParaIso("D:20240115103000")).toBe("2024-01-15T10:30:00.000Z");
  });
});
