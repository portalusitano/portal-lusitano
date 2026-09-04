import { describe, it, expect, beforeEach } from "vitest";
import {
  CHAVE_RASCUNHO,
  VALIDADE_MS,
  guardarRascunho,
  lerRascunho,
  limparRascunho,
  passoSeguro,
  temConteudo,
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

describe("um formulário em que ninguém tocou não é um rascunho", () => {
  beforeEach(() => limparRascunho());

  it("não guarda um formulário vazio", () => {
    guardarRascunho({
      formData: initialFormData,
      passo: 1,
      plano: "standard",
      fotografias: 0,
      documentos: 0,
    });
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
  });

  it("apaga o que lá estivesse quando o formulário volta a zero", () => {
    // É este o caso do «Recomeçar de novo»: limpa o armazenamento e repõe o
    // formulário, e repor o formulário volta a disparar o guardar. Sem esta
    // regra ficava lá um rascunho vazio, e da vez seguinte a pessoa era
    // recebida com «rascunho restaurado» num formulário sem uma letra.
    guardar();
    expect(localStorage.getItem(CHAVE_RASCUNHO)).not.toBeNull();
    guardarRascunho({
      formData: initialFormData,
      passo: 1,
      plano: "standard",
      fotografias: 0,
      documentos: 0,
    });
    expect(localStorage.getItem(CHAVE_RASCUNHO)).toBeNull();
  });

  it("uma letra num campo já é conteúdo", () => {
    expect(temConteudo({ ...initialFormData, nome: "Z" }, 0, 0)).toBe(true);
  });

  it("espaços em branco não são conteúdo", () => {
    expect(temConteudo({ ...initialFormData, nome: "   " }, 0, 0)).toBe(false);
  });

  it("uma pergunta respondida, uma disciplina escolhida ou uma foto já são conteúdo", () => {
    // As perguntas de sim ou não deixaram de ser `boolean`: um `boolean` não
    // sabia dizer «ainda não respondi», e por isso «não» e «por responder»
    // eram o mesmo `false`. Aqui isso lê-se bem — **responder «não» também é
    // ter começado o rascunho**, e antes não era, porque `false` era o valor
    // de partida de toda a gente.
    expect(temConteudo({ ...initialFormData, negociavel: "sim" }, 0, 0)).toBe(true);
    expect(temConteudo({ ...initialFormData, negociavel: "nao" }, 0, 0)).toBe(true);
    expect(temConteudo(initialFormData, 0, 0)).toBe(false);
    expect(temConteudo({ ...initialFormData, disciplinas: ["Dressage"] }, 0, 0)).toBe(true);
    expect(temConteudo(initialFormData, 1, 0)).toBe(true);
    expect(temConteudo(initialFormData, 0, 1)).toBe(true);
  });

  it("guarda as três respostas de uma pergunta de sim ou não, e devolve-as tal e qual", () => {
    // Com noventa e oito campos obrigatórios, o rascunho passou a ser o que
    // separa uma sessão longa de uma sessão perdida. Uma resposta «não» que
    // voltasse como «por responder» seria uma pergunta a repetir a quem já a
    // respondeu — e, pior, indistinguível de nunca lá ter chegado.
    guardar({
      formData: {
        ...initialFormData,
        nome: "Zíngaro",
        apto_criancas: "nao",
        habituado_ferrador: "sim",
      },
    });
    const { rascunho } = lerRascunho();
    expect(rascunho?.formData.apto_criancas).toBe("nao");
    expect(rascunho?.formData.habituado_ferrador).toBe("sim");
    expect(rascunho?.formData.trabalha_solto).toBe("");
  });

  it("guarda os noventa e nove campos, e não uma escolha deles", () => {
    // O rascunho é um `JSON.stringify` do `formData` inteiro, e é assim que
    // tem de continuar a ser: uma lista de campos a guardar, escrita à mão,
    // esquecia o campo seguinte que alguém acrescentasse — e o sintoma seria
    // uma resposta que desaparece ao recarregar a página, que é o pior sítio
    // para se perder alguma coisa.
    const cheio = Object.fromEntries(
      Object.entries(initialFormData).map(([chave, valor]) => [
        chave,
        Array.isArray(valor) ? ["Dressage"] : "x",
      ])
    ) as unknown as typeof initialFormData;
    guardar({ formData: cheio });
    const { rascunho } = lerRascunho();
    expect(Object.keys(rascunho?.formData ?? {})).toHaveLength(99);
    for (const chave of Object.keys(initialFormData)) {
      expect(rascunho?.formData[chave as keyof typeof initialFormData], chave).toBeTruthy();
    }
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
