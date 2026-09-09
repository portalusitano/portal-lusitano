import { describe, it, expect } from "vitest";
import {
  vistaConversa,
  vistaCabecalho,
  vistaMensagem,
  CHAVES_CONVERSA,
  CHAVES_MENSAGEM,
  CHAVES_CABECALHO,
  COLUNAS_CAVALO,
  COLUNAS_MENSAGEM,
  type LinhaConversa,
} from "@/lib/chat/vista-publica";

/**
 * A promessa que está escrita na página inicial:
 *
 *   «Fale com o vendedor sem publicar o seu número. O contacto só é partilhado
 *    se quiser.»
 *
 * Isto é uma afirmação sobre **respostas de API**. Um telefone que chegue ao
 * JSON já saiu de casa — ninguém precisa de o ver desenhado numa página para o
 * apanhar. Estes testes são o que impede a frase de se tornar falsa sem
 * ninguém dar por isso.
 */

const EU = "11111111-1111-1111-1111-111111111111";
const OUTRO = "22222222-2222-2222-2222-222222222222";

const CONVERSA: LinhaConversa = {
  id: "bbbbbbbb-0000-0000-0000-000000000001",
  cavalo_id: "aaaaaaaa-0000-0000-0000-000000000001",
  comprador_id: EU,
  vendedor_id: OUTRO,
  comprador_nome: "Maria",
  ultima_mensagem_at: "2026-09-09T10:00:00Z",
  arquivada_comprador: false,
  arquivada_vendedor: true,
};

/**
 * Uma linha de anúncio **como a base a devolveria se alguém escrevesse
 * `select("*")`** — com os três contactos lá dentro. É de propósito que o
 * duplo traz mais do que o `COLUNAS_CAVALO` pede: o que se está a testar é o
 * que acontece no dia em que esse `select` mudar.
 */
const CAVALO_COM_CONTACTOS = {
  id: "aaaaaaaa-0000-0000-0000-000000000001",
  nome: "Zagalo",
  foto_principal: "/fotos/zagalo.webp",
  preco: 18500,
  status: "ativo",
  vendedor_nome: "Coudelaria da Ribeira",
  vendedor_telefone: "+351 912 345 678",
  vendedor_email: "vendedor@exemplo.pt",
  vendedor_whatsapp: "+351912345678",
} as Record<string, unknown>;

const CONTACTOS = ["+351 912 345 678", "vendedor@exemplo.pt", "+351912345678", "912345678"];

/** Junta todos os valores de um objecto, por mais fundo que estejam. */
function tudoOQueSaiu(valor: unknown): string {
  return JSON.stringify(valor);
}

describe("o conjunto de chaves é exactamente este", () => {
  it("a conversa da caixa de entrada", () => {
    const vista = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      {
        ultimaMensagem: "Ainda está disponível?",
        porLer: 2,
      },
      EU
    );

    expect(Object.keys(vista).sort()).toEqual([...CHAVES_CONVERSA].sort());
  });

  it("o cabeçalho do fio", () => {
    const vista = vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU);
    expect(Object.keys(vista).sort()).toEqual([...CHAVES_CABECALHO].sort());
  });

  it("a mensagem", () => {
    const vista = vistaMensagem(
      {
        id: "cccccccc-0000-0000-0000-000000000001",
        corpo: "Bom dia",
        created_at: "2026-09-09T10:00:00Z",
        remetente_id: EU,
        lida_at: null,
        entregue_at: "2026-09-09T10:00:01Z",
      },
      EU
    );

    expect(Object.keys(vista).sort()).toEqual([...CHAVES_MENSAGEM].sort());
  });
});

