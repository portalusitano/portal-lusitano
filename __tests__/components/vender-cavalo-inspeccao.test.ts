import { describe, it, expect } from "vitest";
import {
  errosDeInspeccao,
  idadeEmAnos,
  indiceNivelTreino,
  inspeccionar,
  maosParaCentimetros,
  porCampoApontamentos,
  type Apontamento,
  type MensagensInspeccao,
} from "@/components/vender-cavalo/inspeccao";
import { initialFormData } from "@/components/vender-cavalo/data";
import type { FormData } from "@/components/vender-cavalo/types";

/** As frases não interessam: interessa o nível e o campo. */
const m = new Proxy({} as MensagensInspeccao, {
  get: (_alvo, chave) => {
    const nome = String(chave);
    return (arg?: unknown) => (arg === undefined ? nome : `${nome}:${String(arg)}`);
  },
}) as unknown as MensagensInspeccao;

const forma = (parcial: Partial<FormData>): FormData => ({ ...initialFormData, ...parcial });

const ver = (parcial: Partial<FormData>, contexto = {}) =>
  inspeccionar(forma(parcial), m, contexto);

const de = (apontamentos: Apontamento[], campo: string) =>
  apontamentos.filter((a) => a.campo === campo);

const nivel = (apontamentos: Apontamento[], campo: string) => de(apontamentos, campo)[0]?.nivel;

describe("um formulário vazio não tem nada a dizer", () => {
  it("nenhum campo por preencher é apontado", () => {
    // Quem ainda não escreveu não se engana. O que falta é assunto da
    // validação, não da inspecção.
    expect(inspeccionar(initialFormData, m)).toEqual([]);
  });
});

describe("microchip", () => {
  it("um chip válido passa em silêncio", () => {
    expect(de(ver({ microchip: "620098100123456" }), "microchip")).toEqual([]);
  });

  it("um chip mal formado impede — o que ficaria guardado era lixo", () => {
    expect(nivel(ver({ microchip: "62009810012" }), "microchip")).toBe("erro");
    expect(nivel(ver({ microchip: "PT620098100123456" }), "microchip")).toBe("erro");
    expect(nivel(ver({ microchip: "000098100123456" }), "microchip")).toBe("erro");
  });
});

describe("NIF", () => {
  it("um dígito de controlo que não fecha impede", () => {
    expect(nivel(ver({ proprietario_nif: "123456788" }), "proprietario_nif")).toBe("erro");
  });

  it("o tipo de contribuinte casa, ou não, com o tipo de vendedor", () => {
    // Uma coudelaria com NIF de pessoa singular não é impossível — é o
    // empresário em nome individual —, por isso pergunta-se e não se recusa.
    expect(
      nivel(
        ver({ proprietario_nif: "123456789", tipo_proprietario: "Coudelaria" }),
        "proprietario_nif"
      )
    ).toBe("aviso");
    expect(
      nivel(
        ver({ proprietario_nif: "501234560", tipo_proprietario: "Particular" }),
        "proprietario_nif"
      )
    ).toBe("aviso");
  });

  it("quando os dois batem certo, cala-se", () => {
    expect(
      de(
        ver({ proprietario_nif: "501234560", tipo_proprietario: "Coudelaria" }),
        "proprietario_nif"
      )
    ).toEqual([]);
    expect(
      de(
        ver({ proprietario_nif: "123456789", tipo_proprietario: "Particular" }),
        "proprietario_nif"
      )
    ).toEqual([]);
  });

  it("sem tipo de vendedor escolhido não se pergunta nada sobre o par", () => {
    expect(de(ver({ proprietario_nif: "501234560" }), "proprietario_nif")).toEqual([]);
  });
});

describe("telefone", () => {
  it("a regra portuguesa aplica-se a quem vive em Portugal", () => {
    expect(nivel(ver({ proprietario_telefone: "952345678" }), "proprietario_telefone")).toBe(
      "erro"
    );
    expect(de(ver({ proprietario_telefone: "912345678" }), "proprietario_telefone")).toEqual([]);
  });

  it("a quem vive noutro país não se aplica a numeração portuguesa", () => {
    // Recusar um número francês por não ser português custa um anúncio e não
    // impede engano nenhum.
    const franca = { pais_proprietario: "França", proprietario_telefone: "+33 6 12 34 56 78" };
    expect(de(ver(franca), "proprietario_telefone")).toEqual([]);
  });

  it("mas o mínimo internacional continua a valer", () => {
    expect(
      nivel(
        ver({ pais_proprietario: "França", proprietario_telefone: "123" }),
        "proprietario_telefone"
      )
    ).toBe("erro");
  });

  it("o WhatsApp segue a mesma regra do telefone", () => {
    expect(nivel(ver({ proprietario_whatsapp: "952345678" }), "proprietario_whatsapp")).toBe(
      "erro"
    );
  });
});

