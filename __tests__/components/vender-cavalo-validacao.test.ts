import { describe, it, expect } from "vitest";
import {
  validarPasso,
  quantosFaltam,
  faltamPorPasso,
  feitosPorPasso,
  totalPorPasso,
  type EstadoFormulario,
  type MensagensValidacao,
} from "@/components/vender-cavalo/validacao";
import { CAMPOS, CAMPOS_VOLUNTARIOS } from "@/components/vender-cavalo/campos";
import { initialFormData } from "@/components/vender-cavalo/data";
import type { FormData } from "@/components/vender-cavalo/types";

/**
 * As frases não interessam aqui — interessa haver uma, e ela saber de que
 * campo é. As quatro genéricas são funções e devolvem o nome do campo; as
 * outras devolvem o nome da própria chave, para se distinguirem nos erros.
 */
const GENERICAS = new Set(["porPreencher", "porEscolher", "porResponder", "porEscolherLista"]);
const m = new Proxy({} as MensagensValidacao, {
  get: (_alvo, chave) =>
    GENERICAS.has(String(chave)) ? (nome: string) => `${String(chave)}:${nome}` : String(chave),
}) as MensagensValidacao;

const ficheiro = (nome: string) => new File(["x"], nome, { type: "application/pdf" });
const imagem = (n: number) => new File(["x"], `foto-${n}.jpg`, { type: "image/jpeg" });

const estado = (formData: Partial<FormData>, resto: Partial<EstadoFormulario> = {}) => ({
  formData: { ...initialFormData, ...formData },
  documentos: {},
  imagens: [],
  termosAceites: false,
  ...resto,
});

const campos = (erros: { campo: string }[]) => erros.map((e) => e.campo);

/** Um formulário inteiramente respondido, para lhe tirar um campo de cada vez. */
function tudoRespondido(): FormData {
  const cheio: FormData = { ...initialFormData };
  for (const campo of CAMPOS) {
    const valor = cheio[campo.chave];
    if (Array.isArray(valor)) {
      (cheio[campo.chave] as string[]) = ["Dressage"];
    } else if (campo.tipo === "resposta") {
      (cheio[campo.chave] as string) = "nao";
    } else {
      (cheio[campo.chave] as string) = "preenchido";
    }
  }
  // Os poucos que têm regra própria além de «está preenchido?».
  cheio.proprietario_email = "maria@exemplo.pt";
  cheio.data_nascimento = "2019-04-12";
  cheio.preco = "24500";
  cheio.descricao = "x".repeat(100);
  // O estado **máximo**: todas as condições ligadas, para que os quatro campos
  // condicionais do catálogo também sejam exercitados. Com um particular e uma
  // égua, o website da coudelaria, a duração do trial e os dois da cobrição
  // nunca chegavam a ser exigidos e o teste que os percorre não os via.
  cheio.tipo_proprietario = "Coudelaria";
  cheio.sexo = "Garanhão";
  cheio.trial_possivel = "sim";
  cheio.disponivel_cobricao = "sim";
  cheio.vacinacao_atualizada = "sim";
  cheio.desparasitacao_atualizada = "sim";
  return cheio;
}

const completo = (extra: Partial<FormData> = {}): EstadoFormulario => ({
  formData: { ...tudoRespondido(), ...extra },
  documentos: { livroAzul: ficheiro("livro-azul.pdf") },
  imagens: [imagem(1), imagem(2), imagem(3)],
  termosAceites: true,
});

describe("nada é opcional", () => {
  it("um formulário vazio não deixa passar um único passo", () => {
    for (const passo of [1, 2, 3, 4]) {
      expect(validarPasso(passo, estado({}), m).length, `passo ${passo}`).toBeGreaterThan(0);
    }
  });

  it("com tudo respondido, os quatro passos passam", () => {
    for (const passo of [1, 2, 3, 4]) {
      expect(validarPasso(passo, completo(), m), `passo ${passo}`).toEqual([]);
    }
  });

  it("tirar qualquer campo obrigatório trava o passo dele, e só o dele", () => {
    // É este o teste que substitui os vinte `if` que a validação tinha: em vez
    // de confiar numa lista escrita à mão, exercita os noventa e oito campos
    // do catálogo, um de cada vez.
    for (const campo of CAMPOS) {
      const vazio = Array.isArray(initialFormData[campo.chave]) ? [] : "";
      const base = completo({ [campo.chave]: vazio } as Partial<FormData>);
      // Tirar um campo pode tirar a condição de outro do ecrã — tirar
      // `trial_possivel` faz a duração do trial deixar de ser exigida —, por
      // isso o que se afirma é que **este** campo é acusado.
      const erros = campos(validarPasso(campo.passo, base, m));
      expect(erros, `${campo.id} devia travar o passo ${campo.passo}`).toContain(campo.id);
    }
  });

  it("nenhum campo é acusado num passo que não é o seu", () => {
    for (const campo of CAMPOS) {
      const vazio = Array.isArray(initialFormData[campo.chave]) ? [] : "";
      const base = completo({ [campo.chave]: vazio } as Partial<FormData>);
      for (const passo of [1, 2, 3, 4]) {
        if (passo === campo.passo) continue;
        expect(campos(validarPasso(passo, base, m)), `${campo.id} no passo ${passo}`).not.toContain(
          campo.id
        );
      }
    }
  });

  it("o veterinário de referência é o único campo que não trava nada", () => {
    // É o nome de um terceiro que não consentiu em ser publicado. Ver a razão
    // escrita em `CAMPOS_VOLUNTARIOS`.
    expect(CAMPOS_VOLUNTARIOS).toEqual(["nome_veterinario"]);
    expect(CAMPOS.some((c) => c.chave === "nome_veterinario")).toBe(false);
    const sem = completo({ nome_veterinario: "" });
    expect(validarPasso(2, sem, m)).toEqual([]);
  });
});

