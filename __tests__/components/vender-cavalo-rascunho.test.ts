import { describe, it, expect, beforeEach } from "vitest";
import {
  CHAVE_RASCUNHO,
  VALIDADE_MS,
  guardarRascunho,
  lerRascunho,
  limparRascunho,
  passoSeguro,
  type Rascunho,
} from "@/components/vender-cavalo/rascunho";
import { initialFormData } from "@/components/vender-cavalo/data";

const guardar = (extra: Partial<Parameters<typeof guardarRascunho>[0]> = {}) =>
  guardarRascunho({
    formData: { ...initialFormData, nome: "Zíngaro", preco: "24500" },
    passo: 3,
    plano: "destaque",
    fotografias: 0,
    documentos: 0,
    ...extra,
  });

describe("o rascunho do anúncio", () => {
  beforeEach(() => limparRascunho());

  it("guarda e devolve o que lá se pôs", () => {
    guardar();
    const { rascunho } = lerRascunho();
    expect(rascunho?.formData.nome).toBe("Zíngaro");
    expect(rascunho?.passo).toBe(3);
    expect(rascunho?.plano).toBe("destaque");
  });

  it("sem rascunho não inventa um", () => {
    expect(lerRascunho()).toEqual({ rascunho: null, expirado: false, perdeuFicheiros: false });
  });

  it("um rascunho da versão anterior continua a ser lido", () => {
    // A versão 1 chamava-lhes `step` e `selectedTier` e não guardava data.
    localStorage.setItem(
      CHAVE_RASCUNHO,
      JSON.stringify({
        formData: { ...initialFormData, nome: "Bailarina" },
        step: 2,
        selectedTier: "premium",
      })
    );
    const { rascunho, expirado } = lerRascunho();
    expect(expirado).toBe(false);
    expect(rascunho?.formData.nome).toBe("Bailarina");
    expect(rascunho?.passo).toBe(2);
    expect(rascunho?.plano).toBe("premium");
  });

  it("passados trinta dias deita-o fora e diz que o fez", () => {
    guardar();
    const agora = Date.now() + VALIDADE_MS + 1000;
    const lido = lerRascunho(agora);
    expect(lido.rascunho).toBeNull();
    expect(lido.expirado).toBe(true);
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
  });

  it("no último dia ainda o devolve", () => {
    guardar();
    const lido = lerRascunho(Date.now() + VALIDADE_MS - 1000);
    expect(lido.rascunho).not.toBeNull();
  });

  it("lixo no armazenamento não parte a página, limpa-se", () => {
    localStorage.setItem(CHAVE_RASCUNHO, "{isto não é json");
    expect(lerRascunho().rascunho).toBeNull();
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
  });

  it("um rascunho sem formData não serve para nada", () => {
    localStorage.setItem(CHAVE_RASCUNHO, JSON.stringify({ versao: 2, passo: 3 }));
    expect(lerRascunho().rascunho).toBeNull();
  });

  it("sabe dizer que os ficheiros ficaram para trás", () => {
    // As fotografias e o Livro Azul são `File` e não sobrevivem ao JSON. O
    // que se guarda é a conta deles, para se poder avisar quem volta.
    guardar({ fotografias: 5, documentos: 1 });
    const lido = lerRascunho();
    expect(lido.perdeuFicheiros).toBe(true);
    expect(lido.rascunho?.fotografias).toBe(5);
    expect(lido.rascunho?.documentos).toBe(1);
  });

  it("sem ficheiros não avisa de nada", () => {
    guardar();
    expect(lerRascunho().perdeuFicheiros).toBe(false);
  });
});

describe("a que passo se pode voltar", () => {
  const base = (extra: Partial<Rascunho>): Rascunho => ({
    versao: 2,
    guardadoEm: Date.now(),
    formData: initialFormData,
    passo: 4,
    plano: "standard",
    fotografias: 0,
    documentos: 0,
    ...extra,
  });

  it("quem tinha documentos volta ao passo 2, que é onde eles se anexam", () => {
    // Medido antes: quem tinha ido ao passo 3 voltava lá, sem fotografias e
    // sem Livro Azul, e o botão Continuar não andava — sem dizer porquê.
    expect(passoSeguro(base({ passo: 4, documentos: 1, fotografias: 3 }))).toBe(2);
  });

  it("quem só tinha fotografias volta ao passo 3", () => {
    expect(passoSeguro(base({ passo: 4, fotografias: 3 }))).toBe(3);
  });

  it("quem não tinha ficheiros nenhuns fica onde estava", () => {
    expect(passoSeguro(base({ passo: 4 }))).toBe(4);
  });

  it("nunca empurra ninguém para a frente", () => {
    expect(passoSeguro(base({ passo: 1, documentos: 1 }))).toBe(1);
  });
});