describe("email", () => {
  it("uma gralha no domínio é sugestão, nunca recusa, e traz a correcção", () => {
    const [apontamento] = de(ver({ proprietario_email: "maria@gmial.com" }), "proprietario_email");
    expect(apontamento.nivel).toBe("sugestao");
    expect(apontamento.correccao).toBe("maria@gmail.com");
  });

  it("um domínio raro fica em paz", () => {
    expect(
      de(ver({ proprietario_email: "geral@coudelariaalter.pt" }), "proprietario_email")
    ).toEqual([]);
  });
});

describe("altura", () => {
  it("a janela habitual do Lusitano adulto é pergunta, não recusa", () => {
    expect(nivel(ver({ altura: "193" }), "altura")).toBe("aviso");
    expect(nivel(ver({ altura: "142" }), "altura")).toBe("aviso");
    expect(de(ver({ altura: "163" }), "altura")).toEqual([]);
  });

  it("mãos convertem-se para centímetros e propõem-se com um clique", () => {
    // `16.2` são dezasseis mãos e duas polegadas: 16×10,16 + 2×2,54 = 167,6.
    const [apontamento] = de(ver({ altura: "16.2" }), "altura");
    expect(apontamento.nivel).toBe("sugestao");
    expect(apontamento.correccao).toBe("168");
    expect(maosParaCentimetros(16)).toBe(163);
    expect(maosParaCentimetros(15.3)).toBe(160);
  });

  it("a parte decimal são polegadas, e por isso nunca passa de três", () => {
    expect(maosParaCentimetros(16.5)).toBeNull();
  });

  it("fora do que é um cavalo em centímetros, impede", () => {
    expect(nivel(ver({ altura: "1630" }), "altura")).toBe("erro");
    expect(nivel(ver({ altura: "1.63" }), "altura")).toBe("erro");
  });
});

describe("peso", () => {
  it("400–650kg é o habitual; fora disso pergunta-se", () => {
    expect(de(ver({ peso: "520" }), "peso")).toEqual([]);
    expect(nivel(ver({ peso: "700" }), "peso")).toBe("aviso");
  });

  it("um peso que não é de um cavalo impede", () => {
    expect(nivel(ver({ peso: "5200" }), "peso")).toBe("erro");
  });
});

describe("preço", () => {
  it("um valor baixo de mais propõe o zero que falta", () => {
    const [apontamento] = de(ver({ preco: "800" }), "preco");
    expect(apontamento.nivel).toBe("sugestao");
    expect(apontamento.correccao).toBe("8000");
  });

  it("um preço baixo mas plausível é pergunta, sem correcção", () => {
    const [apontamento] = de(ver({ preco: "2000" }), "preco");
    expect(apontamento.nivel).toBe("aviso");
    expect(apontamento.correccao).toBeUndefined();
  });

  it("um preço normal passa em silêncio", () => {
    expect(de(ver({ preco: "25000" }), "preco")).toEqual([]);
  });

  it("zeros a mais também se perguntam", () => {
    expect(nivel(ver({ preco: "2500000" }), "preco")).toBe("aviso");
  });

  it("o zero e o vazio são assunto da validação, não desta camada", () => {
    expect(de(ver({ preco: "0" }), "preco")).toEqual([]);
    expect(de(ver({ preco: "" }), "preco")).toEqual([]);
  });
});

describe("pontuação morfológica APSL", () => {
  it("fora da escala é erro; fora do habitual é pergunta", () => {
    expect(nivel(ver({ nivel_apsl: "140 pontos" }), "nivel_apsl")).toBe("erro");
    expect(nivel(ver({ nivel_apsl: "45 pontos" }), "nivel_apsl")).toBe("aviso");
    expect(de(ver({ nivel_apsl: "78.5 pontos — Muito Bom" }), "nivel_apsl")).toEqual([]);
  });

  it("um texto sem número nenhum não é apontado", () => {
    expect(de(ver({ nivel_apsl: "Muito Bom" }), "nivel_apsl")).toEqual([]);
  });
});

describe("número de registo", () => {
  it("o nome do cavalo na caixa do registo impede", () => {
    expect(nivel(ver({ nome: "Zíngaro", numero_registo: "Zíngaro" }), "numero_registo")).toBe(
      "erro"
    );
  });

  it("um duplicado vem de fora e é pergunta, não recusa", () => {
    // Não é impossível haver dois anúncios do mesmo cavalo — pode ser uma
    // republicação —, por isso avisa-se e deixa-se passar.
    const apontamentos = ver({ numero_registo: "PSL-2019-4471" }, { registoDuplicado: true });
    expect(nivel(apontamentos, "numero_registo")).toBe("aviso");
  });

  it("sem duplicado, um número plausível passa em silêncio", () => {
    expect(de(ver({ numero_registo: "PSL-2019-4471" }), "numero_registo")).toEqual([]);
  });
});

