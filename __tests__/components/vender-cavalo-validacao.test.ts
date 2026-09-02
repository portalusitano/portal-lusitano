import { describe, it, expect } from "vitest";
import {
  validarPasso,
  type EstadoFormulario,
  type MensagensValidacao,
} from "@/components/vender-cavalo/validacao";
import { initialFormData } from "@/components/vender-cavalo/data";
import type { FormData } from "@/components/vender-cavalo/types";

/** As frases não interessam aqui — interessa haver uma, e ela saber de que
 *  campo é. Usa-se o nome da chave como texto para as distinguir nos erros. */
const m = new Proxy({} as MensagensValidacao, {
  get: (_alvo, chave) => String(chave),
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

const campos = (erros: { campo: string }[]) => erros.map((e) => e.campo).sort();

/** Um passo 1 que passa. É a partir dele que se tira um campo de cada vez. */
const passo1Completo: Partial<FormData> = {
  proprietario_nome: "Maria Ferreira",
  proprietario_email: "maria@exemplo.pt",
  proprietario_telefone: "912345678",
  nome: "Zíngaro",
  numero_registo: "PSL-2019-4471",
  data_nascimento: "2019-04-12",
  sexo: "Égua",
  pelagem: "Ruço",
};

describe("passo 1 — contacto e identificação", () => {
  it("um formulário vazio acusa oito campos, e cada erro sabe onde mora", () => {
    const erros = validarPasso(1, estado({}), m);
    expect(campos(erros)).toEqual([
      "data_nascimento",
      "nome",
      "numero_registo",
      "pelagem",
      "proprietario_email",
      "proprietario_nome",
      "proprietario_telefone",
      "sexo",
    ]);
    // Cada `campo` tem de ser um `id` que existe no DOM — é o que permite ir
    // do erro até ao campo. Aqui garante-se ao menos que não vem vazio.
    expect(erros.every((e) => e.campo.length > 0 && e.mensagem.length > 0)).toBe(true);
  });

  it("com os oito preenchidos, passa", () => {
    expect(validarPasso(1, estado(passo1Completo), m)).toEqual([]);
  });

  it("o microchip e o nome de registo deixaram de travar o passo", () => {
    // Estavam ambos na lista de obrigatórios e ambos estão no Livro Azul, que
    // é anexado no passo seguinte. Pedir quinze dígitos copiados à mão de um
    // PDF que ainda não foi enviado é o campo mais caro do formulário.
    const erros = validarPasso(
      1,
      estado({ ...passo1Completo, microchip: "", nome_registo: "" }),
      m
    );
    expect(erros).toEqual([]);
  });

  it("uma gralha no email é apanhada aqui e não no fim", () => {
    const erros = validarPasso(
      1,
      estado({ ...passo1Completo, proprietario_email: "maria.exemplo.pt" }),
      m
    );
    expect(campos(erros)).toEqual(["proprietario_email"]);
    expect(erros[0].mensagem).toBe("emailInvalido");
  });

  it("aceita endereços com sinais que uma expressão esperta recusaria", () => {
    for (const email of ["maria+anuncios@exemplo.pt", "m.ferreira@sub.dominio.co.uk", "'a@b.io"]) {
      expect(validarPasso(1, estado({ ...passo1Completo, proprietario_email: email }), m)).toEqual(
        []
      );
    }
  });

  it("uma data de nascimento no futuro, ou de há cinquenta anos, é uma gralha no ano", () => {
    const futuro = new Date();
    futuro.setFullYear(futuro.getFullYear() + 1);
    const noFuturo = validarPasso(
      1,
      estado({ ...passo1Completo, data_nascimento: futuro.toISOString().slice(0, 10) }),
      m
    );
    expect(campos(noFuturo)).toEqual(["data_nascimento"]);
    const antigo = validarPasso(1, estado({ ...passo1Completo, data_nascimento: "1975-01-01" }), m);
    expect(campos(antigo)).toEqual(["data_nascimento"]);
  });

  it("espaços em branco não contam como resposta", () => {
    const erros = validarPasso(1, estado({ ...passo1Completo, nome: "   " }), m);
    expect(campos(erros)).toEqual(["nome"]);
  });
});

describe("passo 2 — linhagem, treino e saúde", () => {
  const completo = {
    formData: {
      ...initialFormData,
      pai_nome: "Ofensor",
      mae_nome: "Bailarina",
      nivel_treino: "Iniciado",
      estado_saude: "Bom",
    },
    documentos: { livroAzul: ficheiro("livro-azul.pdf") },
    imagens: [],
    termosAceites: false,
  };

  it("exige cinco coisas, e o Livro Azul é uma delas", () => {
    const erros = validarPasso(2, estado({}), m);
    expect(campos(erros)).toEqual([
      "estado_saude",
      "livro_azul",
      "mae_nome",
      "nivel_treino",
      "pai_nome",
    ]);
  });

  it("com as cinco, passa", () => {
    expect(validarPasso(2, completo, m)).toEqual([]);
  });

  it("os números de registo do pai e da mãe deixaram de travar o passo", () => {
    // Estão os dois no Livro Azul, que é obrigatório e vai anexado ao lado.
    expect(validarPasso(2, completo, m)).toEqual([]);
  });

  it("a vacinação deixou de ser uma caixa que é preciso mentir para passar", () => {
    // Era obrigatória: um cavalo com a vacinação em atraso não podia ser
    // anunciado de todo, e a única saída era declarar o que não era verdade.
    // Continua a ser perguntada; deixou de ser um portão.
    const semVacina = {
      ...completo,
      formData: { ...completo.formData, vacinacao_atualizada: false },
    };
    expect(validarPasso(2, semVacina, m)).toEqual([]);
  });
});

describe("passo 3 — preço e apresentação", () => {
  const base = {
    preco: "24500",
    regiao: "Santarém",
    localizacao: "Golegã",
    descricao: "x".repeat(100),
  };
  const tresFotos = [imagem(1), imagem(2), imagem(3)];

  it("exige cinco coisas", () => {
    const erros = validarPasso(3, estado({}), m);
    expect(campos(erros)).toEqual(["descricao", "fotografias", "localizacao", "preco", "regiao"]);
  });

  it("com preço, região, localidade, cem caracteres e três fotos, passa", () => {
    expect(validarPasso(3, estado(base, { imagens: tresFotos }), m)).toEqual([]);
  });

  it("duas fotografias não chegam, e o erro aponta às fotografias", () => {
    const erros = validarPasso(3, estado(base, { imagens: [imagem(1), imagem(2)] }), m);
    expect(campos(erros)).toEqual(["fotografias"]);
  });

  it("um preço de zero não é um preço", () => {
    const erros = validarPasso(3, estado({ ...base, preco: "0" }, { imagens: tresFotos }), m);
    expect(campos(erros)).toEqual(["preco"]);
    expect(erros[0].mensagem).toBe("precoInvalido");
  });

  it("uma descrição de cem espaços não é uma descrição", () => {
    const erros = validarPasso(
      3,
      estado({ ...base, descricao: " ".repeat(120) }, { imagens: tresFotos }),
      m
    );
    expect(campos(erros)).toEqual(["descricao"]);
  });
});

describe("passo 4 — termos", () => {
  it("sem os termos não se paga", () => {
    expect(campos(validarPasso(4, estado({}), m))).toEqual(["termos_aceites"]);
  });
  it("com os termos, passa", () => {
    expect(validarPasso(4, estado({}, { termosAceites: true }), m)).toEqual([]);
  });
});

describe("a conta dos portões", () => {
  it("são dezanove ao todo, contra os vinte e cinco de antes", () => {
    // 8 + 5 + 5 + 1. A medição está no relatório; este teste é o que impede
    // que voltem a entrar sem se dar por isso.
    const total = [1, 2, 3, 4]
      .map((p) => validarPasso(p, estado({}), m).length)
      .reduce((a, b) => a + b, 0);
    expect(total).toBe(19);
  });
});
