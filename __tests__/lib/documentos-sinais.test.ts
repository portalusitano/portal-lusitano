import { describe, expect, it } from "vitest";

import {
  anuncioEstaEmPe,
  chaveComparavel,
  contradicoesPorRever,
  documentoEmMaisDoQueUmAnuncio,
  microchipRepetido,
  registoEmVendedoresDiferentes,
  reunirSinais,
  uelnRepetido,
  type AnuncioParaSinais,
  type DocumentoParaSinais,
} from "@/lib/documentos/sinais";

/**
 * Os sinais dos documentos.
 *
 * O que estes testes protegem não é a aritmética — é a fronteira. Um sinal
 * **conta factos** e nunca decide nada, e as duas maneiras de a atravessar são
 * simétricas e igualmente caras: levantar a mão sobre um vendedor honesto
 * (dois anúncios sem microchip agrupados como se partilhassem um) e não a
 * levantar sobre o mesmo Livro Azul em dois cavalos.
 *
 * Por isso cada sinal tem aqui um caso que deve disparar e um caso vizinho,
 * quase igual, que **não** deve.
 */

const SHA_A = "a".repeat(64);
const SHA_B = "b".repeat(64);

function doc(p: Partial<DocumentoParaSinais> & { id: string }): DocumentoParaSinais {
  return {
    cavalo_id: null,
    referencia: "ref-1",
    tipo: "livro_azul",
    sha256: SHA_A,
    estado: "por_verificar",
    ...p,
  };
}

function anuncio(p: Partial<AnuncioParaSinais> & { id: string }): AnuncioParaSinais {
  return {
    user_id: null,
    status: "active",
    microchip: null,
    passaporte_equino: null,
    registro_apsl: null,
    ...p,
  };
}

describe("chaveComparavel", () => {
  it("iguala o mesmo UELN escrito de três maneiras", () => {
    const formas = ["620 015 004471234", "620-015-004471234", "620015004471234"];
    const chaves = new Set(formas.map((f) => chaveComparavel(f)));
    expect(chaves.size).toBe(1);
  });

  it("devolve null para o que não tem letras nem algarismos", () => {
    // É este null que impede o pior erro do sinal: juntar num grupo todos os
    // anúncios que deixaram o campo em branco.
    expect(chaveComparavel(null)).toBeNull();
    expect(chaveComparavel("")).toBeNull();
    expect(chaveComparavel("   ")).toBeNull();
    expect(chaveComparavel("— / —")).toBeNull();
  });
});

describe("anuncioEstaEmPe", () => {
  it("conta o activo e o reservado, e mais nenhum", () => {
    expect(anuncioEstaEmPe({ status: "active" })).toBe(true);
    expect(anuncioEstaEmPe({ status: "reservado" })).toBe(true);
    expect(anuncioEstaEmPe({ status: "vendido" })).toBe(false);
    expect(anuncioEstaEmPe({ status: "pausado" })).toBe(false);
    expect(anuncioEstaEmPe({ status: null })).toBe(false);
  });
});

describe("documentoEmMaisDoQueUmAnuncio", () => {
  it("dá o facto quando o mesmo ficheiro serve dois cavalos", () => {
    const sinais = documentoEmMaisDoQueUmAnuncio([
      doc({ id: "d1", cavalo_id: "cavalo-1", sha256: SHA_A }),
      doc({ id: "d2", cavalo_id: "cavalo-2", sha256: SHA_A }),
    ]);

    expect(sinais).toHaveLength(1);
    expect(sinais[0].sha256).toBe(SHA_A);
    expect(sinais[0].destinos).toEqual(["cavalo-1", "cavalo-2"]);
    expect(sinais[0].documentos.map((d) => d.documentoId)).toEqual(["d1", "d2"]);
  });

  it("cala-se quando o mesmo ficheiro é reenviado para o mesmo cavalo", () => {
    // Substituir um documento é legítimo, e a migração diz o mesmo ao não pôr
    // um `unique` no sha256.
    const sinais = documentoEmMaisDoQueUmAnuncio([
      doc({ id: "d1", cavalo_id: "cavalo-1" }),
      doc({ id: "d2", cavalo_id: "cavalo-1" }),
    ]);
    expect(sinais).toEqual([]);
  });

  it("distingue submissões diferentes antes de o anúncio existir", () => {
    // Antes do pagamento não há `cavalo_id`; o que os separa é a referência.
    const sinais = documentoEmMaisDoQueUmAnuncio([
      doc({ id: "d1", referencia: "sub-1" }),
      doc({ id: "d2", referencia: "sub-2" }),
    ]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].destinos).toEqual(["referencia:sub-1", "referencia:sub-2"]);
  });

  it("conta o documento recusado, que é o caso que mais interessa ver", () => {
    const sinais = documentoEmMaisDoQueUmAnuncio([
      doc({ id: "d1", cavalo_id: "cavalo-1", estado: "recusado" }),
      doc({ id: "d2", cavalo_id: "cavalo-2" }),
    ]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].documentos.map((d) => d.estado)).toEqual(["recusado", "por_verificar"]);
  });

  it("assinala quais dos anúncios já mostram documentação verificada", () => {
    // A pergunta é a do contrato, e é uma só: um Livro Azul verificado.
    const sinais = documentoEmMaisDoQueUmAnuncio([
      doc({ id: "d1", cavalo_id: "cavalo-1", estado: "verificado" }),
      doc({ id: "d2", cavalo_id: "cavalo-2", estado: "por_verificar" }),
    ]);
    expect(sinais[0].cavalosComDocumentacaoVerificada).toEqual(["cavalo-1"]);
  });

  it("não confunde ficheiros diferentes", () => {
    const sinais = documentoEmMaisDoQueUmAnuncio([
      doc({ id: "d1", cavalo_id: "cavalo-1", sha256: SHA_A }),
      doc({ id: "d2", cavalo_id: "cavalo-2", sha256: SHA_B }),
    ]);
    expect(sinais).toEqual([]);
  });
});

