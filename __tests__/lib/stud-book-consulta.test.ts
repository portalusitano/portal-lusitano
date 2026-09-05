import { describe, expect, it, vi } from "vitest";

import {
  consultarStudBook,
  escolherIdentificador,
  montarUrlDaConsulta,
} from "@/lib/documentos/stud-book/consulta";
import { RITMO_VAZIO } from "@/lib/documentos/stud-book/ritmo";
import { VAR_ACTIVO, VAR_CONTACTO, VAR_URL } from "@/lib/documentos/stud-book/configuracao";

import { PAGINA_IRRECONHECIVEL, PAGINA_SEM_RESULTADO, PAGINA_TABELA } from "./stud-book-fixtures";

/**
 * A consulta.
 *
 * O primeiro bloco destes testes é o que justifica todo o resto existir: **com
 * o interruptor em baixo, zero pedidos saem**. Não «um pedido a um endereço
 * inofensivo», não «um pedido que se ignora» — zero chamadas ao `fetch`,
 * contadas. Enquanto o dono não acertar os termos de utilização com a APSL, é
 * isto que tem de continuar verdade.
 *
 * O segundo é a outra metade da mesma ideia: **nada do que corre mal aqui pode
 * virar uma afirmação sobre um cavalo**. A APSL em baixo, um 500, um formato
 * que mudou, o nosso próprio tecto — tudo desemboca em `indisponivel`, que
 * quer dizer «não conseguimos saber».
 */

const AMBIENTE_LIGADO = {
  [VAR_ACTIVO]: "1",
  [VAR_URL]: "https://www.cavalo-lusitano.com/pesquisa",
  [VAR_CONTACTO]: "documentos@portal-lusitano.pt",
};

const T0 = Date.UTC(2026, 8, 4, 12, 0, 0);

/** Um depósito de ritmo novo por teste: nenhum teste herda os pedidos de outro. */
function deposito() {
  return { estado: RITMO_VAZIO };
}

function resposta(corpo: string, ok = true, status = 200) {
  return {
    ok,
    status,
    text: () => Promise.resolve(corpo),
  } as unknown as Response;
}

/** As opções comuns: relógio parado, sem dormir a sério, sem ruído no registo. */
function opcoesBase(buscar: typeof fetch) {
  return {
    ambiente: AMBIENTE_LIGADO,
    fetch: buscar,
    agora: () => T0,
    dormir: () => Promise.resolve(),
    deposito: deposito(),
    registar: () => {},
  };
}

describe("com o interruptor em baixo, nenhum pedido sai", () => {
  it("um ambiente vazio não toca no fetch", async () => {
    const buscar = vi.fn();
    const resultado = await consultarStudBook(
      { numeroRegisto: "LUS-2019-00421", microchip: "620098100123456" },
      { ambiente: {}, fetch: buscar as unknown as typeof fetch, deposito: deposito() }
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resultado).toEqual({ estado: "desligado" });
  });

  it("com endereço e contacto mas sem a afirmação deliberada, também não", () => {
    return Promise.all(
      [
        { [VAR_URL]: AMBIENTE_LIGADO[VAR_URL], [VAR_CONTACTO]: "a@b.pt" },
        { [VAR_ACTIVO]: "1", [VAR_CONTACTO]: "a@b.pt" },
        { [VAR_ACTIVO]: "1", [VAR_URL]: AMBIENTE_LIGADO[VAR_URL] },
        { [VAR_ACTIVO]: "1", [VAR_URL]: "http://inseguro.pt", [VAR_CONTACTO]: "a@b.pt" },
      ].map(async (ambiente) => {
        const buscar = vi.fn();
        const resultado = await consultarStudBook(
          { numeroRegisto: "LUS-2019-00421" },
          { ambiente, fetch: buscar as unknown as typeof fetch, deposito: deposito() }
        );
        expect(buscar).toHaveBeenCalledTimes(0);
        expect(resultado.estado).toBe("desligado");
      })
    );
  });

  it("nem sequer se escolhe um identificador antes de olhar para o interruptor", async () => {
    // O `desligado` vem antes do `sem_identificador`: a ordem importa porque é
    // o interruptor que tem de ser a primeira coisa que este módulo faz.
    const buscar = vi.fn();
    const resultado = await consultarStudBook(
      {},
      { ambiente: {}, fetch: buscar as unknown as typeof fetch, deposito: deposito() }
    );
    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resultado).toEqual({ estado: "desligado" });
  });
});

