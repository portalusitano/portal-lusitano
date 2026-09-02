import { describe, it, expect } from "vitest";
import {
  texto,
  booleano,
  numero,
  inteiro,
  dataIso,
  lista,
  listaDeLinhas,
  grupo,
  lerGrupo,
  montarAscendentes,
  montarCamposDoFormulario,
} from "@/lib/anuncio-campos";

/**
 * O contrato entre o que o vendedor escreveu e a coluna que o recebe.
 *
 * Cada campo que passou a ser guardado tem aqui uma prova de que chega à coluna
 * certa **com a forma certa** — que é a metade que se parte em silêncio. As
 * três armadilhas conhecidas deste projecto estão cobertas uma a uma:
 *
 *  1. um `jsonb` que recebe uma string com JSON dentro em vez de um objecto;
 *  2. um `false` do vendedor tratado como «não respondeu»;
 *  3. uma string vazia mandada para uma coluna `date` ou `numeric`, que faz o
 *     `insert` inteiro falhar — depois de o dinheiro entrar.
 */

/** Um `form_data` completo, como o checkout o guarda. */
function payloadCompleto() {
  return {
    nomeCavalo: "Ulisses",
    dataNascimento: "2018-04-12",
    racaConfirmada: "Lusitano",
    nomeRegisto: "Ulisses do Vale",
    microchip: "620098100123456",
    passaporteEquino: "PT-2018-0042",
    paisNascimento: "Portugal",
    peso: "512,5",
    nivelApsl: "Ouro",
    provaAptidaoApsl: true,
    temperamento: "Dócil",
    coudelariaOrigem: "Coudelaria do Vale",
    corOlhos: "Castanho",
    corCrina: "Preta",
    corCasco: "Escuro",
    marcasDistintivas: "Estrela na testa",
    anosTreino: "7",
    nivelCavaleiro: "Intermédio",
    usoAtual: ["Lazer", "Competição"],
    premios: "Campeão Nacional, 2023",
    treinadorAtual: "João Silva",
    gineteHabitual: "Maria Costa",
    competicoes: "CDN Golegã 2023",
    habituadoTransporte: true,
    habituadoFerrador: true,
    habituadoVeterinario: true,
    trabalhaEmGrupo: false,
    trabalhaSolto: true,
    trabalhaAMao: true,
    habituadoCampo: true,
    aptoCriancas: false,
    regimeEstabulacao: "Box com paddock",
    tipoAlimentacao: "Ração e feno",
    horasTrabalhoSemana: "8",
    testeDnaRealizado: true,
    seguroEquino: false,
    estadoSaude: "Excelente",
    vacinacaoAtualizada: true,
    dataUltimaVacinacao: "2026-03-01",
    desparasitacaoAtualizada: false,
    dataUltimaDesparasitacao: "2025-11-20",
    exameVeterinario: true,
    radiografiasDisponivel: false,
    piroplasmoseTestado: true,
    dataUltimaFerragem: "2026-08-15",
    tipoFerragem: "Ferrado à frente",
    historicoLesoes: "Nenhuma",
    observacoesSaude: "Sem observações",
    trialPossivel: true,
    duracaoTrial: "7 dias",
    financiamentoPossivel: false,
    exportacaoPossivel: true,
    acompanhamentoPosVenda: true,
    internatoPossivel: false,
    aulasIncluidas: false,
    disponivelCobricao: true,
    precoCobricao: "800",
    aceitaVisitaVeterinario: true,
    equipamentoIncluido: "Sela e cabeçada",
    disponibilidadeVisita: "Fins-de-semana",
    motivoVenda: "Mudança de projecto",
    tipoProprietario: "coudelaria",
    paisProprietario: "Portugal",
    websiteCoudelaria: "https://coudelariadovale.pt",
    videosUrl: "https://youtu.be/aaa",
    videosUrl2: "https://youtu.be/bbb",
    aceitaTroca: true,
    transporteIncluido: false,
    pai: "Rubi",
    paiRegisto: "PSL-1001",
    mae: "Nespera",
    maeRegisto: "PSL-1002",
    avoPaterno: "Zinque",
    avoPaternoRegisto: "PSL-2001",
    avoPaternoMae: "Faisca",
    avoPaternoMaeRegisto: "PSL-2002",
    avoMaterno: "Novilheiro",
    avoMaternoRegisto: "PSL-2003",
    avoMaternoMae: "Bailarina",
    avoMaternoMaeRegisto: "PSL-2004",
  };
}

