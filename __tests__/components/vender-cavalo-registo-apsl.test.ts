import { describe, it, expect, vi } from "vitest";
import {
  CAMINHO_VERIFICACAO,
  chaveRegistoApsl,
  lerRegistoApsl,
  normalizarRegistoApsl,
  verificarRegisto,
} from "@/components/vender-cavalo/registo-apsl";

/**
 * O que estes casos guardam é sobretudo o que **não** se faz: não há regra de
 * formato, porque o formato não se conseguiu confirmar. A razão longa está no
 * cabeçalho do módulo. Aqui garante-se que ela se mantém — que ninguém
 * acrescenta amanhã uma expressão regular que recuse números verdadeiros.
 */
describe("número de registo — normalização", () => {
  it("tira espaços a mais e põe em maiúsculas, e mais nada", () => {
    expect(normalizarRegistoApsl("  psl  2019   4471 ")).toBe("PSL 2019 4471");
  });

  it("os separadores ficam onde a pessoa os pôs", () => {
    // Tirar um traço aqui seria um palpite sobre o formato, e o formato não se
    // conhece.
    expect(normalizarRegistoApsl("psl-2019/4471")).toBe("PSL-2019/4471");
  });

  it("a chave de comparação junta as escritas do mesmo número", () => {
    const escritas = ["PSL 2019 4471", "psl-2019/4471", "PSL.2019.4471", "psl20194471"];
    const chaves = new Set(escritas.map(chaveRegistoApsl));
    expect(chaves.size).toBe(1);
    expect([...chaves][0]).toBe("PSL20194471");
  });
});

describe("número de registo — o que é claramente outra coisa", () => {
  it("aceita formatos diferentes sem preferir nenhum", () => {
    // Nenhum destes é recusado, porque não há como saber qual é o certo.
    for (const numero of ["PSL-2019-4471", "4471/2019", "PT19004471", "12345", "LG 2019 4471"]) {
      expect(lerRegistoApsl(numero, "Zíngaro").problema, numero).toBeUndefined();
    }
  });

  it("um caractere repetido não é um número de registo", () => {
    for (const numero of ["aaaa", "0000", "9999999"]) {
      expect(lerRegistoApsl(numero).problema, numero).toBe("repetido");
    }
  });

  it("dois caracteres não chegam para identificar um cavalo", () => {
    expect(lerRegistoApsl("A1").problema).toBe("curto");
    expect(lerRegistoApsl("   ").problema).toBe("curto");
    expect(lerRegistoApsl("").problema).toBe("curto");
    // Só separadores é o mesmo que nada: depois de canonizado não sobra um
    // único caractere, e por isso é curto e não repetido.
    expect(lerRegistoApsl("----").problema).toBe("curto");
  });

  it("o nome do cavalo copiado para a caixa do registo é o engano mais comum", () => {
    expect(lerRegistoApsl("Zíngaro", "Zíngaro").problema).toBe("e-o-nome");
    // E os acentos e as maiúsculas não escondem o engano.
    expect(lerRegistoApsl("ZINGARO", "Zíngaro").problema).toBe("e-o-nome");
  });

  it("um nome curto não faz do registo um nome", () => {
    // Sem o mínimo de três, um cavalo chamado «Ás» com registo «AS» ficava
    // acusado de ter copiado o nome — e a coincidência de duas letras não
    // prova nada.
    expect(lerRegistoApsl("AS12", "Ás").problema).toBeUndefined();
  });

  it("um registo sem um único algarismo é pergunta, não recusa", () => {
    expect(lerRegistoApsl("PSLALTER").problema).toBe("sem-algarismos");
  });
});

describe("verificação contra a nossa própria base", () => {
  const resposta = (corpo: unknown, ok = true) => ({ ok, json: async () => corpo }) as Response;

  it("um número que já existe volta como duplicado", async () => {
    const buscar = vi.fn(async () => resposta({ existe: true }));
    await expect(verificarRegisto("PSL-2019-4471", { fetch: buscar })).resolves.toMatchObject({
      estado: "duplicado",
    });
    expect(buscar).toHaveBeenCalledWith(
      `${CAMINHO_VERIFICACAO}?numero=${encodeURIComponent("PSL-2019-4471")}`,
      { signal: undefined }
    );
  });

  it("um número livre volta como livre", async () => {
    const buscar = vi.fn(async () => resposta({ existe: false }));
    await expect(verificarRegisto("PSL-2019-4471", { fetch: buscar })).resolves.toMatchObject({
      estado: "livre",
    });
  });

  it("a rede em baixo nunca vira um «já existe»", async () => {
    // Acusar alguém de duplicar um anúncio por causa de um pedido que não
    // chegou é a pior resposta possível: trava a publicação com uma mentira.
    const rebenta = vi.fn(async () => {
      throw new Error("rede");
    });
    await expect(verificarRegisto("PSL-2019-4471", { fetch: rebenta })).resolves.toMatchObject({
      estado: "indisponivel",
    });
  });

  it("uma resposta que não é 200 também é indisponível", async () => {
    const buscar = vi.fn(async () => resposta({ error: "nope" }, false));
    await expect(verificarRegisto("X", { fetch: buscar })).resolves.toMatchObject({
      estado: "indisponivel",
    });
  });

  it("um corpo estranho não é lido como duplicado", async () => {
    for (const corpo of [null, "sim", { existe: "sim" }, {}]) {
      const buscar = vi.fn(async () => resposta(corpo));
      await expect(verificarRegisto("PSL-1", { fetch: buscar })).resolves.toMatchObject({
        estado: "livre",
      });
    }
  });

  it("um número vazio não chega a perguntar nada", async () => {
    const buscar = vi.fn(async () => resposta({ existe: true }));
    await expect(verificarRegisto("   ", { fetch: buscar })).resolves.toMatchObject({
      estado: "indisponivel",
    });
    expect(buscar).not.toHaveBeenCalled();
  });
});
