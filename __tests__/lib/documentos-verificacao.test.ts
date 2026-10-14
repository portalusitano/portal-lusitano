/**
 * A junta dos cinco motores: o que ela promete, e o que nunca faz.
 *
 * O teste irmão — `documentos-verificacao-vocabulario` — prova que a saída não
 * se parece com um veredicto. Este prova o resto: que a ordem é a de leitura e
 * é estável, que o texto do documento **não** fica guardado, que a análise
 * nunca deita abaixo uma subida, e que a diferença entre «não se examinou» e
 * «examinou-se e não há nada» sobrevive à ida e volta à base de dados.
 */

import { describe, expect, it } from "vitest";

import { reunirForense } from "@/lib/documentos/forense";
import {
  analisarDocumento,
  forenseDaLinha,
  leituraParaGuardar,
  reunirVerificacao,
  type ForenseGuardada,
} from "@/lib/documentos/verificacao";
import type { Sinal } from "@/lib/documentos/sinais";
import type { Achado as AchadoDeCoerencia } from "@/lib/documentos/coerencia";

import { montarJpeg, montarPdfComRemate, esqueleto } from "./documentos-forense-ficheiros";
import { pdfComTexto } from "./documentos-leitura-pdfs";

// ─── O que se guarda, e o que se deita fora ──────────────────────────────────

describe("o texto do documento não fica guardado", () => {
  it("a leitura que vai para a base perde o texto e mantém o resto", () => {
    const guardada = leituraParaGuardar({
      texto: "MAESTOSO XV\nProprietário: João Ferreira\nRua das Coudelarias 12, Golegã",
      ueln: "620015004471234",
      microchip: "620015004471234",
      numeroRegisto: "LUS201900421",
      nome: "MAESTOSO XV",
      origem: "pdf",
    });

    expect(guardada).not.toHaveProperty("texto");
    expect(guardada).toEqual({
      ueln: "620015004471234",
      microchip: "620015004471234",
      numeroRegisto: "LUS201900421",
      nome: "MAESTOSO XV",
      origem: "pdf",
    });
  });

  it("nenhuma parte da morada do proprietário sobrevive", () => {
    // A razão de a regra existir: um passaporte equino traz o nome e a morada
    // de quem é dono do cavalo, e a coluna `jsonb` não é cifrada.
    const guardada = leituraParaGuardar({
      texto: "Proprietário: João Ferreira, Rua das Coudelarias 12, 2150 Golegã",
      origem: "pdf",
    });
    expect(JSON.stringify(guardada)).not.toMatch(/Ferreira|Coudelarias|Golegã/);
  });

  it("a origem fica, porque é ela que distingue «não tinha texto» de «tinha e não dizia nada»", () => {
    expect(leituraParaGuardar({ origem: "nenhuma" })).toEqual({ origem: "nenhuma" });
    expect(leituraParaGuardar({ texto: "muito texto", origem: "pdf" })).toEqual({ origem: "pdf" });
  });

  it("o que a subida guarda de um PDF a sério não traz o texto lá dentro", () => {
    const pdf = pdfComTexto([
      "Livro Azul — MAESTOSO XV",
      "Proprietario: Joao Ferreira, Rua das Coudelarias 12",
      "Microchip 620015004471234",
    ]);

    const analise = analisarDocumento(pdf, "application/pdf");
    expect(analise.leitura.origem).toBe("pdf");
    expect(analise.leitura.texto).toBeTruthy();

    const guardada = leituraParaGuardar(analise.leitura);
    expect(JSON.stringify(guardada)).not.toMatch(/Coudelarias|Joao Ferreira/);
  });
});

// ─── A análise nunca faz perder um documento ─────────────────────────────────

