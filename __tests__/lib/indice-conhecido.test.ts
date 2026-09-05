import { describe, expect, it } from "vitest";

import {
  chaveDoIdentificador,
  construirIndiceConhecido,
  identificadoresDoAnuncio,
  jaVimosEsteNumero,
  jaVimosNoCampo,
  padraoDeProcura,
  procurarNumeroConhecido,
  type LeitorDeAnuncios,
} from "@/lib/documentos/indice-conhecido";
import type { AnuncioParaSinais } from "@/lib/documentos/sinais";

/**
 * O índice do que já vimos por nós.
 *
 * A promessa que estes testes guardam é a que torna o índice legítimo: **não há
 * aqui rede nenhuma**. É a nossa tabela a responder sobre os nossos anúncios, e
 * a pergunta é a de quem tem um número na mão — «já vimos este?» —, que é a
 * simétrica da que os `sinais.ts` respondem.
 *
 * E guardam a segunda, que é a que faz o índice servir para alguma coisa: dois
 * anúncios que escrevem o mesmo número de maneiras diferentes têm de cair na
 * mesma chave. Um índice que não visse `620 015 004471234` e `620-015-004471234`
 * como o mesmo UELN seria pior do que não existir — daria a entender que não há
 * nada quando há.
 */

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

describe("a chave de um número", () => {
  it("leva o nome do identificador à frente", () => {
    // Sem o prefixo, um anúncio que trocasse o microchip pelo número de registo
    // podia calhar na mesma chave — e no stud-book isso faria uma pergunta nova
    // passar por já feita.
    expect(chaveDoIdentificador("microchip", "620 098 100123456")).toBe(
      "microchip:620098100123456"
    );
    expect(chaveDoIdentificador("ueln", "620-015-004471234")).toBe("ueln:620015004471234");
    expect(chaveDoIdentificador("numero_registo", "lus 2019/00421")).toBe(
      "numero_registo:LUS201900421"
    );
  });

  it("um campo sem nada de comparável não dá chave nenhuma", () => {
    // É este `null` que impede o erro simétrico: juntar num grupo os trinta
    // anúncios que deixaram o campo em branco e anunciar que partilham um
    // microchip.
    for (const vazio of ["", "   ", "-", "—", null, undefined]) {
      expect(chaveDoIdentificador("microchip", vazio)).toBeNull();
    }
  });

  it("as três normalizações são as dos módulos que mandam em cada número", () => {
    // O microchip é só algarismos (`microchip-iso`); o UELN perde separadores e
    // sobe a maiúsculas (`passaporte-ueln`); o registo perde acentos e tudo o
    // que não é letra ou algarismo (`registo-apsl`).
    expect(chaveDoIdentificador("microchip", "620.098.100-123456")).toBe(
      "microchip:620098100123456"
    );
    expect(chaveDoIdentificador("numero_registo", "Ançã-2019")).toBe("numero_registo:ANCA2019");
  });
});

describe("o índice", () => {
  const anuncios = [
    anuncio({
      id: "b",
      user_id: "vendedor-1",
      microchip: "620 098 100123456",
      registro_apsl: "LUS-2019-00421",
    }),
    anuncio({
      id: "a",
      user_id: "vendedor-2",
      status: "vendido",
      microchip: "620098100123456",
    }),
    anuncio({ id: "c", passaporte_equino: "620015004471234" }),
  ];

  it("junta duas escritas do mesmo número na mesma chave", () => {
    const indice = construirIndiceConhecido(anuncios);
    const vistos = jaVimosNoCampo(indice, "microchip", "620-098-100123456");
    expect(vistos.map((o) => o.cavaloId)).toEqual(["a", "b"]);
  });

  it("um anúncio vendido continua a contar — a pergunta é «já vimos», não «está em pé»", () => {
    // É a diferença entre isto e um sinal de repetição. Um sinal só olha para
    // os que estão em pé ao mesmo tempo; aqui, um anúncio vendido há dois anos
    // é exactamente a resposta que se procura.
    const indice = construirIndiceConhecido(anuncios);
    const vistos = jaVimosNoCampo(indice, "microchip", "620098100123456");
    expect(vistos.find((o) => o.cavaloId === "a")?.emPe).toBe(false);
    expect(vistos.find((o) => o.cavaloId === "b")?.emPe).toBe(true);
  });

  it("devolve o valor como está escrito, não a forma normalizada", () => {
    // Quem lê tem de ver o que o vendedor escreveu, e não a versão sem espaços
    // que serviu para os comparar.
    const indice = construirIndiceConhecido(anuncios);
    const b = jaVimosNoCampo(indice, "microchip", "620098100123456").find(
      (o) => o.cavaloId === "b"
    );
    expect(b?.valor).toBe("620 098 100123456");
    expect(b?.vendedor).toBe("vendedor-1");
  });

  it("a ordem é sempre a mesma para a mesma entrada", () => {
    const directa = jaVimosNoCampo(
      construirIndiceConhecido(anuncios),
      "microchip",
      "620098100123456"
    );
    const invertida = jaVimosNoCampo(
      construirIndiceConhecido([...anuncios].reverse()),
      "microchip",
      "620098100123456"
    );
    expect(invertida).toEqual(directa);
  });

  it("um número que nunca cá esteve devolve lista vazia", () => {
    expect(
      jaVimosNoCampo(construirIndiceConhecido(anuncios), "microchip", "999999999999999")
    ).toEqual([]);
  });

  it("procura nos três campos, porque o engano é escrever na caixa errada", () => {
    // O UELN de um anúncio escrito na caixa do microchip de outro. Um índice
    // que só procurasse no campo de onde o número veio não veria precisamente o
    // caso que interessa ver.
    const comTroca = [
      anuncio({ id: "x", passaporte_equino: "620015004471234" }),
      anuncio({ id: "y", microchip: "620015004471234" }),
    ];
    const vistos = jaVimosEsteNumero(construirIndiceConhecido(comTroca), "620 015 004471234");
    expect(vistos.map((o) => `${o.cavaloId}:${o.identificador}`)).toEqual([
      "x:ueln",
      "y:microchip",
    ]);
  });

  it("a mesma ocorrência não sai duas vezes", () => {
    const indice = construirIndiceConhecido([
      anuncio({ id: "z", microchip: "620015004471234", passaporte_equino: "620015004471234" }),
    ]);
    const vistos = jaVimosEsteNumero(indice, "620015004471234");
    expect(vistos).toHaveLength(2);
    expect(new Set(vistos.map((o) => o.identificador)).size).toBe(2);
  });

  it("os identificadores de um anúncio saem pela ordem do contrato", () => {
    const encontrados = identificadoresDoAnuncio(
      anuncio({ id: "w", microchip: "620098100123456", registro_apsl: "LUS-2019-00421" })
    );
    expect(encontrados.map((e) => e.identificador)).toEqual(["numero_registo", "microchip"]);
  });
});

