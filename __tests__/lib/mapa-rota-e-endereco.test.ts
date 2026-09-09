import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import {
  caminhoDaCoudelaria,
  consultaDoMapa,
  lerEstadoDoMapa,
  ESTADO_LIMPO,
  LIMITE_DA_PROCURA,
  type EstadoDoMapa,
} from "@/lib/mapa-coudelarias";

const RAIZ = path.resolve(__dirname, "../..");
const REGIOES = ["Alentejo", "Ribatejo", "Lisboa", "Beira Alta", "Centro"];

/**
 * A ficha de uma coudelaria chega-se por três caminhos e os três têm de dar
 * ao mesmo sítio, com o mesmo número de toques. Não era assim: a linha do
 * painel e o cartão da grelha eram links directos, e o nome no globo abria
 * uma janela de onde ainda era preciso carregar em «Ver Página». Dois toques
 * de um lado, um do outro, para a mesma coudelaria e na mesma página.
 */
describe("caminhoDaCoudelaria — um destino só", () => {
  it("é a ficha do directório", () => {
    expect(caminhoDaCoudelaria("alter-real")).toBe("/directorio/alter-real");
  });

  /**
   * Sem esta prova, alguém volta a escrever `/directorio/${slug}` à mão num
   * dos três sítios e a divergência regressa sem ninguém dar por ela. É o
   * defeito exacto que este trabalho corrigiu, por isso é ele que se tranca.
   */
  it("o mapa não constrói o caminho da ficha por fora", () => {
    const fonte = readFileSync(path.join(RAIZ, "components/MapaClient.tsx"), "utf8");
    const aMao = [...fonte.matchAll(/["'`]\/directorio\/[^"'`]*\$\{/g)].map((m) => m[0]);
    expect(aMao, `caminhos escritos à mão: ${aMao.join(", ")}`).toEqual([]);
  });

  /**
   * A janela do alfinete era o segundo toque. Se voltar, volta a incoerência
   * — e volta sem se ver, porque a página continua a funcionar.
   */
  it("não há janela modal no mapa", () => {
    const fonte = readFileSync(path.join(RAIZ, "components/MapaClient.tsx"), "utf8");
    expect(fonte).not.toContain('role="dialog"');
    expect(fonte).not.toContain("aria-modal");
  });
});

/**
 * Sair do mapa para uma ficha só se paga se voltar trouxer a mesma página.
 * Quem a traz é o endereço, e quem o escreve (cliente) e quem o lê (servidor)
 * têm de ser a mesma regra. Eram duas, e já discordavam.
 */
describe("o ida-e-volta da barra de endereço", () => {
  const volta = (e: EstadoDoMapa) =>
    lerEstadoDoMapa(Object.fromEntries(new URLSearchParams(consultaDoMapa(e))), REGIOES);

  it("o mapa por estrear não escreve nada na consulta", () => {
    expect(consultaDoMapa(ESTADO_LIMPO)).toBe("");
    expect(lerEstadoDoMapa({}, REGIOES)).toEqual(ESTADO_LIMPO);
  });

  it("o que se escreve é o que se lê de volta", () => {
    const estados: EstadoDoMapa[] = [
      { procura: "", regiao: "Alentejo", vista: "globo" },
      { procura: "golegã", regiao: null, vista: "globo" },
      { procura: "Alter do Chão", regiao: "Alentejo", vista: "list" },
      { procura: "", regiao: null, vista: "list" },
      { procura: "casa & cadaval", regiao: "Beira Alta", vista: "globo" },
      { procura: "montaria/lezíria?", regiao: "Ribatejo", vista: "list" },
    ];
    for (const e of estados) expect(volta(e), consultaDoMapa(e)).toEqual(e);
  });

  /**
   * O cliente escrevia a pesquisa inteira e o servidor cortava-a aos 80 ao
   * lê-la: quem procurasse uma frase longa e voltasse à página encontrava
   * outra pesquisa. Agora o corte é do mesmo lado das duas contas.
   */
  it("uma pesquisa longa volta igual a como foi escrita", () => {
    const longa = "a".repeat(LIMITE_DA_PROCURA + 40);
    const escrita = new URLSearchParams(
      consultaDoMapa({ procura: longa, regiao: null, vista: "globo" })
    ).get("q");
    expect(escrita).toHaveLength(LIMITE_DA_PROCURA);
    expect(volta({ procura: escrita!, regiao: null, vista: "globo" }).procura).toBe(escrita);
  });

  it("a pesquisa vai aparada para o endereço", () => {
    expect(consultaDoMapa({ procura: "  golegã  ", regiao: null, vista: "globo" })).toBe(
      "q=goleg%C3%A3"
    );
  });

  /**
   * `?regiao=<qualquer coisa>` não pode pôr a página a mostrar zero
   * coudelarias sem explicação: uma região que ninguém tem lê-se como país
   * inteiro.
   */
  it("uma região que não existe nos dados lê-se como país inteiro", () => {
    expect(lerEstadoDoMapa({ regiao: "Atlântida" }, REGIOES).regiao).toBeNull();
    expect(lerEstadoDoMapa({ regiao: "Alentejo" }, REGIOES).regiao).toBe("Alentejo");
    expect(lerEstadoDoMapa({ regiao: "Alentejo" }, []).regiao).toBeNull();
  });

  it("uma consulta repetida fica pela primeira, e o lixo não parte a leitura", () => {
    expect(lerEstadoDoMapa({ q: ["golegã", "outra"], vista: ["lista"] }, REGIOES)).toEqual({
      procura: "golegã",
      regiao: null,
      vista: "list",
    });
    expect(lerEstadoDoMapa({ vista: "seja-o-que-for" }, REGIOES).vista).toBe("globo");
  });

  /**
   * ── A vista pedida é o que decide o anúncio das texturas ───────────────
   *
   * A `app/mapa/page.tsx` só anuncia as seis texturas do globo (569,3 KiB,
   * prioridade alta) quando a vista pedida é o globo — senão
   * `/mapa?vista=lista`, que é uma grelha de cartões, descarregava-as para
   * nada. Quem decide é esta função, e a decisão tem de falhar do lado
   * seguro: **o que não for explicitamente a lista é o globo**, porque uma
   * leitura errada aqui não deixa um mapa sem texturas — deixa-o à espera
   * delas no fim da cadeia do `import()`, que é o defeito que o anúncio
   * existe para corrigir.
   *
   * Sem esta prova, alguém acrescenta uma terceira vista ou mexe no valor por
   * omissão e o `/mapa` perde o adiantamento de um segundo e meio em silêncio
   * — não há ecrã onde isso se veja, só um planeta que compõe mais tarde.
   */
  it("a vista pedida decide o anúncio das texturas, e o que não é lista é globo", () => {
    const vista = (p: Record<string, string | string[] | undefined>) =>
      lerEstadoDoMapa(p, REGIOES).vista;
    // Os endereços que a página recebe mesmo.
    expect(vista({})).toBe("globo");
    expect(vista({ vista: "lista" })).toBe("list");
    expect(vista({ q: "alter", vista: "lista" })).toBe("list");
    expect(vista({ regiao: "Alentejo" })).toBe("globo");
    expect(vista({ q: "alter" })).toBe("globo");
    // E o que não se reconhece cai no globo, que é o lado seguro.
    expect(vista({ vista: "mapa" })).toBe("globo");
    expect(vista({ vista: "" })).toBe("globo");
    expect(vista({ vista: undefined })).toBe("globo");
    expect(vista({ vista: ["lista", "globo"] })).toBe("list");
  });
});
