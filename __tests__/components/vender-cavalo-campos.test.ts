import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  CAMPOS,
  CAMPOS_VOLUNTARIOS,
  contarSeccao,
  eExigido,
  estaPreenchido,
} from "@/components/vender-cavalo/campos";
import { initialFormData } from "@/components/vender-cavalo/data";
import type { FormData } from "@/components/vender-cavalo/types";

/**
 * O catálogo tem de descrever o formulário que existe.
 *
 * O defeito que este ficheiro persegue é o que a `campos.ts` descreve na
 * cabeça e que só aparece quando **tudo** é obrigatório: um campo exigido que
 * o formulário não desenha **tranca o anúncio**. Quem lá chegar carrega em
 * Continuar, lê «falta responder: Peso», carrega na linha do resumo para ir ao
 * campo — e não há campo nenhum onde ir. Não há saída, e não há erro em lado
 * nenhum: compila, passa o `tsc`, e o vendedor fica trancado fora do próprio
 * anúncio.
 *
 * Enquanto vinte campos eram obrigatórios isto era improvável; com noventa e
 * oito e quatro condições, é a falha mais provável de todas. A leitura é do
 * texto dos ficheiros, como em `campos-do-anuncio.test.ts` e pela mesma razão:
 * não há tipo nenhum que ligue um `id` de JSX a uma entrada de uma tabela.
 */

const RAIZ = path.resolve(__dirname, "../..");

const PASSOS: Record<number, string[]> = {
  1: [
    "components/vender-cavalo/StepProprietario.tsx",
    "components/vender-cavalo/StepIdentificacao.tsx",
  ],
  2: ["components/vender-cavalo/StepLinhagem.tsx", "components/vender-cavalo/StepTreinoSaude.tsx"],
  3: ["components/vender-cavalo/StepPrecoApresentacao.tsx"],
};

function ler(relativo: string): string {
  return fs.readFileSync(path.join(RAIZ, relativo), "utf8");
}

/**
 * Os `id` que um passo desenha.
 *
 * Três formas contam, e as três levam o resumo de erros até ao campo: o
 * `id="…"` literal de um `<input>` ou de uma `<Seleccao>`, o `data-campo="…"`
 * de um bloco que não tem elemento focável próprio (as pastilhas, o anexo), e
 * o `pergunta("…", …)` / `id="…"` de um `<SimNao>`, que põe o `id` no texto da
 * pergunta.
 */