describe("sem nada por que perguntar, também não sai pedido", () => {
  it("campos vazios dão sem_identificador", async () => {
    const buscar = vi.fn();
    const resultado = await consultarStudBook(
      { numeroRegisto: "  ", ueln: null, microchip: undefined },
      { ...opcoesBase(buscar as unknown as typeof fetch) }
    );
    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resultado).toEqual({ estado: "sem_identificador" });
  });

  it("um campo que não normaliza para nada não é um identificador", async () => {
    const buscar = vi.fn();
    const resultado = await consultarStudBook(
      { numeroRegisto: "---", microchip: "..." },
      { ...opcoesBase(buscar as unknown as typeof fetch) }
    );
    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resultado.estado).toBe("sem_identificador");
  });
});

describe("a escolha do identificador", () => {
  it("prefere o NIN, depois o UELN, depois o microchip", () => {
    expect(
      escolherIdentificador({
        numeroRegisto: "LUS-2019-00421",
        ueln: "620 015 004471234",
        microchip: "620098100123456",
      })?.identificador
    ).toBe("numero_registo");

    expect(
      escolherIdentificador({ ueln: "620 015 004471234", microchip: "620098100123456" })
        ?.identificador
    ).toBe("ueln");

    expect(escolherIdentificador({ microchip: "620098100123456" })?.identificador).toBe(
      "microchip"
    );
    expect(escolherIdentificador({})).toBeNull();
  });

  it("a chave leva o nome do identificador à frente", () => {
    // Sem o prefixo, um anúncio que trocasse o microchip pelo NIN podia calhar
    // na mesma chave e a pergunta nova passava por já feita.
    const escolha = escolherIdentificador({ numeroRegisto: "lus 2019 00421" });
    expect(escolha?.chave).toBe("numero_registo:LUS201900421");
  });
});

describe("o URL", () => {
  it("aceita marcadores, para o dono acertar o endereço sem uma versão nova", () => {
    const escolha = escolherIdentificador({ numeroRegisto: "LUS 2019/00421" })!;
    expect(montarUrlDaConsulta("https://x.pt/p?{campo}={valor}", escolha)).toBe(
      "https://x.pt/p?numero_registo=LUS%202019%2F00421"
    );
  });

  it("sem marcadores, acrescenta os parâmetros supostos", () => {
    const escolha = escolherIdentificador({ microchip: "620098100123456" })!;
    const url = new URL(montarUrlDaConsulta("https://x.pt/pesquisa", escolha));
    expect(url.searchParams.get("campo")).toBe("microchip");
    expect(url.searchParams.get("valor")).toBe("620098100123456");
  });
});

describe("quando a APSL responde", () => {
  it("um cavalo conhecido dá confirmado, e o criador não é guardado", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    const resultado = await consultarStudBook(
      { numeroRegisto: "LUS-2014-00421" },
      opcoesBase(buscar as unknown as typeof fetch)
    );

    expect(resultado.estado).toBe("confirmado");
    expect(resultado.identificador).toBe("numero_registo");
    expect(resultado.registo?.nome).toBe("MAESTOSO XV");
    expect(resultado.registo?.dataNascimento).toBe("2014-03-12");

    // A peneira do contrato. O criador foi lido pelo analisador e morreu aqui.
    expect(resultado.registo).not.toHaveProperty("criador");
    expect(JSON.stringify(resultado)).not.toContain("Ribeira");
    expect(JSON.stringify(resultado)).not.toContain("Pereira");
  });

  it("uma página que diz que não encontrou nada dá desconhecido", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_SEM_RESULTADO));
    const resultado = await consultarStudBook(
      { numeroRegisto: "LUS-2014-00421" },
      opcoesBase(buscar as unknown as typeof fetch)
    );
    expect(resultado.estado).toBe("desconhecido");
    expect(resultado.registo).toBeUndefined();
  });

  it("identifica-se em todos os pedidos", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    await consultarStudBook(
      { numeroRegisto: "LUS-2014-00421" },
      opcoesBase(buscar as unknown as typeof fetch)
    );

    const [, init] = buscar.mock.calls[0] as [string, RequestInit];
    const cabecalhos = init.headers as Record<string, string>;
    expect(cabecalhos["User-Agent"]).toContain("PortalLusitano");
    expect(cabecalhos["User-Agent"]).toContain("documentos@portal-lusitano.pt");
  });
});