describe("leitores", () => {
  it("texto apara e transforma o vazio em ausência", () => {
    expect(texto({ a: "  Ulisses  " }, "a")).toBe("Ulisses");
    expect(texto({ a: "   " }, "a")).toBeNull();
    expect(texto({}, "a")).toBeNull();
    expect(texto({ a: 42 }, "a")).toBe("42");
  });

  it("booleano distingue `false` de «não respondeu»", () => {
    expect(booleano({ a: false }, "a")).toBe(false);
    expect(booleano({ a: true }, "a")).toBe(true);
    expect(booleano({}, "a")).toBeUndefined();
    expect(booleano({ a: "" }, "a")).toBeUndefined();
    // Um `form_data` que passou por JSON e voltou pode trazer as strings.
    expect(booleano({ a: "false" }, "a")).toBe(false);
    expect(booleano({ a: "true" }, "a")).toBe(true);
  });

  it("numero aceita a vírgula decimal e recusa o vazio", () => {
    expect(numero({ a: "512,5" }, "a")).toBe(512.5);
    expect(numero({ a: "512.5" }, "a")).toBe(512.5);
    expect(numero({ a: 512.5 }, "a")).toBe(512.5);
    // O caso que rebenta o `insert` com 22P02 se passar.
    expect(numero({ a: "" }, "a")).toBeNull();
    expect(numero({ a: "muitos" }, "a")).toBeNull();
    expect(numero({}, "a")).toBeNull();
  });

  it("inteiro trunca em vez de recusar a linha", () => {
    expect(inteiro({ a: "7,5" }, "a")).toBe(7);
    expect(inteiro({ a: "7" }, "a")).toBe(7);
    expect(inteiro({ a: "" }, "a")).toBeNull();
  });

  it("dataIso só deixa passar YYYY-MM-DD válido", () => {
    expect(dataIso({ a: "2018-04-12" }, "a")).toBe("2018-04-12");
    // O caso que rebenta o `insert` com 22007 se passar.
    expect(dataIso({ a: "" }, "a")).toBeNull();
    expect(dataIso({}, "a")).toBeNull();
    // Ambíguo entre Lisboa e Nova Iorque: não se adivinha.
    expect(dataIso({ a: "01/02/2020" }, "a")).toBeNull();
    // Passa na expressão regular e o Postgres recusa-o com 22008.
    expect(dataIso({ a: "2018-02-31" }, "a")).toBeNull();
    expect(dataIso({ a: "2018-13-01" }, "a")).toBeNull();
  });

  it("lista apara, deita fora vazios e repetidos", () => {
    expect(lista({ a: ["Lazer", " Lazer ", "", "Competição"] }, "a")).toEqual([
      "Lazer",
      "Competição",
    ]);
    expect(lista({ a: "Lazer" }, "a")).toEqual([]);
    expect(lista({}, "a")).toEqual([]);
  });

  it("listaDeLinhas não parte pela vírgula", () => {
    // «Campeão Nacional, 2023» é um prémio só. Partir pela vírgula publicava
    // dois, um deles chamado «2023».
    expect(listaDeLinhas({ a: "Campeão Nacional, 2023" }, "a")).toEqual(["Campeão Nacional, 2023"]);
    expect(listaDeLinhas({ a: "Um\nDois; Três" }, "a")).toEqual(["Um", "Dois", "Três"]);
    expect(listaDeLinhas({ a: "" }, "a")).toEqual([]);
    expect(listaDeLinhas({ a: ["Um", "Dois"] }, "a")).toEqual(["Um", "Dois"]);
  });
});