describe("«não» é uma resposta, e a caixa vazia não é", () => {
  it("responder «não» a todas as perguntas de sim ou não deixa publicar", () => {
    // O defeito que isto existe para não deixar voltar: enquanto eram caixas
    // de selecção, exigir uma resposta era exigir a caixa **marcada** — o
    // vendedor tinha de declarar que o cavalo é bom com o ferrador para o
    // formulário o deixar passar. Já aconteceu uma vez, com a vacinação.
    const todasNao = completo({
      vacinacao_atualizada: "nao",
      data_ultima_vacinacao: "",
      desparasitacao_atualizada: "nao",
      data_ultima_desparasitacao: "",
    });
    expect(validarPasso(2, todasNao, m)).toEqual([]);
    expect(todasNao.formData.habituado_ferrador).toBe("nao");
    expect(todasNao.formData.apto_criancas).toBe("nao");
  });

  it("uma pergunta por responder é acusada, e diz que é de sim ou não", () => {
    const erros = validarPasso(2, completo({ apto_criancas: "" }), m);
    const dele = erros.find((e) => e.campo === "apto_criancas");
    expect(dele?.mensagem).toContain("porResponder");
  });
});

describe("os campos que só existem em certas condições", () => {
  it("o website da coudelaria não é exigido a um particular", () => {
    const particular = completo({ tipo_proprietario: "Particular", website_coudelaria: "" });
    expect(campos(validarPasso(1, particular, m))).not.toContain("website_coudelaria");
  });

  it("mas é exigido a uma coudelaria", () => {
    const coudelaria = completo({ tipo_proprietario: "Coudelaria", website_coudelaria: "" });
    expect(campos(validarPasso(1, coudelaria, m))).toContain("website_coudelaria");
  });

  it("a duração do trial só se pede a quem disse que aceita trial", () => {
    expect(
      campos(validarPasso(3, completo({ trial_possivel: "nao", duracao_trial: "" }), m))
    ).not.toContain("duracao_trial");
    expect(
      campos(validarPasso(3, completo({ trial_possivel: "sim", duracao_trial: "" }), m))
    ).toContain("duracao_trial");
  });

  it("a cobrição só se pede a um garanhão", () => {
    const egua = completo({ sexo: "Égua", disponivel_cobricao: "", preco_cobricao: "" });
    expect(campos(validarPasso(3, egua, m))).not.toContain("disponivel_cobricao");
    expect(campos(validarPasso(3, egua, m))).not.toContain("preco_cobricao");

    const garanhao = completo({
      sexo: "Garanhão",
      disponivel_cobricao: "sim",
      preco_cobricao: "",
    });
    expect(campos(validarPasso(3, garanhao, m))).toContain("preco_cobricao");
  });

  it("a data da última vacinação só se pede a quem disse que está em dia", () => {
    // Um poldro que nunca foi vacinado não tem data nenhuma para escrever, e
    // exigir-lha seria obrigá-lo a inventar uma.
    expect(
      campos(
        validarPasso(2, completo({ vacinacao_atualizada: "nao", data_ultima_vacinacao: "" }), m)
      )
    ).not.toContain("data_ultima_vacinacao");
    expect(
      campos(
        validarPasso(2, completo({ vacinacao_atualizada: "sim", data_ultima_vacinacao: "" }), m)
      )
    ).toContain("data_ultima_vacinacao");
  });

  it("um campo condicional que não é exigido também não entra na conta do passo", () => {
    // Dizer a uma égua que o passo 3 tem vinte e uma perguntas quando lhe faz
    // dezanove é mentir-lhe sobre o caminho que falta.
    const egua = totalPorPasso(completo({ sexo: "Égua", trial_possivel: "nao" }));
    const garanhao = totalPorPasso(
      completo({ sexo: "Garanhão", disponivel_cobricao: "sim", trial_possivel: "sim" })
    );
    expect(garanhao[2] - egua[2]).toBe(3); // cobrição, preço de cobrição, duração do trial
  });
});