describe("nenhum contacto sai daqui", () => {
  it("mesmo quando a linha do anúncio traz os três", () => {
    const saiu = tudoOQueSaiu([
      vistaConversa(CONVERSA, CAVALO_COM_CONTACTOS, { ultimaMensagem: "olá", porLer: 0 }, EU),
      vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU),
      vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, OUTRO),
    ]);

    for (const contacto of CONTACTOS) {
      expect(saiu).not.toContain(contacto);
    }
  });

  /**
   * Um endereço de email nunca aparece inteiro, seja de que lado for.
   *
   * O nome que se guarda de um comprador sem `full_name` é a parte local do
   * email — «maria.silva» de «maria.silva@exemplo.pt». Isso é um nome de
   * utilizador, não um contacto: não se lhe pode escrever. O que **não** pode
   * acontecer nunca é o endereço inteiro escapar, e é isso que este teste
   * fixa.
   */
  it("nunca sai um endereço inteiro", () => {
    const comEmailComoNome: LinhaConversa = { ...CONVERSA, comprador_nome: "maria.silva" };
    const saiu = tudoOQueSaiu([
      vistaConversa(
        comEmailComoNome,
        CAVALO_COM_CONTACTOS,
        { ultimaMensagem: null, porLer: 0 },
        OUTRO
      ),
      vistaCabecalho(comEmailComoNome, CAVALO_COM_CONTACTOS, OUTRO),
    ]);

    expect(saiu).not.toContain("@");
  });

  /**
   * O `uuid` de nenhuma das duas pessoas sai na resposta. É o identificador
   * que ligaria uma conversa a tudo o resto que a pessoa faça no site.
   */
  it("nem os identificadores das pessoas", () => {
    const saiu = tudoOQueSaiu([
      vistaConversa(CONVERSA, CAVALO_COM_CONTACTOS, { ultimaMensagem: "olá", porLer: 0 }, EU),
      vistaCabecalho(CONVERSA, CAVALO_COM_CONTACTOS, EU),
      vistaMensagem(
        {
          id: "cccccccc-0000-0000-0000-000000000001",
          corpo: "Bom dia",
          created_at: "2026-09-09T10:00:00Z",
          remetente_id: OUTRO,
        },
        EU
      ),
    ]);

    expect(saiu).not.toContain(EU);
    expect(saiu).not.toContain(OUTRO);
  });

  /**
   * O `select` que as rotas usam é uma constante deste módulo justamente para
   * não haver três sítios onde alguém possa acrescentar uma coluna de
   * contacto. Se um dia isso acontecer, falha aqui.
   */
  it("as colunas que se pedem não incluem contactos", () => {
    for (const proibida of ["telefone", "email", "whatsapp"]) {
      expect(COLUNAS_CAVALO).not.toContain(proibida);
      expect(COLUNAS_MENSAGEM).not.toContain(proibida);
    }
  });
});

describe("o papel e o estado dependem de quem pergunta", () => {
  it("a mesma conversa lê-se dos dois lados", () => {
    const doComprador = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0 },
      EU
    );
    const doVendedor = vistaConversa(
      CONVERSA,
      CAVALO_COM_CONTACTOS,
      { ultimaMensagem: null, porLer: 0 },
      OUTRO
    );

    expect(doComprador.papel).toBe("comprador");
    expect(doComprador.outraParte).toBe("Coudelaria da Ribeira");
    expect(doComprador.arquivada).toBe(false);

    expect(doVendedor.papel).toBe("vendedor");
    expect(doVendedor.outraParte).toBe("Maria");
    expect(doVendedor.arquivada).toBe(true);
  });

  /**
   * Mostrar «entregue» a quem recebeu é dizer-lhe uma coisa que ele já sabe
   * por estar a lê-la. O estado é a resposta à pergunta de quem escreveu.
   */
  it("o estado só vale para quem escreveu", () => {
    const linha = {
      id: "cccccccc-0000-0000-0000-000000000001",
      corpo: "Bom dia",
      created_at: "2026-09-09T10:00:00Z",
      remetente_id: OUTRO,
      lida_at: null,
      entregue_at: null,
    };

    expect(vistaMensagem(linha, OUTRO).estado).toBe("enviada");
    expect(vistaMensagem(linha, EU).estado).toBe("lida");
    expect(vistaMensagem(linha, EU).minha).toBe(false);
  });
});