describe("o padrão de procura", () => {
  it("põe um por cento entre cada caractere, para apanhar qualquer separador", () => {
    expect(padraoDeProcura("ABC1")).toBe("A%B%C%1");
  });

  it("escapa o que no Postgres é um curinga", () => {
    // A chave já só tem letras e algarismos, mas escapa-se na mesma: no dia em
    // que a canonização mudar, isto não passa a ser uma injecção de padrão.
    expect(padraoDeProcura("A%_")).toBe("A%\\%%\\_");
  });
});

describe("a procura na base", () => {
  /** Uma base de brincar: guarda linhas e responde a `ilike` com um regex. */
  function base(linhas: Record<string, unknown>[], falhar = false) {
    const pedidos: { coluna: string; padrao: string }[] = [];
    const cliente: LeitorDeAnuncios = {
      from() {
        return {
          select() {
            return {
              ilike(coluna: string, padrao: string) {
                pedidos.push({ coluna, padrao });
                return {
                  limit(n: number) {
                    if (falhar)
                      return Promise.resolve({ data: null, error: { message: "em baixo" } });
                    const expressao = new RegExp(
                      `^${padrao.replace(/\\(.)/g, "$1").replace(/%/g, ".*")}$`,
                      "i"
                    );
                    const encontradas = linhas.filter((l) => {
                      const v = l[coluna];
                      return typeof v === "string" && expressao.test(v);
                    });
                    return Promise.resolve({ data: encontradas.slice(0, n), error: null });
                  },
                };
              },
            };
          },
        };
      },
    };
    return { cliente, pedidos };
  }

  const LINHAS = [
    {
      id: "a",
      user_id: null,
      status: "active",
      microchip: "620 098 100123456",
      passaporte_equino: null,
      registro_apsl: null,
    },
    {
      id: "b",
      user_id: null,
      status: "active",
      microchip: "620098100123456999",
      passaporte_equino: null,
      registro_apsl: null,
    },
  ];

  it("encontra o mesmo número escrito de outra maneira", async () => {
    const { cliente } = base(LINHAS);
    const vistos = await procurarNumeroConhecido("620-098-100123456", { supabase: cliente });
    expect(vistos.map((o) => o.cavaloId)).toEqual(["a"]);
  });

  it("a segunda passagem deita fora o que o ilike trouxe a mais", async () => {
    // O `ilike` com `%` entre cada caractere apanha `...456999` quando se
    // procura `...456`. É o preço de filtrar sem coluna canónica, e é o índice
    // em memória que corrige: só é o mesmo número quem o é por inteiro.
    const { cliente } = base(LINHAS);
    const vistos = await procurarNumeroConhecido("620098100123456", { supabase: cliente });
    expect(vistos.map((o) => o.cavaloId)).not.toContain("b");
  });

  it("uma base em baixo devolve lista vazia e não lança", async () => {
    // Não conseguir perguntar não é «não encontrei», mas nenhum dos dois é uma
    // afirmação sobre um cavalo, e quem chama está no meio de outra coisa.
    const { cliente } = base(LINHAS, true);
    await expect(
      procurarNumeroConhecido("620098100123456", { supabase: cliente })
    ).resolves.toEqual([]);
  });

  it("um valor sem nada de comparável não chega a perguntar", async () => {
    const { cliente, pedidos } = base(LINHAS);
    expect(await procurarNumeroConhecido("  -  ", { supabase: cliente })).toEqual([]);
    expect(pedidos).toHaveLength(0);
  });
});
