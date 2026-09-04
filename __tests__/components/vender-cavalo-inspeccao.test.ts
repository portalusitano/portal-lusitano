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

/**
 * As frases não interessam: interessa o nível e o campo.
 *
 * Cada chave devolve **a mesma** função de cada vez que é lida, e é isso que
 * permite comparar uma frase que a inspecção usou como valor — `m.dataNoFuturo`
 * — com a chave que a produziu. Sem a cache, cada leitura dava uma função nova
 * e a comparação nunca podia bater certo.
 */
const cacheDeFrases = new Map<string, unknown>();
const m = new Proxy({} as MensagensInspeccao, {
  get: (_alvo, chave) => {
    const nome = String(chave);
    if (!cacheDeFrases.has(nome)) {
      cacheDeFrases.set(nome, (arg?: unknown) =>
        arg === undefined ? nome : `${nome}:${String(arg)}`
      );
    }
    return cacheDeFrases.get(nome);
  },
}) as unknown as MensagensInspeccao;

/** A chave que produziu esta frase, seja ela usada como valor ou chamada. */
const chaveDaFrase = (mensagem: unknown): string => {
  for (const [nome, fn] of cacheDeFrases) if (fn === mensagem) return nome;
  return String(mensagem);
};

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

describe("um formulário a que faltam campos não rebenta", () => {
  it("um rascunho de uma versão anterior não tem os campos que ela não pedia", () => {
    // O rascunho é reposto com `{ ...initialFormData, ...guardado }`, e é o
    // guardado que manda nas chaves que tem. Ler `.trim()` de um `undefined`
    // rebentava no `useMemo` da inspecção — que corre a cada tecla — e a
    // página nem chegava a aparecer.
    const incompleto = { nome: "Zíngaro", preco: "25000" } as unknown as FormData;
    expect(() => inspeccionar(incompleto, m)).not.toThrow();
    expect(inspeccionar(incompleto, m)).toEqual([]);
  });

  it("e os campos que lá estão continuam a ser lidos", () => {
    const incompleto = { altura: "193" } as unknown as FormData;
    expect(nivel(inspeccionar(incompleto, m), "altura")).toBe("aviso");
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

// ---------------------------------------------------------------------------
// As regras que chegaram com «tudo obrigatório»
//
// Não são enfeite. Um campo que passa a obrigatório passa a ser preenchido por
// toda a gente, incluindo por quem não tem a resposta à mão — e o campo que
// dantes ficava em branco passa a receber um palpite. Estas regras são o que
// apanha o palpite, e todas usam ou uma fonte a sério ou aquilo que o próprio
// formulário já sabe.
// ---------------------------------------------------------------------------

describe("o passaporte equino, pelo UELN", () => {
  // UELN: 15 caracteres em três blocos — 3 do país (ISO 3166-1 numérico), 3 da
  // base de dados e 9 do animal. Ver `passaporte-ueln.ts` para a fonte.
  it("um UELN bem formado não é apontado", () => {
    expect(de(ver({ passaporte_equino: "620015004471234" }), "passaporte_equino")).toEqual([]);
  });

  it("aceita o número tal como está impresso, com espaços e traços", () => {
    expect(de(ver({ passaporte_equino: "620 015 004471234" }), "passaporte_equino")).toEqual([]);
    expect(de(ver({ passaporte_equino: "620-015-004471234" }), "passaporte_equino")).toEqual([]);
  });

  it("um número curto ou longo leva um aviso, e diz quantos faltam", () => {
    const curto = de(ver({ passaporte_equino: "620015" }), "passaporte_equino");
    expect(curto[0].nivel).toBe("aviso");
    expect(curto[0].mensagem).toBe("passaporteComprimento:9");
    const longo = de(ver({ passaporte_equino: "6200150044712345678" }), "passaporte_equino");
    expect(longo[0].mensagem).toBe("passaporteComprimento:-4");
  });

  it("um bloco de país que não são algarismos leva um aviso", () => {
    const a = de(ver({ passaporte_equino: "PTA015004471234" }), "passaporte_equino");
    expect(a[0].nivel).toBe("aviso");
    expect(chaveDaFrase(a[0].mensagem)).toBe("passaportePaisNaoNumerico");
  });

  it("nunca é erro, e por isso nunca trava o passo", () => {
    // Um cavalo nascido antes de o UELN ser exigido tem um passaporte com
    // outro número, e recusá-lo era impedir de publicar os cavalos mais
    // velhos — que são precisamente os que já têm carreira feita.
    for (const valor of ["620015", "PTA015004471234", "qualquer coisa"]) {
      expect(nivel(ver({ passaporte_equino: valor }), "passaporte_equino")).not.toBe("erro");
    }
    expect(errosDeInspeccao(1, ver({ passaporte_equino: "620015" }))).toEqual([]);
  });
});

describe("as datas de saúde contra o calendário", () => {
  const hoje = new Date("2026-09-04T12:00:00Z");
  const vejo = (parcial: Partial<FormData>) => ver(parcial, { hoje });

  it("uma data que ainda não chegou é apontada", () => {
    for (const campo of [
      "data_ultima_vacinacao",
      "data_ultima_desparasitacao",
      "data_ultima_ferragem",
    ] as const) {
      const a = de(vejo({ [campo]: "2027-01-01" }), campo);
      expect(chaveDaFrase(a[0]?.mensagem), campo).toBe("dataNoFuturo");
      expect(a[0]?.nivel, campo).toBe("aviso");
    }
  });

  it("uma data anterior ao nascimento do cavalo é apontada", () => {
    // Não se vacina um cavalo antes de ele existir. É o formulário a
    // contradizer-se a si próprio, com dois campos que já lá estavam.
    const a = de(
      vejo({ data_nascimento: "2019-04-12", data_ultima_vacinacao: "2015-06-01" }),
      "data_ultima_vacinacao"
    );
    expect(chaveDaFrase(a[0].mensagem)).toBe("dataAntesDeNascer");
  });

  it("«a vacinação está em dia» com a última há três anos é uma das duas respostas errada", () => {
    // O reforço da gripe equina e do tétano é anual.
    const a = de(
      vejo({ vacinacao_atualizada: "sim", data_ultima_vacinacao: "2023-06-01" }),
      "data_ultima_vacinacao"
    );
    expect(a[0].nivel).toBe("aviso");
    expect(a[0].mensagem).toMatch(/^vacinacaoDesactualizada:/);
  });

  it("mas com a última há três meses não diz nada", () => {
    expect(
      de(
        vejo({ vacinacao_atualizada: "sim", data_ultima_vacinacao: "2026-06-01" }),
        "data_ultima_vacinacao"
      )
    ).toEqual([]);
  });

  it("quem respondeu «não está em dia» não é contrariado pela data", () => {
    // Não há contradição nenhuma: a resposta e a data dizem a mesma coisa.
    expect(
      de(
        vejo({ vacinacao_atualizada: "nao", data_ultima_vacinacao: "2022-06-01" }),
        "data_ultima_vacinacao"
      )
    ).toEqual([]);
  });

  it("a desparasitação segue a mesma regra", () => {
    expect(
      de(
        vejo({ desparasitacao_atualizada: "sim", data_ultima_desparasitacao: "2024-01-01" }),
        "data_ultima_desparasitacao"
      )[0].mensagem
    ).toMatch(/^desparasitacaoDesactualizada:/);
  });

  it("a ferragem não precisa de um «está em dia» ao lado — o ciclo do casco corre na mesma", () => {
    // Seis a oito semanas, e vale também para o cavalo descalço, que é
    // aparado. Não há campo de sim/não para a ferragem: a data sozinha chega.
    const a = de(vejo({ data_ultima_ferragem: "2025-06-01" }), "data_ultima_ferragem");
    expect(a[0].mensagem).toMatch(/^ferragemAntiga:/);
    expect(de(vejo({ data_ultima_ferragem: "2026-08-01" }), "data_ultima_ferragem")).toEqual([]);
  });

  it("nenhuma destas trava um passo", () => {
    const tudo = vejo({
      data_nascimento: "2019-04-12",
      vacinacao_atualizada: "sim",
      data_ultima_vacinacao: "2021-01-01",
      data_ultima_ferragem: "2027-01-01",
    });
    expect(tudo.every((a) => a.nivel !== "erro")).toBe(true);
    expect(errosDeInspeccao(2, tudo)).toEqual([]);
  });
});

describe("os anos de treino contra a idade", () => {
  const hoje = new Date("2026-09-04T12:00:00Z");

  it("um cavalo não pode ter treinado mais anos do que viveu", () => {
    const a = de(
      ver({ data_nascimento: "2021-04-12", anos_treino: "12" }, { hoje }),
      "anos_treino"
    );
    expect(a[0].nivel).toBe("aviso");
    expect(a[0].mensagem).toBe("treinoMaisAnosDoQueIdade:12");
  });

  it("cinco anos de treino num cavalo de doze não diz nada", () => {
    expect(
      de(ver({ data_nascimento: "2014-04-12", anos_treino: "5" }, { hoje }), "anos_treino")
    ).toEqual([]);
  });

  it("sem data de nascimento não se inventa a comparação", () => {
    expect(de(ver({ anos_treino: "30" }, { hoje }), "anos_treino")).toEqual([]);
  });

  it("fica em aviso e não em erro, porque o engano pode estar na data", () => {
    // Travar o passo em «anos de treino» quando quem se enganou foi no ano de
    // nascimento manda a pessoa corrigir o campo que estava certo.
    expect(
      errosDeInspeccao(2, ver({ data_nascimento: "2021-04-12", anos_treino: "12" }, { hoje }))
    ).toEqual([]);
  });
});