describe("a análise nunca deita abaixo uma subida", () => {
  const LIXO: readonly Uint8Array[] = [
    new Uint8Array(0),
    new Uint8Array([1, 2, 3]),
    new Uint8Array(Array.from({ length: 500 }, (_, i) => (i * 37) % 256)),
  ];

  it("bytes que não são nada não lançam", () => {
    for (const bytes of LIXO) {
      expect(() => analisarDocumento(bytes, "application/pdf")).not.toThrow();
      expect(() => analisarDocumento(bytes, "image/jpeg")).not.toThrow();
    }
  });

  it("um ficheiro cortado em qualquer sítio não lança", () => {
    const pdf = montarPdfComRemate(esqueleto("BT /F1 12 Tf 50 700 Td (Livro Azul) Tj ET\n"));
    for (let corte = 1; corte < pdf.length; corte += 17) {
      expect(() => analisarDocumento(pdf.subarray(0, corte), "application/pdf")).not.toThrow();
    }
  });

  it("um ficheiro ilegível dá um exame que correu e disse que não examinou", () => {
    // A distinção que sustenta tudo: `correu: true` com um achado
    // `nao_examinado` é «olhámos e não soubemos abrir». Não é `correu: false`,
    // que é «o analisador rebentou».
    const analise = analisarDocumento(new Uint8Array([1, 2, 3]), "application/pdf");
    expect(analise.forense.correu).toBe(true);
    if (!analise.forense.correu) throw new Error("inalcançável");
    expect(analise.forense.achados.some((a) => a.tipo === "nao_examinado")).toBe(true);
  });

  it("uma imagem não dá leitura nenhuma, e isso não é um erro", () => {
    // Não há OCR, por decisão escrita no `leitura/index.ts`. Uma fotografia de
    // um passaporte é o caso normal, não uma falha.
    const analise = analisarDocumento(montarJpeg({ largura: 800, altura: 600 }), "image/jpeg");
    expect(analise.leitura.origem).toBe("nenhuma");
    expect(analise.conflitos).toEqual([]);
    expect(analise.forense.correu).toBe(true);
  });

  it("sem anúncio não há contradições — ausência não é contradição", () => {
    // Na subida o anúncio ainda não existe. Sem os campos do formulário não há
    // contra o que comparar, e inventar uma contradição aqui mandava para a
    // fila todos os documentos que subissem.
    const pdf = pdfComTexto(["Microchip 620015004471234", "Registo LUS201900421"]);
    expect(analisarDocumento(pdf, "application/pdf").conflitos).toEqual([]);
  });

  it("com anúncio que desmente o documento, a contradição aparece", () => {
    const pdf = pdfComTexto(["Microchip 620015004471234"]);
    const analise = analisarDocumento(pdf, "application/pdf", { microchip: "620015004479999" });
    expect(analise.conflitos).toEqual([
      { campo: "microchip", noFormulario: "620015004479999", noDocumento: "620015004471234" },
    ]);
  });
});

// ─── A ida e volta à base de dados ───────────────────────────────────────────

describe("«não se examinou» e «não há nada» continuam a ser coisas diferentes", () => {
  it("uma coluna nula lê-se como por correr, nunca como limpa", () => {
    // É a leitura de todas as linhas que subiram antes de isto existir. Dar por
    // examinado o único documento que ninguém abriu é o erro que a coluna
    // `forense` existe para não deixar acontecer.
    expect(forenseDaLinha(null).analise).toBe("por_correr");
    expect(forenseDaLinha(undefined).analise).toBe("por_correr");
  });

  it("lixo na coluna lê-se como por correr e não deita a ficha abaixo", () => {
    for (const lixo of [42, "texto", [], { correu: "talvez" }, { achados: [] }]) {
      expect(() => forenseDaLinha(lixo)).not.toThrow();
      expect(forenseDaLinha(lixo).analise).not.toBe("correu");
    }
  });

  it("um exame que rebentou lê-se como falhou, com a hora", () => {
    const guardado: ForenseGuardada = { correu: false, em: "2026-09-04T10:00:00.000Z" };
    const lido = forenseDaLinha(JSON.parse(JSON.stringify(guardado)));
    expect(lido.analise).toBe("falhou");
    expect(lido.analisadoEm).toBe("2026-09-04T10:00:00.000Z");
    expect(lido.achados).toEqual([]);
  });

  it("um exame limpo lê-se como correu com zero achados, que não é o mesmo", () => {
    const guardado: ForenseGuardada = { correu: true, em: "2026-09-04T10:00:00.000Z", achados: [] };
    const lido = forenseDaLinha(JSON.parse(JSON.stringify(guardado)));
    expect(lido.analise).toBe("correu");
    expect(lido.achados).toEqual([]);
  });

  it("os achados sobrevivem à volta pelo JSON com a explicação inocente inteira", () => {
    const pdf = montarPdfComRemate(
      [...esqueleto("BT ET\n"), { numero: 8, dicionario: "<< /Producer (Xerox WorkCentre) >>" }],
      { trailer: "<< /Root 1 0 R /Info 8 0 R >>" }
    );
    const guardado: ForenseGuardada = {
      correu: true,
      em: "2026-09-04T10:00:00.000Z",
      achados: reunirForense(pdf, "application/pdf"),
    };

    const lido = forenseDaLinha(JSON.parse(JSON.stringify(guardado)));
    expect(lido.analise).toBe("correu");
    expect(lido.achados.length).toBeGreaterThan(0);
    for (const achado of lido.achados) {
      expect(achado.explicacaoInocente.length).toBeGreaterThan(60);
    }
  });

  it("um achado sem explicação inocente é deitado fora, não mostrado nu", () => {
    // Um facto técnico sozinho é exactamente o que este sistema existe para não
    // mostrar. Se a coluna trouxer um, ele não chega ao ecrã.
    const lido = forenseDaLinha({
      correu: true,
      em: "2026-09-04T10:00:00.000Z",
      achados: [
        { tipo: "pdf_metadados", observacao: "o campo Producer diz «X»." },
        {
          tipo: "pdf_metadados",
          observacao: "o campo Producer diz «Y».",
          explicacaoInocente: "Uma frase suficientemente longa para passar por uma explicação.",
        },
      ],
    });
    expect(lido.achados).toHaveLength(1);
    expect(lido.achados[0]!.observacao).toContain("«Y»");
  });
});

