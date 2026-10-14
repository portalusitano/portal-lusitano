/**
 * Do que o vendedor escreveu até à linha que o Supabase recebe.
 *
 * O formulário de publicar anúncio tem 99 campos. Todos viajam até
 * `contact_submissions.form_data` no checkout, e daí é este módulo que os põe
 * na forma que `cavalos_venda` (e `cavalos_venda_ascendentes`) esperam. O
 * inventário campo a campo, com o destino e a razão de cada um, está em
 * `docs/campos-do-anuncio.md`.
 *
 * Está aqui, e não dentro do handler do webhook, por uma razão só: o handler
 * corre **depois de o dinheiro entrar**. Não há segunda oportunidade, não há
 * como reproduzir a falha sem cobrar a alguém, e um `throw` a meio deixa um
 * pagamento sem anúncio. Uma função pura testa-se noventa e nove vezes de
 * graça; um webhook não.
 *
 * ─── As três regras de forma, e o defeito que cada uma evita ────────────────
 *
 * 1. **Um `jsonb` recebe um objecto, nunca uma string.** O cliente do Supabase
 *    já serializa o valor; um `JSON.stringify` a mais guarda a string `"{\"a\":1}"`
 *    dentro do `jsonb` em vez do objecto — e a leitura seguinte devolve texto
 *    onde se esperava um objecto, sem erro nenhum. Aconteceu neste projecto,
 *    e é por isso que `lib/coudelaria-ficha.ts` precisa de `lerListaDeTexto`
 *    para desembrulhar colunas que deviam vir prontas. Aqui monta-se o objecto
 *    e entrega-se o objecto. `lerGrupo` faz o caminho de volta e aceita as
 *    duas formas, para que uma linha escrita antes desta regra ainda se leia.
 *
 * 2. **`false` não é «não respondeu».** O campo `documentos_em_dia` esteve
 *    escrito como `formData.documentosEmDia || true`, o que publicava sempre
 *    «documentos em dia» — inclusive quando o vendedor tinha respondido que
 *    não. Aqui `booleano()` devolve `undefined` só quando a chave falta, e
 *    devolve `false` quando o vendedor escolheu `false`; e `grupo()` deita
 *    fora `undefined`, nunca `false`.
 *
 * 3. **Uma data ou é `YYYY-MM-DD` ou é `null`.** Mandar `""` para uma coluna
 *    `date` é um 22007 que faz o `insert` inteiro falhar. Como o `insert`
 *    corre depois do pagamento, uma string vazia num campo de data que o
 *    vendedor deixou em branco custaria o anúncio todo. O mesmo vale para os
 *    números: `""` num `numeric` é 22P02.
 */

/** O `form_data` como sai de `contact_submissions`: chaves em camelCase. */
export type PayloadAnuncio = Record<string, unknown>;

/** Um antepassado, identificado pelo caminho a partir do exemplar. */
export interface Ascendente {
  /** `pai`, `mae`, `pai.pai`, `pai.mae`, `mae.pai`, `mae.mae`. */
  caminho: string;
  geracao: number;
  nome: string | null;
  registo: string | null;
}

// ─── Leitores ────────────────────────────────────────────────────────────────

/** Texto aparado. Vazio é ausência, e ausência é `null`. */
export function texto(p: PayloadAnuncio, chave: string): string | null {
  const v = p[chave];
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t === "" ? null : t;
}

/**
 * Booleano. `undefined` quando a chave falta ou não é decidível — e é essa a
 * diferença que a regra 2 protege. As strings `"true"`/`"false"` entram porque
 * um `form_data` que passou por JSON e voltou pode trazer qualquer uma delas.
 */
export function booleano(p: PayloadAnuncio, chave: string): boolean | undefined {
  const v = p[chave];
  if (typeof v === "boolean") return v;
  if (v === "true") return true;
  if (v === "false") return false;
  return undefined;
}

