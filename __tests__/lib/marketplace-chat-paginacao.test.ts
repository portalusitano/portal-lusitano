import { describe, it, expect } from "vitest";
import {
  estadoDaMensagem,
  codificarCursor,
  descodificarCursor,
  linhasAPedir,
  paginaDoFio,
  limiteDaPagina,
  MENSAGENS_POR_PAGINA,
  MAX_MENSAGENS_POR_PAGINA,
  MAX_CONVERSAS_NOVAS_POR_MINUTO,
  MAX_MENSAGENS_POR_MINUTO,
} from "@/lib/marketplace-chat";

describe("estado de uma mensagem", () => {
  it("os três estados saem das duas colunas", () => {
    expect(estadoDaMensagem(null, null)).toBe("enviada");
    expect(estadoDaMensagem(null, "2026-09-09T10:00:00Z")).toBe("entregue");
    expect(estadoDaMensagem("2026-09-09T10:01:00Z", "2026-09-09T10:00:00Z")).toBe("lida");
  });

  /**
   * A invariante que impede o estado de recuar no ecrã.
   *
   * O `entregue_at` e o `lida_at` são escritos por dois `UPDATE` diferentes, e
   * um deles pode falhar. Se a leitura perguntasse primeiro pelo estado do
   * meio, uma mensagem lida cuja escrita de entrega tivesse falhado aparecia
   * como «enviada» — ou seja, o remetente via o estado a andar para trás.
   */
  it("uma mensagem lida sem registo de entrega continua lida", () => {
    expect(estadoDaMensagem("2026-09-09T10:01:00Z", null)).toBe("lida");
  });

  it("uma cadeia de vazios não inventa estado nenhum", () => {
    expect(estadoDaMensagem(undefined, undefined)).toBe("enviada");
    expect(estadoDaMensagem("", "")).toBe("enviada");
  });
});

describe("cursor do fio", () => {
  const cursor = {
    createdAt: "2026-09-09 13:57:48.123456+00",
    id: "cccccccc-0000-0000-0000-000000000001",
  };

  it("ida e volta devolve exactamente o que entrou", () => {
    expect(descodificarCursor(codificarCursor(cursor))).toEqual(cursor);
  });

  /**
   * A razão de o cursor guardar texto e não uma data.
   *
   * O `timestamptz` do Postgres tem microssegundos; o `Date` do JavaScript
   * pára nos milissegundos. Um cursor que passasse por um `new Date(...)`
   * perdia as três últimas casas e a página seguinte saltava — ou repetia — a
   * linha que caísse nesse microssegundo.
   */
  it("os microssegundos sobrevivem à viagem", () => {
    const voltou = descodificarCursor(codificarCursor(cursor));
    expect(voltou?.createdAt).toContain(".123456");
    expect(new Date(cursor.createdAt).toISOString()).not.toContain("123456");
  });

  it("recusa o que não é um cursor desta casa", () => {
    expect(descodificarCursor(null)).toBeNull();
    expect(descodificarCursor("")).toBeNull();
    expect(descodificarCursor("nao-e-base64-nenhum!!")).toBeNull();
    // Sem separador
    expect(descodificarCursor(Buffer.from("2026-09-09").toString("base64url"))).toBeNull();
    // Id que não é UUID — nunca sai desta base, logo não entra num filtro
    expect(descodificarCursor(Buffer.from("2026-09-09|ou-1=1").toString("base64url"))).toBeNull();
    // Data que não é data
    expect(
      descodificarCursor(
        Buffer.from("ontem|cccccccc-0000-0000-0000-000000000001").toString("base64url")
      )
    ).toBeNull();
  });
});