// ─── A ordem de leitura ──────────────────────────────────────────────────────

describe("a ordem é a de leitura, e é estável", () => {
  const RARO: Sinal = {
    tipo: "documento_repetido",
    sha256: "b".repeat(64),
    documentos: [
      {
        documentoId: "d1",
        tipo: "livro_azul",
        estado: "por_verificar",
        cavaloId: "c1",
        referencia: "r1",
      },
    ],
    destinos: ["c1", "c2"],
    cavalosComDocumentacaoVerificada: [],
  };

  const COMUM = reunirForense(
    montarPdfComRemate(
      [...esqueleto("BT ET\n"), { numero: 8, dicionario: "<< /Producer (Xerox WorkCentre) >>" }],
      { trailer: "<< /Root 1 0 R /Info 8 0 R >>" }
    ),
    "application/pdf"
  );

  it("o mesmo ficheiro em dois anúncios vem antes dos metadados de um PDF", () => {
    // A razão: um aviso que se lê depois de a decisão estar tomada é um aviso
    // que não existe. O primeiro acontece a um documento em muitos milhares; o
    // segundo acontece a quase todos e não distingue nada.
    const notas = reunirVerificacao({ sinais: [RARO], forense: COMUM }).notas;
    const raro = notas.findIndex((n) => n.chave === "documento_repetido");
    const comum = notas.findIndex((n) => n.chave === "pdf_metadados");
    expect(raro).toBeGreaterThanOrEqual(0);
    expect(comum).toBeGreaterThan(raro);
  });

  it("o impossível da biologia vem antes do improvável", () => {
    const impossivel: AchadoDeCoerencia = {
      tipo: "nascimento_no_futuro",
      natureza: "impossivel",
      cavalos: ["c1"],
      dataNascimento: "2030-01-01",
      hoje: "2026-09-04",
    };
    const improvavel: AchadoDeCoerencia = {
      tipo: "longevidade_invulgar",
      natureza: "improvavel",
      cavalos: ["c1"],
      dataNascimento: "1990-01-01",
      anos: 36,
    };

    // Entram pela ordem contrária de propósito: o que manda é a ordem de
    // leitura, não a ordem de chegada.
    const notas = reunirVerificacao({ coerencia: [improvavel, impossivel] }).notas;
    expect(notas.map((n) => n.chave)).toEqual(["nascimento_no_futuro", "longevidade_invulgar"]);
  });

  it("«não se examinou» fica no fim: não é um achado sobre o documento", () => {
    const naoExaminado = reunirForense(new Uint8Array([1, 2, 3]), "application/pdf");
    const notas = reunirVerificacao({ forense: [...naoExaminado, ...COMUM] }).notas;
    expect(notas[notas.length - 1]!.chave).toBe("nao_examinado");
  });

  it("a mesma entrada dá sempre a mesma saída", () => {
    // Um painel que muda de ordem entre dois carregamentos faz quem revê perder
    // o sítio onde ia.
    const entrada = { sinais: [RARO], forense: COMUM };
    const primeira = reunirVerificacao(entrada).notas.map((n) => n.chave);
    const segunda = reunirVerificacao(entrada).notas.map((n) => n.chave);
    expect(segunda).toEqual(primeira);
  });

  it("duas notas da mesma espécie mantêm a ordem que o motor lhes deu", () => {
    const notas = reunirVerificacao({
      conflitos: [
        { campo: "nome", noFormulario: "A", noDocumento: "B" },
        { campo: "microchip", noFormulario: "1", noDocumento: "2" },
      ],
    }).notas;
    expect(notas[0]!.observacao).toContain("nome");
    expect(notas[1]!.observacao).toContain("microchip");
  });
});

// ─── A fronteira que não se atravessa ────────────────────────────────────────

describe("a junta não verifica nem recusa nada", () => {
  it("nada do que sai daqui se parece com um estado de documento", () => {
    // `verificado` escreve-se num sítio só, e é uma pessoa que carrega no
    // botão. Se alguma coisa desta saída pudesse produzir um estado, estaria
    // escrita a coisa errada.
    const vista = reunirVerificacao({
      forense: reunirForense(new Uint8Array([1, 2, 3]), "application/pdf"),
      analise: "correu",
    });
    expect(vista).not.toHaveProperty("estado");
    expect(vista).not.toHaveProperty("verificado");
    for (const nota of vista.notas) {
      expect(nota).not.toHaveProperty("estado");
    }
  });

  it("uma vista sem nada diz que não se examinou, não que está limpo", () => {
    const vista = reunirVerificacao({});
    expect(vista.notas).toEqual([]);
    expect(vista.analise).toBe("por_correr");
    expect(vista.analisadoEm).toBeUndefined();
  });
});