describe("as regras que não são «está preenchido?»", () => {
  it("uma gralha no email é apanhada aqui e não no fim", () => {
    const erros = validarPasso(1, completo({ proprietario_email: "maria.exemplo.pt" }), m);
    expect(campos(erros)).toEqual(["proprietario_email"]);
    expect(erros[0].mensagem).toBe("emailInvalido");
  });

  it("aceita endereços com sinais que uma expressão esperta recusaria", () => {
    for (const email of ["maria+anuncios@exemplo.pt", "m.ferreira@sub.dominio.co.uk", "'a@b.io"]) {
      expect(validarPasso(1, completo({ proprietario_email: email }), m)).toEqual([]);
    }
  });

  it("uma data de nascimento no futuro, ou de há cinquenta anos, é uma gralha no ano", () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    expect(
      campos(validarPasso(1, completo({ data_nascimento: futuro.toISOString().slice(0, 10) }), m))
    ).toEqual(["data_nascimento"]);
    expect(campos(validarPasso(1, completo({ data_nascimento: "1975-01-01" }), m))).toEqual([
      "data_nascimento",
    ]);
  });

  it("um preço de zero não é um preço", () => {
    const erros = validarPasso(3, completo({ preco: "0" }), m);
    expect(campos(erros)).toEqual(["preco"]);
    expect(erros[0].mensagem).toBe("precoInvalido");
  });

  it("uma descrição de cem espaços não é uma descrição", () => {
    expect(campos(validarPasso(3, completo({ descricao: " ".repeat(120) }), m))).toEqual([
      "descricao",
    ]);
  });

  it("espaços em branco não contam como resposta em nenhum campo de texto", () => {
    for (const campo of CAMPOS.filter((c) => c.tipo === "texto")) {
      const base = completo({ [campo.chave]: "   " } as Partial<FormData>);
      expect(campos(validarPasso(campo.passo, base, m)), campo.id).toContain(campo.id);
    }
  });

  it("sem Livro Azul não se passa do passo 2, e sem três fotografias não se passa do 3", () => {
    expect(campos(validarPasso(2, { ...completo(), documentos: {} }, m))).toEqual(["livro_azul"]);
    expect(campos(validarPasso(3, { ...completo(), imagens: [imagem(1), imagem(2)] }, m))).toEqual([
      "fotografias",
    ]);
  });

  it("sem os termos não se paga", () => {
    expect(campos(validarPasso(4, { ...completo(), termosAceites: false }, m))).toEqual([
      "termos_aceites",
    ]);
  });
});

describe("a ordem do resumo é a ordem da página", () => {
  it("os anexos aparecem no sítio onde estão no ecrã, não no fim", () => {
    // Um resumo cuja ordem não é a do formulário manda quem o lê saltar para
    // cima e para baixo à procura — e com um passo desta altura, isso custa.
    const passo2 = campos(validarPasso(2, estado({}), m));
    const livro = passo2.indexOf("livro_azul");
    expect(livro).toBeGreaterThan(passo2.indexOf("coudelaria_origem"));
    expect(livro).toBeLessThan(passo2.indexOf("nivel_treino"));

    const passo3 = campos(validarPasso(3, estado({}), m));
    const fotos = passo3.indexOf("fotografias");
    expect(fotos).toBeGreaterThan(passo3.indexOf("motivo_venda"));
    expect(fotos).toBeLessThan(passo3.indexOf("descricao"));
  });
});

describe("as contas do progresso", () => {
  it("num formulário vazio, o que falta é tudo o que se pede", () => {
    const vazio = estado({});
    expect(faltamPorPasso(vazio, m)).toEqual(totalPorPasso(vazio));
    expect(feitosPorPasso(vazio, m)).toEqual([0, 0, 0, 0]);
  });

  it("num formulário completo, não falta nada e está tudo feito", () => {
    const cheio = completo();
    expect(faltamPorPasso(cheio, m)).toEqual([0, 0, 0, 0]);
    expect(feitosPorPasso(cheio, m)).toEqual(totalPorPasso(cheio));
  });

  it("feitos mais faltam dá o total, em cada passo e em qualquer estado", () => {
    // É esta identidade que garante que o «faltam 7» do botão e o «12 / 19» do
    // cabeçalho da secção nunca discordam: saem da mesma conta.
    const meio = estado({
      proprietario_nome: "Maria",
      proprietario_email: "maria@exemplo.pt",
      nome: "Zíngaro",
      sexo: "Garanhão",
      negociavel: "nao",
      disciplinas: ["Dressage"],
    });
    const total = totalPorPasso(meio);
    const faltam = faltamPorPasso(meio, m);
    const feitos = feitosPorPasso(meio, m);
    for (let i = 0; i < 4; i++) expect(feitos[i] + faltam[i]).toBe(total[i]);
  });

  it("a conta do formulário vazio é a medida, e não encolhe em silêncio", () => {
    // 27 + 47 + 20 + 1. Um particular, com uma égua, sem trial. A medição está
    // no relatório; este teste é o que impede que os portões desapareçam sem
    // que alguém dê por isso.
    expect(faltamPorPasso(estado({}), m)).toEqual([27, 47, 20, 1]);
    expect(quantosFaltam(1, estado({}), m)).toBe(27);
  });
});