describe("recortar a página", () => {
  /**
   * A ordem em que a base devolve: do mais recente para o mais antigo, com o
   * `id` a desempatar.
   */
  function linhas(n: number, instante = (i: number) => `2026-09-0${9 - (i % 9)}T10:00:00+00:00`) {
    return Array.from({ length: n }, (_, i) => ({
      id: `cccccccc-0000-0000-0000-${String(1000 - i).padStart(12, "0")}`,
      created_at: instante(i),
    }));
  }

  it("sem cursor, a primeira página são as primeiras `limite`", () => {
    const { pagina, temMais } = paginaDoFio(linhas(36), 30, linhasAPedir(30), null);
    expect(pagina).toHaveLength(30);
    expect(temMais).toBe(true);
  });

  it("um fio que cabe todo não tem mais nada atrás", () => {
    const { pagina, temMais } = paginaDoFio(linhas(7), 30, linhasAPedir(30), null);
    expect(pagina).toHaveLength(7);
    expect(temMais).toBe(false);
  });

  /**
   * **A linha da fronteira não se repete.**
   *
   * Este é o defeito que a medição ponta a ponta apanhou: percorrer um fio de
   * 400 mensagens por cursor devolvia 413 linhas para 400 distintas — a linha
   * do cursor outra vez em 13 das 14 páginas. O corte é inclusivo de propósito
   * (é uma desigualdade só, que qualquer servidor lê da mesma maneira), e é
   * aqui que a linha já entregue sai.
   */
  it("a linha do cursor não volta na página seguinte", () => {
    const todas = linhas(10, (i) => `2026-09-09T10:00:0${9 - i}+00:00`);
    const primeira = paginaDoFio(todas, 3, linhasAPedir(3), null);
    const cursor = {
      createdAt: primeira.pagina[2].created_at,
      id: primeira.pagina[2].id,
    };

    // A base devolve, com `created_at <= cursor`, a própria linha do cursor à
    // cabeça — é isso que o corte inclusivo garante.
    const devolvidas = todas.filter((l) => l.created_at <= cursor.createdAt);
    expect(devolvidas[0].id).toBe(cursor.id);

    const segunda = paginaDoFio(devolvidas, 3, linhasAPedir(3), cursor);
    expect(segunda.pagina.map((l) => l.id)).not.toContain(cursor.id);
    expect(segunda.pagina[0].id).toBe(todas[3].id);
  });

  /**
   * O caso que obriga à margem: várias mensagens no mesmo instante. Só saem as
   * que ainda não foram entregues, e o desempate é pelo `id`.
   */
  it("com empates no mesmo instante, saem só as que faltam", () => {
    const mesmo = "2026-09-09T10:00:00.123456+00:00";
    const todas = [
      { id: "cccccccc-0000-0000-0000-000000000009", created_at: mesmo },
      { id: "cccccccc-0000-0000-0000-000000000008", created_at: mesmo },
      { id: "cccccccc-0000-0000-0000-000000000007", created_at: mesmo },
      { id: "cccccccc-0000-0000-0000-000000000006", created_at: "2026-09-08T10:00:00+00:00" },
    ];
    const cursor = { createdAt: mesmo, id: "cccccccc-0000-0000-0000-000000000008" };

    const { pagina } = paginaDoFio(todas, 30, linhasAPedir(30), cursor);

    expect(pagina.map((l) => l.id)).toEqual([
      "cccccccc-0000-0000-0000-000000000007",
      "cccccccc-0000-0000-0000-000000000006",
    ]);
  });

  /**
   * O `temMais` nunca subestima. Se o servidor devolveu tudo o que se lhe
   * pediu, pode haver mais — e um pedido a mais que devolve zero linhas custa
   * muito menos do que uma conversa que perde o resto de si própria.
   */
  it("um servidor que devolveu o tecto conta como havendo mais", () => {
    const pedido = linhasAPedir(30);
    const { temMais } = paginaDoFio(linhas(pedido), 30, pedido, null);
    expect(temMais).toBe(true);

    // E com uma margem inteira de empates deitada fora, continua a dizer que há.
    const mesmo = "2026-09-09T10:00:00+00:00";
    const empatadas = Array.from({ length: pedido }, (_, i) => ({
      id: `cccccccc-0000-0000-0000-${String(999 - i).padStart(12, "0")}`,
      created_at: i < 6 ? mesmo : "2026-09-08T10:00:00+00:00",
    }));
    const comEmpate = paginaDoFio(empatadas, 30, pedido, {
      createdAt: mesmo,
      id: "cccccccc-0000-0000-0000-000000000994",
    });
    expect(comEmpate.temMais).toBe(true);
  });

  /**
   * Percorrer um fio inteiro por cursor: cada linha exactamente uma vez, e
   * pela mesma ordem. É a invariante que a medição ponta a ponta violava.
   */
  it("um fio de 400 percorre-se todo, sem repetir nem saltar", () => {
    const todas = Array.from({ length: 400 }, (_, i) => ({
      id: `cccccccc-0000-0000-0000-${String(400 - i).padStart(12, "0")}`,
      // Duas a duas no mesmo instante, para o desempate ter trabalho.
      created_at: new Date(
        Date.UTC(2026, 8, 9, 10, 0, 0) - Math.floor(i / 2) * 60_000
      ).toISOString(),
    }));

    const vistos: string[] = [];
    let cursor: { createdAt: string; id: string } | null = null;
    for (let volta = 0; volta < 40; volta++) {
      const pedido = linhasAPedir(30);
      const corte: string | null = cursor ? cursor.createdAt : null;
      const devolvidas: Array<{ id: string; created_at: string }> = (
        corte === null ? todas : todas.filter((l) => l.created_at <= corte)
      ).slice(0, pedido);
      const recorte: { pagina: Array<{ id: string; created_at: string }>; temMais: boolean } =
        paginaDoFio(devolvidas, 30, pedido, cursor);
      vistos.push(...recorte.pagina.map((l) => l.id));
      if (!recorte.temMais || recorte.pagina.length === 0) break;
      const ultima = recorte.pagina[recorte.pagina.length - 1];
      cursor = { createdAt: ultima.created_at, id: ultima.id };
    }

    expect(vistos).toHaveLength(400);
    expect(new Set(vistos).size).toBe(400);
    expect(vistos).toEqual(todas.map((l) => l.id));
  });
});

describe("limite da página", () => {
  it("tem omissão, tecto e chão", () => {
    expect(limiteDaPagina(null)).toBe(MENSAGENS_POR_PAGINA);
    expect(limiteDaPagina("")).toBe(MENSAGENS_POR_PAGINA);
    expect(limiteDaPagina("10")).toBe(10);
    expect(limiteDaPagina("5000")).toBe(MAX_MENSAGENS_POR_PAGINA);
    expect(limiteDaPagina("0")).toBe(MENSAGENS_POR_PAGINA);
    expect(limiteDaPagina("-7")).toBe(MENSAGENS_POR_PAGINA);
    expect(limiteDaPagina("trinta")).toBe(MENSAGENS_POR_PAGINA);
  });
});

describe("os limites de ritmo estão escritos e não são iguais", () => {
  /**
   * Não é um teste de tautologia: o que ele fixa é a **decisão**. Abrir
   * conversas novas é a acção que uma conta acabada de criar usa para varrer o
   * directório; responder num fio já aberto é o que esta funcionalidade existe
   * para permitir. Se um dia alguém igualar os dois números, um dos dois está
   * errado.
   */
  it("abrir conversas é mais apertado do que responder", () => {
    expect(MAX_CONVERSAS_NOVAS_POR_MINUTO).toBeLessThan(MAX_MENSAGENS_POR_MINUTO);
    expect(MAX_CONVERSAS_NOVAS_POR_MINUTO).toBeGreaterThan(0);
  });
});