describe("grupo", () => {
  it("guarda `false` e deita fora a ausência", () => {
    expect(grupo({ a: false, b: undefined, c: null, d: 0 })).toEqual({ a: false, d: 0 });
  });

  it("um bloco sem nada é NULL e não `{}`", () => {
    // `{}` afirma «respondeu a nada»; `NULL` afirma «não há bloco».
    expect(grupo({ a: undefined, b: null })).toBeNull();
    expect(grupo({})).toBeNull();
  });
});

describe("lerGrupo", () => {
  it("lê o objecto, que é a forma certa", () => {
    expect(lerGrupo({ apto_criancas: false })).toEqual({ apto_criancas: false });
  });

  it("desembrulha uma string com JSON dentro, e até uma duplamente codificada", () => {
    // A armadilha desta base: um `JSON.stringify` a mais antes do `insert`.
    expect(lerGrupo('{"apto_criancas":false}')).toEqual({ apto_criancas: false });
    expect(lerGrupo(JSON.stringify(JSON.stringify({ a: 1 })))).toEqual({ a: 1 });
  });

  it("nunca lança e nunca devolve algo que não seja um objecto", () => {
    expect(lerGrupo(null)).toEqual({});
    expect(lerGrupo("não é json")).toEqual({});
    expect(lerGrupo("[1,2]")).toEqual({});
    expect(lerGrupo(7)).toEqual({});
  });
});

describe("montarAscendentes", () => {
  it("põe os seis antepassados em linhas, com o caminho na árvore", () => {
    expect(montarAscendentes(payloadCompleto())).toEqual([
      { caminho: "pai", geracao: 1, nome: "Rubi", registo: "PSL-1001" },
      { caminho: "mae", geracao: 1, nome: "Nespera", registo: "PSL-1002" },
      { caminho: "pai.pai", geracao: 2, nome: "Zinque", registo: "PSL-2001" },
      { caminho: "pai.mae", geracao: 2, nome: "Faisca", registo: "PSL-2002" },
      { caminho: "mae.pai", geracao: 2, nome: "Novilheiro", registo: "PSL-2003" },
      { caminho: "mae.mae", geracao: 2, nome: "Bailarina", registo: "PSL-2004" },
    ]);
  });

  it("um antepassado só com registo continua a ser uma linha", () => {
    expect(montarAscendentes({ paiRegisto: "PSL-1001" })).toEqual([
      { caminho: "pai", geracao: 1, nome: null, registo: "PSL-1001" },
    ]);
  });

  it("não escreve a linha vazia que a restrição da base recusaria", () => {
    expect(montarAscendentes({ pai: "", paiRegisto: "  " })).toEqual([]);
    expect(montarAscendentes({})).toEqual([]);
  });
});