function idsDoPasso(passo: number): Set<string> {
  const ids = new Set<string>();
  for (const ficheiro of PASSOS[passo]) {
    const fonte = ler(ficheiro);
    for (const m of fonte.matchAll(/\bid="([a-z_0-9]+)"/g)) ids.add(m[1]);
    for (const m of fonte.matchAll(/\bdata-campo="([a-z_0-9]+)"/g)) ids.add(m[1]);
    // `{pergunta("habituado_ferrador", …)}` e `{garanhao && pergunta("…", …)}`
    for (const m of fonte.matchAll(/\bpergunta\(\s*"([a-z_0-9]+)"/g)) ids.add(m[1]);
    // Os oito campos dos avós saem de uma tabela: `nome: "avo_paterno_nome"`.
    for (const m of fonte.matchAll(/\b(?:nome|registo):\s*"([a-z_0-9]+)"/g)) ids.add(m[1]);
  }
  return ids;
}

describe("o catálogo e o formulário dizem a mesma coisa", () => {
  it("todo o campo exigido está desenhado no passo que o catálogo lhe dá", () => {
    // Sem isto, um campo exigido e não desenhado tranca o formulário para
    // sempre e sem sintoma nenhum a não ser um vendedor que desiste.
    const semEcra: string[] = [];
    for (const campo of CAMPOS) {
      if (!idsDoPasso(campo.passo).has(campo.id))
        semEcra.push(`${campo.id} (passo ${campo.passo})`);
    }
    expect(
      semEcra,
      "campos que a validação exige e que nenhum passo desenha — trancam o formulário"
    ).toEqual([]);
  });

  it("cada campo do catálogo aparece uma vez só, e num passo só", () => {
    const vistos = new Map<string, number>();
    for (const campo of CAMPOS) vistos.set(campo.id, (vistos.get(campo.id) ?? 0) + 1);
    expect([...vistos].filter(([, n]) => n > 1).map(([id]) => id)).toEqual([]);
  });

  it("os `id` do catálogo são chaves reais de FormData", () => {
    const chaves = new Set(Object.keys(initialFormData));
    expect(CAMPOS.filter((c) => !chaves.has(c.chave)).map((c) => c.chave)).toEqual([]);
  });

  it("os noventa e nove campos estão repartidos entre exigidos e a lista dos voluntários", () => {
    // A conta que o dono do site quer ver: dos noventa e nove, noventa e oito
    // são obrigatórios e um — o nome do veterinário — não é, com a razão
    // escrita ao lado dele.
    const noCatalogo = new Set(CAMPOS.map((c) => c.chave));
    const voluntarios = new Set(CAMPOS_VOLUNTARIOS);
    const orfaos = Object.keys(initialFormData).filter(
      (k) => !noCatalogo.has(k as keyof FormData) && !voluntarios.has(k as keyof FormData)
    );
    expect(orfaos, "campos de FormData que ninguém exige nem declarou voluntários").toEqual([]);
    expect(CAMPOS.length).toBe(98);
    expect(Object.keys(initialFormData).length).toBe(99);
  });

  it("as secções de cada passo são contíguas", () => {
    // A ordem do catálogo é a ordem do resumo de erros, e é dela que sai o
    // sítio onde os anexos entram nessa lista. Com uma secção partida em duas,
    // o Livro Azul aparecia no meio da linhagem.
    for (const passo of [1, 2, 3]) {
      const seccoes = CAMPOS.filter((c) => c.passo === passo).map((c) => c.seccao);
      const compactadas = seccoes.filter((s, i) => s !== seccoes[i - 1]);
      expect(new Set(compactadas).size, `passo ${passo}`).toBe(compactadas.length);
    }
  });

  it("nenhum campo condicional depende de si próprio", () => {
    // Um campo cuja condição lê o seu próprio valor nunca poderia ser
    // preenchido: não é exigido enquanto estiver vazio, e por isso não é
    // desenhado, e por isso fica vazio.
    for (const campo of CAMPOS) {
      if (!campo.exigidoQuando) continue;
      const vazio = { ...initialFormData };
      const comValor = { ...initialFormData, [campo.chave]: "preenchido" };
      expect(campo.exigidoQuando(vazio), `${campo.id} depende de si próprio`).toBe(
        campo.exigidoQuando(comValor)
      );
    }
  });
});

describe("o que conta como resposta", () => {
  it("uma pergunta de sim ou não respondida com «não» está respondida", () => {
    const campo = CAMPOS.find((c) => c.chave === "apto_criancas")!;
    expect(estaPreenchido(campo, { ...initialFormData, apto_criancas: "" })).toBe(false);
    expect(estaPreenchido(campo, { ...initialFormData, apto_criancas: "nao" })).toBe(true);
    expect(estaPreenchido(campo, { ...initialFormData, apto_criancas: "sim" })).toBe(true);
  });

  it("uma lista vazia não é resposta e uma escolha chega", () => {
    const campo = CAMPOS.find((c) => c.chave === "disciplinas")!;
    expect(estaPreenchido(campo, { ...initialFormData, disciplinas: [] })).toBe(false);
    expect(estaPreenchido(campo, { ...initialFormData, disciplinas: ["Dressage"] })).toBe(true);
  });

  it("só espaços não é resposta", () => {
    const campo = CAMPOS.find((c) => c.chave === "nome")!;
    expect(estaPreenchido(campo, { ...initialFormData, nome: "   " })).toBe(false);
  });
});

describe("a conta de uma secção", () => {
  it("num formulário vazio, nada está feito", () => {
    const { feitos, total } = contarSeccao("contacto", initialFormData);
    expect(feitos).toBe(0);
    expect(total).toBe(3);
  });

  it("cresce à medida que se responde", () => {
    const meio = { ...initialFormData, proprietario_nome: "Maria", proprietario_telefone: "912" };
    expect(contarSeccao("contacto", meio)).toEqual({ feitos: 2, total: 3 });
  });

  it("o total encolhe quando um campo condicional deixa de ser exigido", () => {
    // A conta do cabeçalho segue as mesmas condições que a validação: dizer a
    // um particular que a facturação tem seis perguntas quando lhe faz cinco é
    // mentir-lhe sobre o caminho que falta.
    const particular = { ...initialFormData, tipo_proprietario: "Particular" };
    const coudelaria = { ...initialFormData, tipo_proprietario: "Coudelaria" };
    expect(contarSeccao("facturacao", coudelaria).total).toBe(
      contarSeccao("facturacao", particular).total + 1
    );
  });

  it("a soma das secções de um passo é o número de campos exigidos nele", () => {
    for (const passo of [1, 2, 3]) {
      const seccoes = [...new Set(CAMPOS.filter((c) => c.passo === passo).map((c) => c.seccao))];
      const somaSeccoes = seccoes.reduce((a, s) => a + contarSeccao(s, initialFormData).total, 0);
      const doPasso = CAMPOS.filter(
        (c) => c.passo === passo && eExigido(c, initialFormData)
      ).length;
      expect(somaSeccoes, `passo ${passo}`).toBe(doPasso);
    }
  });
});