/** Número. Aceita vírgula decimal, que é como se escreve cá. */
export function numero(p: PayloadAnuncio, chave: string): number | null {
  const v = p[chave];
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const t = v.trim().replace(",", ".");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Inteiro. Um `7,5` em anos de treino trunca; não recusa a linha por isso. */
export function inteiro(p: PayloadAnuncio, chave: string): number | null {
  const n = numero(p, chave);
  return n === null ? null : Math.trunc(n);
}

/**
 * Data em `YYYY-MM-DD`, ou `null`. Não se tenta adivinhar outros formatos: um
 * `01/02/2020` é ambíguo entre Lisboa e Nova Iorque, e enganar-se na data de
 * nascimento de um cavalo muda-lhe a idade em doze meses. Os campos do
 * formulário são todos `<input type="date">`, que só produz este formato.
 */
export function dataIso(p: PayloadAnuncio, chave: string): string | null {
  const t = texto(p, chave);
  if (!t || !/^\d{4}-\d{2}-\d{2}$/.test(t)) return null;
  const d = new Date(`${t}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  // Recusa o 31 de Fevereiro, que passa na expressão regular e que o Postgres
  // recusaria com 22008 — outra vez depois do pagamento.
  return d.toISOString().slice(0, 10) === t ? t : null;
}

/** Lista de texto vinda de um array. Apara, deita fora vazios e repetidos. */
export function lista(p: PayloadAnuncio, chave: string): string[] {
  const v = p[chave];
  if (!Array.isArray(v)) return [];
  const saida: string[] = [];
  for (const item of v) {
    if (typeof item !== "string") continue;
    const t = item.trim();
    if (t && !saida.includes(t)) saida.push(t);
  }
  return saida;
}

/**
 * Lista de texto vinda de um campo escrito à mão.
 *
 * Parte por linha e por ponto-e-vírgula, e **não por vírgula**: «Campeão
 * Nacional, 2023» é um prémio só, e parti-lo pela vírgula publicava dois — um
 * deles chamado «2023». Num campo de uma linha só, o resultado é um elemento,
 * que é o que se quer. (Ver a nota no relatório sobre passar `premios` a
 * `<textarea>`, um prémio por linha — isso é do lado do formulário.)
 */
export function listaDeLinhas(p: PayloadAnuncio, chave: string): string[] {
  const v = p[chave];
  if (Array.isArray(v)) return lista(p, chave);
  const t = texto(p, chave);
  if (!t) return [];
  const saida: string[] = [];
  for (const bruto of t.split(/[\n;]+/)) {
    const item = bruto.trim();
    if (item && !saida.includes(item)) saida.push(item);
  }
  return saida;
}

// ─── Grupos `jsonb` ──────────────────────────────────────────────────────────

/**
 * Monta um bloco `jsonb`. Deita fora `undefined` e `null` — a chave ausente é
 * uma pergunta sem resposta e não aparece —, mas guarda `false`, `0` e listas
 * vazias, que são respostas.
 *
 * Devolve `null` quando não sobrou nada: um `{}` afirma «respondeu a nada» e um
 * `NULL` afirma «não há bloco», e são coisas diferentes na ficha.
 */
export function grupo(entradas: Record<string, unknown>): Record<string, unknown> | null {
  const saida: Record<string, unknown> = {};
  for (const [chave, valor] of Object.entries(entradas)) {
    if (valor === undefined || valor === null) continue;
    saida[chave] = valor;
  }
  return Object.keys(saida).length === 0 ? null : saida;
}

/**
 * O caminho de volta: lê um bloco `jsonb` venha ele como objecto (o certo) ou
 * como string com JSON dentro (uma linha escrita antes da regra 1, ou por um
 * `JSON.stringify` a mais em qualquer ponto futuro). Nunca lança.
 */
export function lerGrupo(valor: unknown): Record<string, unknown> {
  let bruto = valor;
  for (let volta = 0; volta < 3 && typeof bruto === "string"; volta++) {
    try {
      bruto = JSON.parse(bruto);
    } catch {
      return {};
    }
  }
  if (!bruto || typeof bruto !== "object" || Array.isArray(bruto)) return {};
  return bruto as Record<string, unknown>;
}

// ─── A linha do anúncio ──────────────────────────────────────────────────────

/**
 * Os seis antepassados que o formulário pede, na ordem em que se lêem numa
 * árvore. O `caminho` é a posição vista do exemplar, e é ele que permite uma
 * terceira geração sem migração nenhuma.
 */
const ASCENDENTES: Array<{ caminho: string; geracao: number; nome: string; registo: string }> = [
  { caminho: "pai", geracao: 1, nome: "pai", registo: "paiRegisto" },
  { caminho: "mae", geracao: 1, nome: "mae", registo: "maeRegisto" },
  { caminho: "pai.pai", geracao: 2, nome: "avoPaterno", registo: "avoPaternoRegisto" },
  { caminho: "pai.mae", geracao: 2, nome: "avoPaternoMae", registo: "avoPaternoMaeRegisto" },
  { caminho: "mae.pai", geracao: 2, nome: "avoMaterno", registo: "avoMaternoRegisto" },
  { caminho: "mae.mae", geracao: 2, nome: "avoMaternoMae", registo: "avoMaternoMaeRegisto" },
];

/**
 * A ascendência, em linhas. Um antepassado sem nome **e** sem registo não é
 * uma linha vazia na base — é uma linha que não se escreve (a restrição
 * `cavalos_venda_ascendentes_nao_vazio` recusa-a, e recusar depois do
 * pagamento não serve a ninguém).
 */
export function montarAscendentes(p: PayloadAnuncio): Ascendente[] {
  const saida: Ascendente[] = [];
  for (const a of ASCENDENTES) {
    const nome = texto(p, a.nome);
    const registo = texto(p, a.registo);
    if (!nome && !registo) continue;
    saida.push({ caminho: a.caminho, geracao: a.geracao, nome, registo });
  }
  return saida;
}

/**
 * Os campos do formulário que este módulo acrescenta à linha de `cavalos_venda`.
 *
 * **Só os campos novos.** O que o handler já escrevia — nome, sexo, preço,
 * fotos, contactos, plano, estado — continua a ser dele: essas são as colunas
 * que dependem da sessão do Stripe e dos metadados, e não do formulário.
 */
export function montarCamposDoFormulario(p: PayloadAnuncio): Record<string, unknown> {
  return {
    // ── Identificação ───────────────────────────────────────────────────────
    // A data de nascimento é o dado; a idade é uma conta que envelhece um ano
    // por ano. Guardavam-se só os anos, calculados no browser no dia em que o
    // anúncio foi pago.
    data_nascimento: dataIso(p, "dataNascimento"),
    raca: texto(p, "racaConfirmada"),
    nome_registo: texto(p, "nomeRegisto"),
    microchip: texto(p, "microchip"),
    passaporte_equino: texto(p, "passaporteEquino"),
    pais_nascimento: texto(p, "paisNascimento"),
    peso_kg: numero(p, "peso"),
    nivel_apsl: texto(p, "nivelApsl"),
    prova_aptidao_apsl: booleano(p, "provaAptidaoApsl") ?? false,
    temperamento: texto(p, "temperamento"),
    coudelaria_origem: texto(p, "coudelariaOrigem"),

    // ── Treino ──────────────────────────────────────────────────────────────
    anos_treino: inteiro(p, "anosTreino"),
    nivel_cavaleiro: texto(p, "nivelCavaleiro"),
    uso_atual: lista(p, "usoAtual"),
    premios: listaDeLinhas(p, "premios"),

    // ── Vendedor ────────────────────────────────────────────────────────────
    vendedor_tipo: texto(p, "tipoProprietario"),
    vendedor_pais: texto(p, "paisProprietario"),
    vendedor_website: texto(p, "websiteCoudelaria"),

    // ── Vídeos ──────────────────────────────────────────────────────────────
    // O formulário pede dois e nenhum dos dois era guardado.
    video_url: texto(p, "videosUrl"),
    video_url_2: texto(p, "videosUrl2"),

    // ── Condições que já tinham coluna e nunca eram escritas ────────────────
    aceita_troca: booleano(p, "aceitaTroca") ?? false,
    transporte_incluido: booleano(p, "transporteIncluido") ?? false,

    // ── Blocos ──────────────────────────────────────────────────────────────
    morfologia: grupo({
      cor_olhos: texto(p, "corOlhos"),
      cor_crina: texto(p, "corCrina"),
      cor_casco: texto(p, "corCasco"),
      marcas_distintivas: texto(p, "marcasDistintivas"),
    }),

    treino: grupo({
      treinador_atual: texto(p, "treinadorAtual"),
      ginete_habitual: texto(p, "gineteHabitual"),
      competicoes: texto(p, "competicoes"),
    }),

    comportamento: grupo({
      habituado_transporte: booleano(p, "habituadoTransporte"),
      habituado_ferrador: booleano(p, "habituadoFerrador"),
      habituado_veterinario: booleano(p, "habituadoVeterinario"),
      trabalha_em_grupo: booleano(p, "trabalhaEmGrupo"),
      trabalha_solto: booleano(p, "trabalhaSolto"),
      trabalha_a_mao: booleano(p, "trabalhaAMao"),
      habituado_campo: booleano(p, "habituadoCampo"),
      apto_criancas: booleano(p, "aptoCriancas"),
    }),

    maneio: grupo({
      regime_estabulacao: texto(p, "regimeEstabulacao"),
      tipo_alimentacao: texto(p, "tipoAlimentacao"),
      horas_trabalho_semana: numero(p, "horasTrabalhoSemana"),
      teste_dna_realizado: booleano(p, "testeDnaRealizado"),
      seguro_equino: booleano(p, "seguroEquino"),
    }),

    // As duas primeiras eram reduzidas a um E lógico em `documentos_em_dia` e
    // perdidas: quem respondesse «vacinação em dia, desparasitação não» ficava
    // indistinguível de quem respondesse «nenhuma das duas».
    saude: grupo({
      estado_saude: texto(p, "estadoSaude"),
      vacinacao_atualizada: booleano(p, "vacinacaoAtualizada"),
      data_ultima_vacinacao: dataIso(p, "dataUltimaVacinacao"),
      desparasitacao_atualizada: booleano(p, "desparasitacaoAtualizada"),
      data_ultima_desparasitacao: dataIso(p, "dataUltimaDesparasitacao"),
      exame_veterinario: booleano(p, "exameVeterinario"),
      radiografias_disponivel: booleano(p, "radiografiasDisponivel"),
      piroplasmose_testado: booleano(p, "piroplasmoseTestado"),
      data_ultima_ferragem: dataIso(p, "dataUltimaFerragem"),
      tipo_ferragem: texto(p, "tipoFerragem"),
      historico_lesoes: texto(p, "historicoLesoes"),
      observacoes_saude: texto(p, "observacoesSaude"),
    }),

    condicoes_venda: grupo({
      trial_possivel: booleano(p, "trialPossivel"),
      duracao_trial: texto(p, "duracaoTrial"),
      financiamento_possivel: booleano(p, "financiamentoPossivel"),
      exportacao_possivel: booleano(p, "exportacaoPossivel"),
      acompanhamento_pos_venda: booleano(p, "acompanhamentoPosVenda"),
      internato_possivel: booleano(p, "internatoPossivel"),
      aulas_incluidas: booleano(p, "aulasIncluidas"),
      disponivel_cobricao: booleano(p, "disponivelCobricao"),
      preco_cobricao: numero(p, "precoCobricao"),
      aceita_visita_veterinario: booleano(p, "aceitaVisitaVeterinario"),
      equipamento_incluido: texto(p, "equipamentoIncluido"),
      disponibilidade_visita: texto(p, "disponibilidadeVisita"),
      motivo_venda: texto(p, "motivoVenda"),
    }),
  };
}
