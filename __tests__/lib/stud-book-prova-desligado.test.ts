/**
 * O interruptor da APSL, provado de fora.
 *
 * O módulo tem os seus próprios testes. Este é escrito à parte e de propósito,
 * porque o que ele guarda não é uma função: é uma **promessa feita ao dono do
 * site**. Enquanto os termos de utilização da consulta pública não estiverem
 * confirmados com a APSL, nenhum pedido pode sair daqui — e um teste que vive
 * ao lado do código que prova é fácil de apagar junto com ele.
 *
 * Duas condições, e as duas têm de calar a consulta:
 *
 * 1. **O interruptor desligado.** É o caso normal e é a omissão.
 * 2. **Ligado mas sem contacto.** Quem consulta um serviço de outra pessoa a
 *    coberto do anonimato está a assumir que não seria autorizado. Sem um
 *    endereço a dizer quem somos, não se consulta.
 *
 * Conta-se o `fetch`, e não o resultado: o que aqui se prova é que a rede não
 * é tocada, não que a resposta é a certa.
 */
import { describe, it, expect, vi } from "vitest";
import { consultarStudBook } from "@/lib/documentos/stud-book";

describe("o interruptor", () => {
  it("desligado, nao sai um unico pedido", async () => {
    const pedir = vi.fn();
    const r = await consultarStudBook(
      { numeroRegisto: "12345", ueln: null, microchip: null },
      { fetch: pedir as unknown as typeof fetch, ambiente: {} }
    );
    expect(pedir).not.toHaveBeenCalled();
    expect(r.estado).toBe("desligado");
  });

  it("sem contacto no ambiente, tambem nao sai pedido nenhum", async () => {
    const pedir = vi.fn();
    const r = await consultarStudBook(
      { numeroRegisto: "12345", ueln: null, microchip: null },
      {
        fetch: pedir as unknown as typeof fetch,
        ambiente: {
          STUD_BOOK_APSL_ACTIVO: "1",
          STUD_BOOK_APSL_URL: "https://exemplo.pt/{campo}/{valor}",
        },
      }
    );
    expect(pedir).not.toHaveBeenCalled();
    expect(r.estado).toBe("desligado");
  });
});