describe("vídeos", () => {
  it("um endereço do YouTube ou do Vimeo passa", () => {
    expect(de(ver({ videos_url: "https://youtu.be/dQw4w9WgXcQ" }), "videos_url")).toEqual([]);
    expect(de(ver({ videos_url_2: "https://vimeo.com/347119375" }), "videos_url_2")).toEqual([]);
  });

  it("outra coisa é aviso — fica como ligação e não como vídeo", () => {
    expect(nivel(ver({ videos_url: "https://drive.google.com/x" }), "videos_url")).toBe("aviso");
  });
});

describe("a idade contra o nível de treino", () => {
  const hoje = new Date("2026-09-01T12:00:00Z");
  const comIdade = (nascimento: string, nivelTreino: string) =>
    inspeccionar(forma({ data_nascimento: nascimento, nivel_treino: nivelTreino }), m, { hoje });

  it("um cavalo de dois anos não está desbravado", () => {
    expect(nivel(comIdade("2024-04-12", "Desbravado"), "nivel_treino")).toBe("aviso");
  });

  it("Alta Escola aos quatro anos é cedo de mais", () => {
    expect(nivel(comIdade("2022-04-12", "Alta Escola"), "nivel_treino")).toBe("aviso");
    expect(nivel(comIdade("2022-04-12", "Competição"), "nivel_treino")).toBe("aviso");
  });

  it("Alta Escola aos doze anos é o esperado", () => {
    expect(de(comIdade("2014-04-12", "Alta Escola"), "nivel_treino")).toEqual([]);
  });

  it("um cavalo de doze anos ainda sem desbaste é raro o bastante para se perguntar", () => {
    expect(nivel(comIdade("2014-04-12", "Potro (sem desbaste)"), "nivel_treino")).toBe("aviso");
  });

  it("um potro de dois anos sem desbaste é o normal", () => {
    expect(de(comIdade("2024-04-12", "Potro (sem desbaste)"), "nivel_treino")).toEqual([]);
  });

  it("a coerência não depende da língua em que o nível foi escolhido", () => {
    // O nível é guardado como texto na língua em que foi escolhido; comparar
    // com «Alta Escola» só funcionaria em português.
    expect(nivel(comIdade("2022-04-12", "High School"), "nivel_treino")).toBe("aviso");
    expect(nivel(comIdade("2022-04-12", "Alta Escuela"), "nivel_treino")).toBe("aviso");
    expect(indiceNivelTreino("Competición")).toBe(indiceNivelTreino("Competição"));
    expect(indiceNivelTreino("nível que não existe")).toBe(-1);
  });

  it("sem data ou sem nível não há nada a comparar", () => {
    expect(de(comIdade("", "Alta Escola"), "nivel_treino")).toEqual([]);
    expect(de(comIdade("2022-04-12", ""), "nivel_treino")).toEqual([]);
  });

  it("a idade conta o aniversário que ainda não chegou", () => {
    expect(idadeEmAnos("2020-12-31", hoje)).toBe(5);
    expect(idadeEmAnos("2020-01-01", hoje)).toBe(6);
    expect(idadeEmAnos("", hoje)).toBeNull();
    expect(idadeEmAnos("não é uma data", hoje)).toBeNull();
  });
});

describe("que erros travam que passo", () => {
  it("um erro de inspecção trava o passo onde o campo vive", () => {
    // Sem isto bastava não sair do campo para publicar um microchip de
    // catorze algarismos.
    const apontamentos = ver({ microchip: "62009810012" });
    expect(errosDeInspeccao(1, apontamentos)).toEqual([
      { campo: "microchip", mensagem: "microchipComprimento:4" },
    ]);
    expect(errosDeInspeccao(2, apontamentos)).toEqual([]);
  });

  it("um aviso nunca trava passo nenhum", () => {
    const apontamentos = ver({ altura: "193" });
    expect(nivel(apontamentos, "altura")).toBe("aviso");
    for (const passo of [1, 2, 3, 4]) expect(errosDeInspeccao(passo, apontamentos)).toEqual([]);
  });

  it("uma sugestão também não trava nada", () => {
    const apontamentos = ver({ preco: "800" });
    for (const passo of [1, 2, 3, 4]) expect(errosDeInspeccao(passo, apontamentos)).toEqual([]);
  });

  it("o preço e os vídeos travam o passo 3, o nível de treino o 2", () => {
    expect(errosDeInspeccao(3, ver({ videos_url: "x" }))).toEqual([]);
    expect(errosDeInspeccao(2, ver({ nivel_apsl: "140" }))).toEqual([]);
    expect(errosDeInspeccao(1, ver({ nivel_apsl: "140" }))).toHaveLength(1);
  });
});

describe("agrupamento por campo", () => {
  it("mantém a ordem em que os apontamentos foram encontrados", () => {
    const agrupado = porCampoApontamentos([
      { campo: "a", nivel: "aviso", mensagem: "1" },
      { campo: "b", nivel: "erro", mensagem: "2" },
      { campo: "a", nivel: "sugestao", mensagem: "3" },
    ]);
    expect(agrupado.a.map((x) => x.mensagem)).toEqual(["1", "3"]);
    expect(agrupado.b).toHaveLength(1);
  });
});