describe("microchipRepetido", () => {
  it("dá o facto com o mesmo número escrito de maneiras diferentes", () => {
    const sinais = microchipRepetido([
      anuncio({ id: "c1", microchip: "620 098 100123456" }),
      anuncio({ id: "c2", microchip: "620098100123456" }),
    ]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].tipo).toBe("microchip_repetido");
    expect(sinais[0].anuncios.map((a) => a.cavaloId)).toEqual(["c1", "c2"]);
    // O valor cru vai junto: quem revê tem de ver o que lá está escrito.
    expect(sinais[0].anuncios[0].valor).toBe("620 098 100123456");
  });

  it("usa a mesma limpeza que o resto do site — só os algarismos", () => {
    // Quem diz o que é «o mesmo microchip» é o `lib/microchip-iso.ts`. Duas
    // ideias de igualdade dariam uma repetição vista por uma e não pela outra.
    const sinais = microchipRepetido([
      anuncio({ id: "c1", microchip: "620.098.100.123.456" }),
      anuncio({ id: "c2", microchip: "620 098 100 123 456" }),
    ]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].chave).toBe("620098100123456");
  });

  it("não junta anúncios que deixaram o microchip em branco", () => {
    const sinais = microchipRepetido([
      anuncio({ id: "c1", microchip: null }),
      anuncio({ id: "c2", microchip: "" }),
      anuncio({ id: "c3", microchip: "   " }),
    ]);
    expect(sinais).toEqual([]);
  });

  it("deixa passar o cavalo revendido, cujo anúncio anterior já não está em pé", () => {
    const sinais = microchipRepetido([
      anuncio({ id: "c1", microchip: "620098100123456", status: "vendido" }),
      anuncio({ id: "c2", microchip: "620098100123456", status: "active" }),
    ]);
    expect(sinais).toEqual([]);
  });
});

describe("uelnRepetido", () => {
  it("lê o UELN da coluna do passaporte", () => {
    const sinais = uelnRepetido([
      anuncio({ id: "c1", passaporte_equino: "620 015 004471234" }),
      anuncio({ id: "c2", passaporte_equino: "620015004471234" }),
    ]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].tipo).toBe("ueln_repetido");
    expect(sinais[0].chave).toBe("620015004471234");
  });
});