describe("quando corre mal, nada disso vira uma acusação", () => {
  async function comFetch(buscar: typeof fetch) {
    return consultarStudBook({ numeroRegisto: "LUS-2014-00421" }, opcoesBase(buscar));
  }

  it("um formato que não se reconhece é indisponível, nunca desconhecido", async () => {
    // O caso mais importante de todos. Se a APSL mudar o desenho do sítio, este
    // sistema não pode começar a dizer que nenhum cavalo consta do livro.
    const resultado = await comFetch(
      vi.fn().mockResolvedValue(resposta(PAGINA_IRRECONHECIVEL)) as unknown as typeof fetch
    );
    expect(resultado.estado).toBe("indisponivel");
    expect(resultado.motivo).toBe("formato_desconhecido");
  });

  it("um 500 é indisponível", async () => {
    const resultado = await comFetch(
      vi.fn().mockResolvedValue(resposta("", false, 500)) as unknown as typeof fetch
    );
    expect(resultado.estado).toBe("indisponivel");
    expect(resultado.motivo).toBe("resposta_recusada");
  });

  it("a rede em baixo é indisponível, e não lança", async () => {
    const resultado = await comFetch(
      vi.fn().mockRejectedValue(new Error("ECONNREFUSED")) as unknown as typeof fetch
    );
    expect(resultado.estado).toBe("indisponivel");
    expect(resultado.motivo).toBe("sem_resposta");
  });

  it("um corpo que não se consegue ler é indisponível", async () => {
    const podre = {
      ok: true,
      status: 200,
      text: () => Promise.reject(new Error("corpo partido")),
    } as unknown as Response;
    const resultado = await comFetch(vi.fn().mockResolvedValue(podre) as unknown as typeof fetch);
    expect(resultado.estado).toBe("indisponivel");
    expect(resultado.motivo).toBe("sem_resposta");
  });

  it("um servidor que nunca responde é cortado pelo tempo, e o vendedor não espera", async () => {
    // Isto corre no caminho de submissão de um anúncio. Um servidor de
    // terceiros não pode prender quem está a publicar.
    const buscar = vi.fn((_url: string, init: RequestInit) => {
      return new Promise<Response>((_, rejeitar) => {
        init.signal?.addEventListener("abort", () => rejeitar(new Error("abortado")));
      });
    });

    const resultado = await consultarStudBook(
      { numeroRegisto: "LUS-2014-00421" },
      { ...opcoesBase(buscar as unknown as typeof fetch), timeoutMs: 20 }
    );

    expect(resultado.estado).toBe("indisponivel");
    expect(resultado.motivo).toBe("sem_resposta");
  });

  it("o tecto diário esgotado é indisponível — e é um estado nosso, não do cavalo", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    const partilhado = { estado: { ultimoPedidoEm: null, dia: "2026-09-04", pedidosNoDia: 200 } };

    const resultado = await consultarStudBook(
      { numeroRegisto: "LUS-2014-00421" },
      { ...opcoesBase(buscar as unknown as typeof fetch), deposito: partilhado }
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resultado.estado).toBe("indisponivel");
    expect(resultado.motivo).toBe("tecto_diario");
  });

  it("uma vez na fila que não cabe no orçamento desiste em vez de prender", async () => {
    const buscar = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    // Acabou de sair um pedido: faltam 5s de intervalo, e o orçamento é 1s.
    const partilhado = { estado: { ultimoPedidoEm: T0, dia: "2026-09-04", pedidosNoDia: 1 } };

    const resultado = await consultarStudBook(
      { numeroRegisto: "LUS-2014-00421" },
      { ...opcoesBase(buscar as unknown as typeof fetch), deposito: partilhado, orcamentoMs: 1000 }
    );

    expect(buscar).toHaveBeenCalledTimes(0);
    expect(resultado.estado).toBe("indisponivel");
    expect(resultado.motivo).toBe("sem_vez_a_tempo");
  });
});

describe("um pedido de cada vez", () => {
  it("nunca há dois nossos em voo ao mesmo tempo", async () => {
    let emVoo = 0;
    let maximo = 0;

    const buscar = vi.fn(async () => {
      emVoo += 1;
      maximo = Math.max(maximo, emVoo);
      await new Promise((r) => setTimeout(r, 5));
      emVoo -= 1;
      return resposta(PAGINA_TABELA);
    });

    // Cada uma com o seu depósito, para que o que as serialize seja a fila e
    // não o intervalo mínimo — é a fila que este teste mede.
    await Promise.all(
      ["A", "B", "C", "D"].map((n) =>
        consultarStudBook(
          { numeroRegisto: `LUS-2014-0042${n}` },
          { ...opcoesBase(buscar as unknown as typeof fetch), deposito: deposito() }
        )
      )
    );

    expect(buscar).toHaveBeenCalledTimes(4);
    expect(maximo).toBe(1);
  });

  it("uma consulta que rebenta não deixa as seguintes penduradas", async () => {
    const rebentado = vi.fn().mockRejectedValue(new Error("boom"));
    await consultarStudBook(
      { numeroRegisto: "LUS-1" },
      { ...opcoesBase(rebentado as unknown as typeof fetch) }
    );

    const bom = vi.fn().mockResolvedValue(resposta(PAGINA_TABELA));
    const resultado = await consultarStudBook(
      { numeroRegisto: "LUS-2" },
      { ...opcoesBase(bom as unknown as typeof fetch) }
    );
    expect(resultado.estado).toBe("confirmado");
  });
});
