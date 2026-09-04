import { describe, expect, it } from "vitest";

import {
  INTERVALO_MINIMO_MS,
  lerConfiguracao,
  montarUserAgent,
  TECTO_DIARIO,
  VAR_ACTIVO,
  VAR_CONTACTO,
  VAR_INTERVALO_MS,
  VAR_TECTO_DIARIO,
  VAR_URL,
} from "@/lib/documentos/stud-book/configuracao";

/**
 * O interruptor.
 *
 * O que estes testes protegem é uma decisão que não é técnica: enquanto o dono
 * não acertar os termos de utilização com a APSL, **nenhum pedido pode sair**.
 * A consulta ser pública e gratuita para uma pessoa não é o mesmo que ser
 * autorizada a um programa que a interroga em nome de terceiros, e o
 * `robots.txt` do `cavalo-lusitano.com` nunca foi lido — ver a secção 1 do
 * `docs/verificacao-documental.md`.
 *
 * Daí as três condições. A do contacto é a que mais facilmente se dispensaria
 * por comodidade, e é precisamente a que não se dispensa: quem consulta a
 * coberto do anonimato está a assumir que não seria autorizado.
 */

const AMBIENTE_COMPLETO = {
  [VAR_ACTIVO]: "1",
  [VAR_URL]: "https://www.cavalo-lusitano.com/pesquisa",
  [VAR_CONTACTO]: "documentos@portal-lusitano.pt",
};

describe("a configuração do stud-book", () => {
  describe("está desligada por omissão", () => {
    it("um ambiente vazio não liga nada", () => {
      expect(lerConfiguracao({})).toEqual({ ligado: false, razao: "interruptor_desligado" });
    });

    it("ter o endereço e o contacto não chega — falta a afirmação deliberada", () => {
      expect(
        lerConfiguracao({ [VAR_URL]: AMBIENTE_COMPLETO[VAR_URL], [VAR_CONTACTO]: "a@b.pt" })
      ).toEqual({ ligado: false, razao: "interruptor_desligado" });
    });

    it("um valor que não é um «sim» é um «não»", () => {
      for (const valor of ["0", "false", "nao", "", "talvez", "SIM ", "true "]) {
        const configuracao = lerConfiguracao({ ...AMBIENTE_COMPLETO, [VAR_ACTIVO]: valor });
        // «SIM » e «true » têm espaços à volta e contam: o que não conta é o
        // que não é uma afirmação.
        const esperado = ["SIM ", "true "].includes(valor);
        expect(configuracao.ligado).toBe(esperado);
      }
    });
  });

  describe("recusa ligar-se sem as condições todas", () => {
    it("sem endereço não liga — e não há endereço por omissão porque não o sabemos", () => {
      const { [VAR_URL]: _fora, ...semUrl } = AMBIENTE_COMPLETO;
      expect(lerConfiguracao(semUrl)).toEqual({ ligado: false, razao: "sem_endereco" });
    });

    it("sem contacto não liga — um pedido anónimo não é uma versão pior disto", () => {
      const { [VAR_CONTACTO]: _fora, ...semContacto } = AMBIENTE_COMPLETO;
      expect(lerConfiguracao(semContacto)).toEqual({ ligado: false, razao: "sem_contacto" });
    });

    it("um endereço que não é URL não liga", () => {
      expect(lerConfiguracao({ ...AMBIENTE_COMPLETO, [VAR_URL]: "isto não é um url" })).toEqual({
        ligado: false,
        razao: "endereco_invalido",
      });
    });

    it("um endereço em http não liga — a pergunta leva o microchip de um cavalo", () => {
      expect(lerConfiguracao({ ...AMBIENTE_COMPLETO, [VAR_URL]: "http://exemplo.pt/x" })).toEqual({
        ligado: false,
        razao: "endereco_inseguro",
      });
    });
  });

  describe("quando liga", () => {
    it("identifica-nos com nome, sítio e contacto", () => {
      const configuracao = lerConfiguracao(AMBIENTE_COMPLETO);
      expect(configuracao.ligado).toBe(true);
      if (!configuracao.ligado) return;

      expect(configuracao.userAgent).toContain("PortalLusitano");
      expect(configuracao.userAgent).toContain("documentos@portal-lusitano.pt");
      // Quem recebe o pedido tem de conseguir chegar a nós para nos mandar parar.
      expect(configuracao.userAgent).toMatch(/https?:\/\//);
    });

    it("usa os limites por omissão quando ninguém os põe", () => {
      const configuracao = lerConfiguracao(AMBIENTE_COMPLETO);
      if (!configuracao.ligado) throw new Error("devia ter ligado");
      expect(configuracao.intervaloMs).toBe(INTERVALO_MINIMO_MS);
      expect(configuracao.tectoDiario).toBe(TECTO_DIARIO);
    });

    it("aceita limites postos à mão, dentro do razoável", () => {
      const configuracao = lerConfiguracao({
        ...AMBIENTE_COMPLETO,
        [VAR_INTERVALO_MS]: "12000",
        [VAR_TECTO_DIARIO]: "50",
      });
      if (!configuracao.ligado) throw new Error("devia ter ligado");
      expect(configuracao.intervaloMs).toBe(12000);
      expect(configuracao.tectoDiario).toBe(50);
    });

    it("uma variável não pode encurtar o intervalo abaixo do mínimo absoluto", () => {
      // Pôr `0` aqui seria a maneira mais fácil de transformar isto num
      // raspador sem que ninguém desse por ela.
      for (const valor of ["0", "-1", "500", "abc", "9999999999"]) {
        const configuracao = lerConfiguracao({ ...AMBIENTE_COMPLETO, [VAR_INTERVALO_MS]: valor });
        if (!configuracao.ligado) throw new Error("devia ter ligado");
        expect(configuracao.intervaloMs).toBe(INTERVALO_MINIMO_MS);
      }
    });

    it("um tecto diário absurdo cai no valor por omissão", () => {
      for (const valor of ["0", "-5", "999999", "muitos"]) {
        const configuracao = lerConfiguracao({ ...AMBIENTE_COMPLETO, [VAR_TECTO_DIARIO]: valor });
        if (!configuracao.ligado) throw new Error("devia ter ligado");
        expect(configuracao.tectoDiario).toBe(TECTO_DIARIO);
      }
    });
  });

  it("o User-Agent diz quem somos, o que fazemos e por onde se fala connosco", () => {
    const ua = montarUserAgent("alguem@exemplo.pt", "https://exemplo.pt");
    expect(ua).toBe(
      "PortalLusitano/1.0 (+https://exemplo.pt; verificacao-de-anuncios; alguem@exemplo.pt)"
    );
  });
});