describe("registoEmVendedoresDiferentes", () => {
  it("dá o facto quando duas contas anunciam hoje o mesmo registo", () => {
    const sinais = registoEmVendedoresDiferentes([
      anuncio({ id: "c1", registro_apsl: "LUS/2019/0421", user_id: "u1" }),
      anuncio({ id: "c2", registro_apsl: "lus 2019 0421", user_id: "u2" }),
    ]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].vendedores).toEqual(["u1", "u2"]);
    expect(sinais[0].anunciosSemVendedor).toEqual([]);
  });

  it("cala-se quando é o mesmo vendedor a anunciar duas vezes", () => {
    const sinais = registoEmVendedoresDiferentes([
      anuncio({ id: "c1", registro_apsl: "LUS/2019/0421", user_id: "u1" }),
      anuncio({ id: "c2", registro_apsl: "LUS/2019/0421", user_id: "u1" }),
    ]);
    expect(sinais).toEqual([]);
  });

  it("não trata dois anúncios sem conta como dois vendedores", () => {
    // Não saber quem anunciou não é saber que foi outro. Este é o falso
    // positivo que faria o sinal acusar toda a gente que nunca reclamou o
    // anúncio.
    const sinais = registoEmVendedoresDiferentes([
      anuncio({ id: "c1", registro_apsl: "LUS/2019/0421", user_id: null }),
      anuncio({ id: "c2", registro_apsl: "LUS/2019/0421", user_id: null }),
    ]);
    expect(sinais).toEqual([]);
  });

  it("lista à parte, sem os contar, os anúncios sem conta do grupo", () => {
    const sinais = registoEmVendedoresDiferentes([
      anuncio({ id: "c1", registro_apsl: "LUS/2019/0421", user_id: "u1" }),
      anuncio({ id: "c2", registro_apsl: "LUS/2019/0421", user_id: "u2" }),
      anuncio({ id: "c3", registro_apsl: "LUS/2019/0421", user_id: null }),
    ]);
    expect(sinais[0].vendedores).toEqual(["u1", "u2"]);
    expect(sinais[0].anunciosSemVendedor).toEqual(["c3"]);
  });
});

describe("contradicoesPorRever", () => {
  const conflito = {
    campo: "microchip" as const,
    noFormulario: "620098100123456",
    noDocumento: "620098100999999",
  };

  it("junta as contradições guardadas na leitura", () => {
    const sinais = contradicoesPorRever([doc({ id: "d1", conflitos: [conflito] })]);
    expect(sinais).toHaveLength(1);
    expect(sinais[0].conflitos).toEqual([conflito]);
    expect(sinais[0].documento.documentoId).toBe("d1");
  });

  it("não volta a levantar a contradição de um documento já verificado", () => {
    const sinais = contradicoesPorRever([
      doc({ id: "d1", conflitos: [conflito], estado: "verificado" }),
    ]);
    expect(sinais).toEqual([]);
  });

  it("ignora as linhas sem conflitos", () => {
    expect(contradicoesPorRever([doc({ id: "d1", conflitos: [] }), doc({ id: "d2" })])).toEqual([]);
  });
});

describe("reunirSinais", () => {
  it("devolve nada quando não há nada a dizer", () => {
    expect(reunirSinais({ documentos: [], anuncios: [] })).toEqual([]);
  });

  it("junta os cinco tipos e devolve sempre a mesma ordem", () => {
    const entrada = {
      documentos: [
        doc({ id: "d1", cavalo_id: "c1", sha256: SHA_A }),
        doc({ id: "d2", cavalo_id: "c2", sha256: SHA_A }),
        doc({
          id: "d3",
          cavalo_id: "c1",
          sha256: SHA_B,
          conflitos: [{ campo: "nome" as const, noFormulario: "Zambujo", noDocumento: "Zimbro" }],
        }),
      ],
      anuncios: [
        anuncio({
          id: "c1",
          user_id: "u1",
          microchip: "620098100123456",
          passaporte_equino: "620015004471234",
          registro_apsl: "LUS/2019/0421",
        }),
        anuncio({
          id: "c2",
          user_id: "u2",
          microchip: "620 098 100123456",
          passaporte_equino: "620 015 004471234",
          registro_apsl: "lus-2019-0421",
        }),
      ],
    };

    const tipos = reunirSinais(entrada).map((s) => s.tipo);
    expect(tipos).toEqual([
      "documento_repetido",
      "microchip_repetido",
      "ueln_repetido",
      "registo_em_vendedores_diferentes",
      "contradicao_por_rever",
    ]);

    // A mesma entrada por outra ordem dá a mesma saída: um painel que muda de
    // ordem entre dois carregamentos faz quem revê perder o sítio onde ia.
    const baralhado = {
      documentos: [...entrada.documentos].reverse(),
      anuncios: [...entrada.anuncios].reverse(),
    };
    expect(reunirSinais(baralhado)).toEqual(reunirSinais(entrada));
  });

  it("não devolve juízo nenhum — só factos", () => {
    // A garantia que este módulo dá é negativa e é preciso escrevê-la: nada do
    // que sai daqui pode ser lido como uma decisão sobre um anúncio.
    const sinais = reunirSinais({
      documentos: [doc({ id: "d1", cavalo_id: "c1" }), doc({ id: "d2", cavalo_id: "c2" })],
      anuncios: [],
    });
    const chaves = new Set(sinais.flatMap((s) => Object.keys(s)));
    for (const proibida of ["gravidade", "risco", "score", "pontuacao", "accao", "decisao"]) {
      expect(chaves.has(proibida)).toBe(false);
    }
  });
});