describe("montarCamposDoFormulario", () => {
  const linha = montarCamposDoFormulario(payloadCompleto());

  it("a data de nascimento passa a ser guardada, e não só a idade calculada", () => {
    // A idade envelhece um ano por ano; a data não.
    expect(linha.data_nascimento).toBe("2018-04-12");
  });

  it("a raça chega à coluna que a listagem já pedia", () => {
    expect(linha.raca).toBe("Lusitano");
  });

  it("o peso chega como número e não como texto", () => {
    expect(linha.peso_kg).toBe(512.5);
    expect(typeof linha.peso_kg).toBe("number");
  });

  it("os dois vídeos chegam aos dois sítios", () => {
    expect(linha.video_url).toBe("https://youtu.be/aaa");
    expect(linha.video_url_2).toBe("https://youtu.be/bbb");
  });

  it("os campos de identificação e de vendedor chegam à coluna certa", () => {
    expect(linha.nome_registo).toBe("Ulisses do Vale");
    expect(linha.microchip).toBe("620098100123456");
    expect(linha.passaporte_equino).toBe("PT-2018-0042");
    expect(linha.pais_nascimento).toBe("Portugal");
    expect(linha.nivel_apsl).toBe("Ouro");
    expect(linha.prova_aptidao_apsl).toBe(true);
    expect(linha.temperamento).toBe("Dócil");
    expect(linha.coudelaria_origem).toBe("Coudelaria do Vale");
    expect(linha.vendedor_tipo).toBe("coudelaria");
    expect(linha.vendedor_pais).toBe("Portugal");
    expect(linha.vendedor_website).toBe("https://coudelariadovale.pt");
  });

  it("os campos de treino chegam com o tipo da coluna", () => {
    expect(linha.anos_treino).toBe(7);
    expect(linha.nivel_cavaleiro).toBe("Intermédio");
    expect(linha.uso_atual).toEqual(["Lazer", "Competição"]);
    expect(linha.premios).toEqual(["Campeão Nacional, 2023"]);
  });

  it("as duas condições que já tinham coluna deixam de ser ignoradas", () => {
    expect(linha.aceita_troca).toBe(true);
    expect(linha.transporte_incluido).toBe(false);
  });

  it("cada bloco é um objecto, nunca uma string com JSON dentro", () => {
    // A armadilha: o cliente do Supabase já serializa: um `JSON.stringify`
    // aqui guardava a string dentro do `jsonb` e partia a leitura em silêncio.
    for (const bloco of [
      "morfologia",
      "treino",
      "comportamento",
      "maneio",
      "saude",
      "condicoes_venda",
    ]) {
      expect(typeof linha[bloco], `${bloco} tem de ser objecto`).toBe("object");
      expect(Array.isArray(linha[bloco]), `${bloco} não é lista`).toBe(false);
      expect(linha[bloco]).not.toBeNull();
    }
  });

  it("o bloco de morfologia leva as três cores e as marcas", () => {
    expect(linha.morfologia).toEqual({
      cor_olhos: "Castanho",
      cor_crina: "Preta",
      cor_casco: "Escuro",
      marcas_distintivas: "Estrela na testa",
    });
  });

  it("o bloco de treino leva os nomes e as competições", () => {
    expect(linha.treino).toEqual({
      treinador_atual: "João Silva",
      ginete_habitual: "Maria Costa",
      competicoes: "CDN Golegã 2023",
    });
  });

  it("os oito booleanos de comportamento chegam todos, `false` incluído", () => {
    expect(linha.comportamento).toEqual({
      habituado_transporte: true,
      habituado_ferrador: true,
      habituado_veterinario: true,
      trabalha_em_grupo: false,
      trabalha_solto: true,
      trabalha_a_mao: true,
      habituado_campo: true,
      apto_criancas: false,
    });
  });

  it("o bloco de maneio leva as horas como número", () => {
    expect(linha.maneio).toEqual({
      regime_estabulacao: "Box com paddock",
      tipo_alimentacao: "Ração e feno",
      horas_trabalho_semana: 8,
      teste_dna_realizado: true,
      seguro_equino: false,
    });
  });

  it("os doze campos de saúde chegam inteiros", () => {
    expect(linha.saude).toEqual({
      estado_saude: "Excelente",
      vacinacao_atualizada: true,
      data_ultima_vacinacao: "2026-03-01",
      desparasitacao_atualizada: false,
      data_ultima_desparasitacao: "2025-11-20",
      exame_veterinario: true,
      radiografias_disponivel: false,
      piroplasmose_testado: true,
      data_ultima_ferragem: "2026-08-15",
      tipo_ferragem: "Ferrado à frente",
      historico_lesoes: "Nenhuma",
      observacoes_saude: "Sem observações",
    });
  });

  it("a vacinação e a desparasitação deixam de ser reduzidas a um E lógico", () => {
    // Antes, «vacinação sim, desparasitação não» e «nenhuma das duas» davam o
    // mesmo `documentos_em_dia: false` e as respostas perdiam-se.
    const bloco = montarCamposDoFormulario({
      vacinacaoAtualizada: true,
      desparasitacaoAtualizada: false,
    }).saude as Record<string, unknown>;
    expect(bloco.vacinacao_atualizada).toBe(true);
    expect(bloco.desparasitacao_atualizada).toBe(false);
  });

  it("as treze condições de venda chegam inteiras", () => {
    expect(linha.condicoes_venda).toEqual({
      trial_possivel: true,
      duracao_trial: "7 dias",
      financiamento_possivel: false,
      exportacao_possivel: true,
      acompanhamento_pos_venda: true,
      internato_possivel: false,
      aulas_incluidas: false,
      disponivel_cobricao: true,
      preco_cobricao: 800,
      aceita_visita_veterinario: true,
      equipamento_incluido: "Sela e cabeçada",
      disponibilidade_visita: "Fins-de-semana",
      motivo_venda: "Mudança de projecto",
    });
  });

  it("o que o vendedor escreveu sobrevive à ida e à volta pelo JSON", () => {
    // É por aqui que a linha passa a sério: `insert` serializa, `select`
    // desserializa. Se a forma estivesse errada, era aqui que se via.
    const idaEVolta = JSON.parse(JSON.stringify(linha));
    expect(lerGrupo(idaEVolta.comportamento).apto_criancas).toBe(false);
    expect(lerGrupo(idaEVolta.saude).desparasitacao_atualizada).toBe(false);
    expect(lerGrupo(idaEVolta.condicoes_venda).preco_cobricao).toBe(800);
  });

  it("um formulário vazio não produz nenhum valor que o Postgres recuse", () => {
    // O caso perigoso: o `insert` corre depois do pagamento. Uma string vazia
    // num `date` (22007) ou num `numeric` (22P02) faz falhar a linha inteira e
    // deixa um anúncio pago por publicar.
    const vazia = montarCamposDoFormulario({});
    expect(vazia.data_nascimento).toBeNull();
    expect(vazia.peso_kg).toBeNull();
    expect(vazia.anos_treino).toBeNull();
    for (const [chave, valor] of Object.entries(vazia)) {
      expect(valor, `${chave} não pode ser uma string vazia`).not.toBe("");
    }
    // Um bloco sem respostas é NULL, não `{}`.
    expect(vazia.morfologia).toBeNull();
    expect(vazia.saude).toBeNull();
    // As listas continuam listas, que é o que um `text[]` espera.
    expect(vazia.uso_atual).toEqual([]);
    expect(vazia.premios).toEqual([]);
    // E os booleanos com coluna própria caem para o lado prudente.
    expect(vazia.prova_aptidao_apsl).toBe(false);
    expect(vazia.aceita_troca).toBe(false);
    expect(vazia.transporte_incluido).toBe(false);
  });

  it("não escreve nenhuma coluna que o handler do webhook já escreve", () => {
    // Espalha-se por cima do objecto do `insert`: uma chave repetida aqui
    // apagava em silêncio o que o handler tinha posto lá.
    const jaEscritasPeloHandler = [
      "nome",
      "slug",
      "sexo",
      "idade",
      "cor",
      "altura",
      "preco",
      "preco_negociavel",
      "destaque",
      "listing_tier",
      "listing_expires_at",
      "featured_until",
      "user_id",
      "vendedor_email",
      "vendedor_nome",
      "vendedor_telefone",
      "vendedor_whatsapp",
      "localizacao",
      "regiao",
      "descricao",
      "linhagem",
      "pai",
      "mae",
      "nivel_treino",
      "disciplinas",
      "registro_apsl",
      "documentos_em_dia",
      "foto_principal",
      "fotos",
      "status",
    ];
    const repetidas = Object.keys(linha).filter((c) => jaEscritasPeloHandler.includes(c));
    expect(repetidas).toEqual([]);
  });

  it("não guarda o NIF, a morada nem o nome do veterinário", () => {
    // `cavalos_venda` é lida por qualquer pessoa quando `status = 'active'` e
    // o RLS do Postgres é por linha, não por coluna: tudo o que aqui entrar
    // fica publicado. Dados fiscais e o nome de um terceiro ficam em
    // `contact_submissions`, que exige `service_role`.
    const comPii = montarCamposDoFormulario({
      proprietarioNif: "123456789",
      proprietarioMorada: "Rua Direita 12, Golegã",
      nomeVeterinario: "Dr. Costa",
      ...payloadCompleto(),
    });
    const serializada = JSON.stringify(comPii);
    expect(serializada).not.toContain("123456789");
    expect(serializada).not.toContain("Rua Direita");
    expect(serializada).not.toContain("Dr. Costa");
  });
});
