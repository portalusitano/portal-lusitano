import type { FormData } from "@/components/vender-cavalo/types";

/**
 * O catálogo dos campos do formulário de publicar anúncio.
 *
 * Existe porque a regra mudou de sítio. Enquanto vinte campos eram
 * obrigatórios e setenta e nove não eram, a lista dos obrigatórios cabia em
 * vinte `if` escritos à mão dentro da `validacao.ts`, e os outros setenta e
 * nove não estavam escritos em lado nenhum — eram só JSX. Com **todos**
 * obrigatórios, essa forma deixa de servir por duas razões:
 *
 * 1. Noventa e nove `if` à mão é uma lista que se dessincroniza do formulário
 *    na primeira vez que alguém acrescenta um campo. O que falha não dá erro:
 *    dá um campo com asterisco que nada verifica, ou um campo verificado que
 *    ninguém desenha — e esse segundo caso **tranca o formulário**, porque
 *    exige uma resposta a uma pergunta que não está no ecrã.
 * 2. Uma mensagem de erro por campo, em três línguas, escrita à mão noventa e
 *    nove vezes, é prosa que ninguém revê. O que a pessoa precisa de ler é o
 *    **nome do campo** — que já está no rótulo, ao lado — mais o verbo certo
 *    para o tipo dele. Isso sai de uma tabela; não sai de prosa.
 *
 * Por isso o nome de cada campo vive aqui, nas três línguas, ao lado do passo
 * onde ele é desenhado e da condição que o torna exigível. É este ficheiro que
 * a validação lê, é dele que sai a conta do que falta em cada passo, e é
 * contra ele que o `__tests__/components/vender-cavalo-campos.test.ts` confirma
 * que **todo o campo exigido está desenhado num passo** — que é a única
 * maneira de o defeito nº 1 acima não voltar em silêncio.
 */

/** pt, en, es — a mesma ordem do `createTranslator`. */
export type Nome = readonly [string, string, string];

/**
 * O tipo do campo decide o verbo da frase e o que conta como resposta.
 *
 * - `texto` — uma caixa de escrever. Vazio ou só espaços não é resposta.
 * - `escolha` — uma `<Seleccao>`. Vazio é «ainda não escolhi».
 * - `resposta` — um sim/não. Vazio é «ainda não respondi»; `nao` **é** resposta.
 * - `lista` — filtros em `.chip`. Zero escolhidos não é resposta.
 */
export type TipoCampo = "texto" | "escolha" | "resposta" | "lista";

export interface CampoDoFormulario {
  /** O `id` do elemento no DOM. É o que leva do resumo de erros até ao campo. */
  id: string;
  /** A chave em `FormData`. Igual ao `id` em todos menos onde o DOM manda outra coisa. */
  chave: keyof FormData;
  /** Em que passo é que este campo é desenhado. */
  passo: 1 | 2 | 3;
  tipo: TipoCampo;
  nome: Nome;
  /**
   * A secção onde vive, para a conta do cabeçalho. É uma chave, não prosa: o
   * texto do cabeçalho está no componente que o desenha.
   */
  seccao: string;
  /**
   * Quando é que este campo é exigido. Sem isto, um campo que só aparece em
   * certas condições — o website de uma coudelaria, a duração do trial, o
   * preço de cobrição — seria exigido sempre e **não haveria como o
   * preencher**, porque o formulário não o desenha. É o único mecanismo neste
   * ficheiro que evita trancar alguém fora do próprio anúncio.
   *
   * Ausente quer dizer «sempre».
   */
  exigidoQuando?: (f: FormData) => boolean;
  /**
   * Uma frase própria, quando a genérica não chega — é o caso dos campos que
   * já tinham prosa traduzida e revista antes deste trabalho. É uma chave de
   * `MensagensValidacao`.
   */
  mensagemPropria?: string;
}

/** É uma coudelaria ou uma escola: só nesse caso o website é desenhado. */
export const eCoudelaria = (f: FormData): boolean =>
  f.tipo_proprietario === "Coudelaria" || f.tipo_proprietario === "Clube / Escola de Equitação";

/** Só um garanhão cobre: os dois campos da cobrição só existem para ele. */
export const eGaranhao = (f: FormData): boolean => f.sexo === "Garanhão";

/**
 * Os noventa e nove campos, na ordem em que aparecem no ecrã.
 *
 * A ordem importa: é ela que decide a ordem do resumo de erros no topo, e um
 * resumo cuja ordem não é a do formulário manda a pessoa saltar para trás e
 * para a frente.
 */
export const CAMPOS: readonly CampoDoFormulario[] = [
  // ---- Passo 1 · quem vende -----------------------------------------------
  {
    id: "proprietario_nome",
    chave: "proprietario_nome",
    passo: 1,
    tipo: "texto",
    seccao: "contacto",
    nome: ["Nome completo", "Full name", "Nombre completo"],
    mensagemPropria: "nomeProprietario",
  },
  {
    id: "proprietario_email",
    chave: "proprietario_email",
    passo: 1,
    tipo: "texto",
    seccao: "contacto",
    nome: ["Email", "Email", "Email"],
    mensagemPropria: "email",
  },
  {
    id: "proprietario_telefone",
    chave: "proprietario_telefone",
    passo: 1,
    tipo: "texto",
    seccao: "contacto",
    nome: ["Telefone", "Phone", "Teléfono"],
    mensagemPropria: "telefone",
  },
  {
    id: "tipo_proprietario",
    chave: "tipo_proprietario",
    passo: 1,
    tipo: "escolha",
    seccao: "facturacao",
    nome: ["Tipo de vendedor", "Seller type", "Tipo de vendedor"],
  },
  {
    id: "pais_proprietario",
    chave: "pais_proprietario",
    passo: 1,
    tipo: "escolha",
    seccao: "facturacao",
    nome: ["País de residência", "Country of residence", "País de residencia"],
  },
  {
    id: "proprietario_nif",
    chave: "proprietario_nif",
    passo: 1,
    tipo: "texto",
    seccao: "facturacao",
    nome: ["NIF", "Tax number", "NIF"],
  },
  {
    id: "proprietario_whatsapp",
    chave: "proprietario_whatsapp",
    passo: 1,
    tipo: "texto",
    seccao: "facturacao",
    nome: ["WhatsApp", "WhatsApp", "WhatsApp"],
  },
  {
    id: "proprietario_morada",
    chave: "proprietario_morada",
    passo: 1,
    tipo: "texto",
    seccao: "facturacao",
    nome: ["Morada de facturação", "Billing address", "Dirección de facturación"],
  },
  {
    id: "website_coudelaria",
    chave: "website_coudelaria",
    passo: 1,
    tipo: "texto",
    seccao: "facturacao",
    nome: ["Website da coudelaria", "Stud farm website", "Sitio web del criadero"],
    // Só é desenhado para uma coudelaria ou escola. Exigi-lo a um particular
    // seria exigir uma resposta a uma caixa que ele nunca vê.
    exigidoQuando: eCoudelaria,
  },

  // ---- Passo 1 · o cavalo -------------------------------------------------
  {
    id: "nome",
    chave: "nome",
    passo: 1,
    tipo: "texto",
    seccao: "cavalo",
    nome: ["Nome do cavalo", "Horse name", "Nombre del caballo"],
    mensagemPropria: "nomeCavalo",
  },
  {
    id: "numero_registo",
    chave: "numero_registo",
    passo: 1,
    tipo: "texto",
    seccao: "cavalo",
    nome: ["Número de registo", "Registration number", "Número de registro"],
    mensagemPropria: "numeroRegisto",
  },
  {
    id: "data_nascimento",
    chave: "data_nascimento",
    passo: 1,
    tipo: "texto",
    seccao: "cavalo",
    nome: ["Data de nascimento", "Date of birth", "Fecha de nacimiento"],
    mensagemPropria: "dataNascimento",
  },
  {
    id: "sexo",
    chave: "sexo",
    passo: 1,
    tipo: "escolha",
    seccao: "cavalo",
    nome: ["Sexo", "Sex", "Sexo"],
    mensagemPropria: "sexo",
  },
  {
    id: "pelagem",
    chave: "pelagem",
    passo: 1,
    tipo: "escolha",
    seccao: "cavalo",
    nome: ["Pelagem", "Coat", "Capa"],
    mensagemPropria: "pelagem",
  },
  {
    id: "altura",
    chave: "altura",
    passo: 1,
    tipo: "texto",
    seccao: "cavalo",
    nome: ["Altura ao garrote", "Height at withers", "Altura a la cruz"],
  },
  {
    id: "temperamento",
    chave: "temperamento",
    passo: 1,
    tipo: "escolha",
    seccao: "cavalo",
    nome: ["Temperamento", "Temperament", "Temperamento"],
  },

  // ---- Passo 1 · identificação oficial e morfologia -----------------------
  {
    id: "nome_registo",
    chave: "nome_registo",
    passo: 1,
    tipo: "texto",
    seccao: "identificacao",
    nome: ["Nome de registo", "Registered name", "Nombre de registro"],
  },
  {
    id: "microchip",
    chave: "microchip",
    passo: 1,
    tipo: "texto",
    seccao: "identificacao",
    nome: ["Microchip", "Microchip", "Microchip"],
  },
  {
    id: "passaporte_equino",
    chave: "passaporte_equino",
    passo: 1,
    tipo: "texto",
    seccao: "identificacao",
    nome: ["Passaporte equino", "Equine passport", "Pasaporte equino"],
  },
  {
    id: "raca_confirmada",
    chave: "raca_confirmada",
    passo: 1,
    tipo: "escolha",
    seccao: "identificacao",
    nome: ["Raça confirmada", "Confirmed breed", "Raza confirmada"],
  },
  {
    id: "pais_nascimento",
    chave: "pais_nascimento",
    passo: 1,
    tipo: "escolha",
    seccao: "identificacao",
    nome: ["País de nascimento", "Country of birth", "País de nacimiento"],
  },
  {
    id: "peso",
    chave: "peso",
    passo: 1,
    tipo: "texto",
    seccao: "identificacao",
    nome: ["Peso", "Weight", "Peso"],
  },
  {
    id: "cor_olhos",
    chave: "cor_olhos",
    passo: 1,
    tipo: "escolha",
    seccao: "identificacao",
    nome: ["Cor dos olhos", "Eye colour", "Color de ojos"],
  },
  {
    id: "cor_crina",
    chave: "cor_crina",
    passo: 1,
    tipo: "escolha",
    seccao: "identificacao",
    nome: ["Cor da crina", "Mane colour", "Color de crines"],
  },
  {
    id: "cor_casco",
    chave: "cor_casco",
    passo: 1,
    tipo: "escolha",
    seccao: "identificacao",
    nome: ["Cor do casco", "Hoof colour", "Color del casco"],
  },
  {
    id: "marcas_distintivas",
    chave: "marcas_distintivas",
    passo: 1,
    tipo: "texto",
    seccao: "identificacao",
    nome: ["Marcas distintivas", "Distinctive markings", "Marcas distintivas"],
  },
  {
    id: "nivel_apsl",
    chave: "nivel_apsl",
    passo: 1,
    tipo: "texto",
    seccao: "identificacao",
    nome: ["Pontuação morfológica APSL", "APSL conformation score", "Puntuación morfológica APSL"],
  },
  {
    id: "prova_aptidao_apsl",
    chave: "prova_aptidao_apsl",
    passo: 1,
    tipo: "resposta",
    seccao: "identificacao",
    nome: ["Prova de Aptidão APSL realizada", "APSL aptitude test done", "Prueba de Aptitud APSL"],
  },

  // ---- Passo 2 · linhagem -------------------------------------------------
  {
    id: "pai_nome",
    chave: "pai_nome",
    passo: 2,
    tipo: "texto",
    seccao: "pais",
    nome: ["Nome do pai", "Sire's name", "Nombre del padre"],
    mensagemPropria: "pai",
  },
  {
    id: "pai_registo",
    chave: "pai_registo",
    passo: 2,
    tipo: "texto",
    seccao: "pais",
    nome: ["Registo do pai", "Sire's registration", "Registro del padre"],
  },
  {
    id: "mae_nome",
    chave: "mae_nome",
    passo: 2,
    tipo: "texto",
    seccao: "pais",
    nome: ["Nome da mãe", "Dam's name", "Nombre de la madre"],
    mensagemPropria: "mae",
  },
  {
    id: "mae_registo",
    chave: "mae_registo",
    passo: 2,
    tipo: "texto",
    seccao: "pais",
    nome: ["Registo da mãe", "Dam's registration", "Registro de la madre"],
  },
  {
    id: "avo_paterno_nome",
    chave: "avo_paterno_nome",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: ["Nome do avô paterno", "Paternal grandsire's name", "Nombre del abuelo paterno"],
  },
  {
    id: "avo_paterno_registo",
    chave: "avo_paterno_registo",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: [
      "Registo do avô paterno",
      "Paternal grandsire's registration",
      "Registro del abuelo paterno",
    ],
  },
  {
    id: "avo_paterno_mae_nome",
    chave: "avo_paterno_mae_nome",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: ["Nome da avó paterna", "Paternal granddam's name", "Nombre de la abuela paterna"],
  },
  {
    id: "avo_paterno_mae_registo",
    chave: "avo_paterno_mae_registo",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: [
      "Registo da avó paterna",
      "Paternal granddam's registration",
      "Registro de la abuela paterna",
    ],
  },
  {
    id: "avo_materno_nome",
    chave: "avo_materno_nome",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: ["Nome do avô materno", "Maternal grandsire's name", "Nombre del abuelo materno"],
  },
  {
    id: "avo_materno_registo",
    chave: "avo_materno_registo",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: [
      "Registo do avô materno",
      "Maternal grandsire's registration",
      "Registro del abuelo materno",
    ],
  },
  {
    id: "avo_materno_mae_nome",
    chave: "avo_materno_mae_nome",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: ["Nome da avó materna", "Maternal granddam's name", "Nombre de la abuela materna"],
  },
  {
    id: "avo_materno_mae_registo",
    chave: "avo_materno_mae_registo",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: [
      "Registo da avó materna",
      "Maternal granddam's registration",
      "Registro de la abuela materna",
    ],
  },
  {
    id: "linhagem_principal",
    chave: "linhagem_principal",
    passo: 2,
    tipo: "escolha",
    seccao: "avos",
    nome: ["Linhagem principal", "Main lineage", "Linaje principal"],
  },
  {
    id: "coudelaria_origem",
    chave: "coudelaria_origem",
    passo: 2,
    tipo: "texto",
    seccao: "avos",
    nome: ["Coudelaria de origem", "Stud of origin", "Criadero de origen"],
  },

  // ---- Passo 2 · treino ---------------------------------------------------
  {
    id: "nivel_treino",
    chave: "nivel_treino",
    passo: 2,
    tipo: "escolha",
    seccao: "treino",
    nome: ["Nível de treino", "Training level", "Nivel de doma"],
    mensagemPropria: "nivelTreino",
  },
  {
    id: "disciplinas",
    chave: "disciplinas",
    passo: 2,
    tipo: "lista",
    seccao: "treino",
    nome: ["Disciplinas", "Disciplines", "Disciplinas"],
  },
  {
    id: "nivel_cavaleiro",
    chave: "nivel_cavaleiro",
    passo: 2,
    tipo: "escolha",
    seccao: "treino",
    nome: ["Nível de cavaleiro recomendado", "Recommended rider level", "Nivel de jinete"],
  },
  {
    id: "uso_atual",
    chave: "uso_atual",
    passo: 2,
    tipo: "lista",
    seccao: "uso",
    nome: ["Uso actual do cavalo", "Current horse use", "Uso actual del caballo"],
  },
  {
    id: "anos_treino",
    chave: "anos_treino",
    passo: 2,
    tipo: "texto",
    seccao: "uso",
    nome: ["Anos de treino", "Years in training", "Años de entrenamiento"],
  },
  {
    id: "treinador_atual",
    chave: "treinador_atual",
    passo: 2,
    tipo: "texto",
    seccao: "uso",
    nome: ["Treinador actual", "Current trainer", "Entrenador actual"],
  },
  {
    id: "ginete_habitual",
    chave: "ginete_habitual",
    passo: 2,
    tipo: "texto",
    seccao: "uso",
    nome: ["Ginete habitual", "Regular rider", "Jinete habitual"],
  },
  {
    id: "competicoes",
    chave: "competicoes",
    passo: 2,
    tipo: "texto",
    seccao: "uso",
    nome: ["Competições", "Competitions", "Competiciones"],
  },
  {
    id: "premios",
    chave: "premios",
    passo: 2,
    tipo: "texto",
    seccao: "uso",
    nome: ["Prémios", "Awards", "Premios"],
  },

  // ---- Passo 2 · comportamento -------------------------------------------
  {
    id: "habituado_transporte",
    chave: "habituado_transporte",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Habituado a transporte", "Used to transport", "Habituado al transporte"],
  },
  {
    id: "habituado_ferrador",
    chave: "habituado_ferrador",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Bom com o ferrador", "Good with the farrier", "Bueno con el herrador"],
  },
  {
    id: "habituado_veterinario",
    chave: "habituado_veterinario",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Bom com o veterinário", "Good with the vet", "Bueno con el veterinario"],
  },
  {
    id: "trabalha_em_grupo",
    chave: "trabalha_em_grupo",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Trabalha bem em grupo", "Works well in a group", "Trabaja bien en grupo"],
  },
  {
    id: "trabalha_solto",
    chave: "trabalha_solto",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Trabalha solto", "Works at liberty", "Trabaja suelto"],
  },
  {
    id: "trabalha_a_mao",
    chave: "trabalha_a_mao",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Trabalha à mão", "Works in hand", "Trabaja a la mano"],
  },
  {
    id: "habituado_campo",
    chave: "habituado_campo",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Habituado a campo", "Used to turnout", "Habituado al campo"],
  },
  {
    id: "apto_criancas",
    chave: "apto_criancas",
    passo: 2,
    tipo: "resposta",
    seccao: "comportamento",
    nome: ["Apto para crianças ou principiantes", "Suitable for children", "Apto para niños"],
  },

  // ---- Passo 2 · maneio ---------------------------------------------------
  {
    id: "regime_estabulacao",
    chave: "regime_estabulacao",
    passo: 2,
    tipo: "escolha",
    seccao: "maneio",
    nome: ["Regime de estabulação", "Stabling regime", "Régimen de estabulación"],
  },
  {
    id: "tipo_alimentacao",
    chave: "tipo_alimentacao",
    passo: 2,
    tipo: "escolha",
    seccao: "maneio",
    nome: ["Tipo de alimentação", "Feeding type", "Tipo de alimentación"],
  },
  {
    id: "horas_trabalho_semana",
    chave: "horas_trabalho_semana",
    passo: 2,
    tipo: "texto",
    seccao: "maneio",
    nome: ["Horas de trabalho por semana", "Working hours per week", "Horas de trabajo por semana"],
  },
  {
    id: "teste_dna_realizado",
    chave: "teste_dna_realizado",
    passo: 2,
    tipo: "resposta",
    seccao: "maneio",
    nome: ["Teste de DNA realizado", "DNA test done", "Prueba de ADN realizada"],
  },
  {
    id: "seguro_equino",
    chave: "seguro_equino",
    passo: 2,
    tipo: "resposta",
    seccao: "maneio",
    nome: ["Seguro equino activo", "Equine insurance active", "Seguro equino activo"],
  },

  // ---- Passo 2 · saúde ----------------------------------------------------
  {
    id: "estado_saude",
    chave: "estado_saude",
    passo: 2,
    tipo: "escolha",
    seccao: "saude",
    nome: ["Estado geral de saúde", "General health status", "Estado general de salud"],
    mensagemPropria: "estadoSaude",
  },
  {
    id: "vacinacao_atualizada",
    chave: "vacinacao_atualizada",
    passo: 2,
    tipo: "resposta",
    seccao: "saude",
    nome: ["Vacinação em dia", "Vaccination up to date", "Vacunación al día"],
  },
  {
    id: "desparasitacao_atualizada",
    chave: "desparasitacao_atualizada",
    passo: 2,
    tipo: "resposta",
    seccao: "saude",
    nome: ["Desparasitação em dia", "Deworming up to date", "Desparasitación al día"],
  },
  {
    id: "exame_veterinario",
    chave: "exame_veterinario",
    passo: 2,
    tipo: "resposta",
    seccao: "saude",
    nome: ["Exame veterinário disponível", "Vet report available", "Examen veterinario disponible"],
  },
  {
    id: "radiografias_disponivel",
    chave: "radiografias_disponivel",
    passo: 2,
    tipo: "resposta",
    seccao: "saude",
    nome: ["Radiografias disponíveis", "Radiographs available", "Radiografías disponibles"],
  },
  {
    id: "piroplasmose_testado",
    chave: "piroplasmose_testado",
    passo: 2,
    tipo: "resposta",
    seccao: "saude",
    nome: ["Testado para piroplasmose", "Tested for piroplasmosis", "Probado para piroplasmosis"],
  },
  {
    id: "data_ultima_vacinacao",
    chave: "data_ultima_vacinacao",
    passo: 2,
    tipo: "texto",
    seccao: "historico",
    nome: ["Data da última vacinação", "Date of last vaccination", "Fecha de última vacunación"],
    // Só se pede a data a quem disse que a vacinação está em dia. Um poldro
    // que nunca foi vacinado não tem data nenhuma para escrever, e exigir-lha
    // seria obrigá-lo a inventar uma.
    exigidoQuando: (f) => f.vacinacao_atualizada === "sim",
  },
  {
    id: "data_ultima_desparasitacao",
    chave: "data_ultima_desparasitacao",
    passo: 2,
    tipo: "texto",
    seccao: "historico",
    nome: [
      "Data da última desparasitação",
      "Date of last deworming",
      "Fecha de última desparasitación",
    ],
    exigidoQuando: (f) => f.desparasitacao_atualizada === "sim",
  },
  {
    id: "data_ultima_ferragem",
    chave: "data_ultima_ferragem",
    passo: 2,
    tipo: "texto",
    seccao: "historico",
    nome: [
      "Data da última ferragem ou aparo",
      "Date of last shoeing or trim",
      "Fecha del último herraje o recorte",
    ],
  },
  {
    id: "tipo_ferragem",
    chave: "tipo_ferragem",
    passo: 2,
    tipo: "escolha",
    seccao: "historico",
    nome: ["Tipo de ferragem", "Shoeing type", "Tipo de herraje"],
  },
  {
    id: "historico_lesoes",
    chave: "historico_lesoes",
    passo: 2,
    tipo: "texto",
    seccao: "historico",
    nome: [
      "Histórico de lesões e cirurgias",
      "Injury and surgery history",
      "Historial de lesiones",
    ],
  },
  {
    id: "observacoes_saude",
    chave: "observacoes_saude",
    passo: 2,
    tipo: "texto",
    seccao: "historico",
    nome: ["Observações de saúde", "Health notes", "Observaciones de salud"],
  },

  // ---- Passo 3 · preço e local -------------------------------------------
  {
    id: "preco",
    chave: "preco",
    passo: 3,
    tipo: "texto",
    seccao: "preco",
    nome: ["Preço", "Price", "Precio"],
    mensagemPropria: "preco",
  },
  {
    id: "regiao",
    chave: "regiao",
    passo: 3,
    tipo: "escolha",
    seccao: "preco",
    nome: ["Distrito / região", "District / region", "Distrito / región"],
    mensagemPropria: "regiao",
  },
  {
    id: "localizacao",
    chave: "localizacao",
    passo: 3,
    tipo: "texto",
    seccao: "preco",
    nome: ["Localidade", "Location", "Localidad"],
    mensagemPropria: "localizacao",
  },
  {
    id: "negociavel",
    chave: "negociavel",
    passo: 3,
    tipo: "resposta",
    seccao: "preco",
    nome: ["Preço negociável", "Price negotiable", "Precio negociable"],
  },

  // ---- Passo 3 · condições de venda --------------------------------------
  {
    id: "aceita_troca",
    chave: "aceita_troca",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Aceita troca", "Accepts trade", "Acepta cambio"],
  },
  {
    id: "transporte_incluido",
    chave: "transporte_incluido",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Transporte incluído no preço", "Transport included", "Transporte incluido"],
  },
  {
    id: "trial_possivel",
    chave: "trial_possivel",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Período de prova possível", "Trial period possible", "Período de prueba posible"],
  },
  {
    id: "duracao_trial",
    chave: "duracao_trial",
    passo: 3,
    tipo: "escolha",
    seccao: "condicoes",
    nome: ["Duração do período de prova", "Trial duration", "Duración de la prueba"],
    // Só existe no ecrã depois de alguém dizer que aceita um período de prova.
    exigidoQuando: (f) => f.trial_possivel === "sim",
  },
  {
    id: "financiamento_possivel",
    chave: "financiamento_possivel",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Financiamento disponível", "Financing available", "Financiación disponible"],
  },
  {
    id: "exportacao_possivel",
    chave: "exportacao_possivel",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Exportação possível", "Export possible", "Exportación posible"],
  },
  {
    id: "acompanhamento_pos_venda",
    chave: "acompanhamento_pos_venda",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Acompanhamento pós-venda", "After-sales support", "Acompañamiento postventa"],
  },
  {
    id: "internato_possivel",
    chave: "internato_possivel",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Internato possível", "Livery possible", "Internado posible"],
  },
  {
    id: "aulas_incluidas",
    chave: "aulas_incluidas",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Aulas incluídas na venda", "Lessons included", "Clases incluidas"],
  },
  {
    id: "disponivel_cobricao",
    chave: "disponivel_cobricao",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: ["Disponível para cobrição", "Available for covering", "Disponible para cubrición"],
    exigidoQuando: eGaranhao,
  },
  {
    id: "preco_cobricao",
    chave: "preco_cobricao",
    passo: 3,
    tipo: "texto",
    seccao: "condicoes",
    nome: ["Preço de cobrição", "Covering fee", "Precio de cubrición"],
    exigidoQuando: (f) => eGaranhao(f) && f.disponivel_cobricao === "sim",
  },
  {
    id: "disponibilidade_visita",
    chave: "disponibilidade_visita",
    passo: 3,
    tipo: "escolha",
    seccao: "condicoes",
    nome: ["Disponibilidade para visitas", "Visit availability", "Disponibilidad para visitas"],
  },
  {
    id: "motivo_venda",
    chave: "motivo_venda",
    passo: 3,
    tipo: "escolha",
    seccao: "condicoes",
    nome: ["Motivo da venda", "Reason for sale", "Motivo de la venta"],
  },
  {
    id: "equipamento_incluido",
    chave: "equipamento_incluido",
    passo: 3,
    tipo: "texto",
    seccao: "condicoes",
    nome: ["Equipamento incluído", "Equipment included", "Equipamiento incluido"],
  },
  {
    id: "aceita_visita_veterinario",
    chave: "aceita_visita_veterinario",
    passo: 3,
    tipo: "resposta",
    seccao: "condicoes",
    nome: [
      "Aceita exame de pré-compra",
      "Accepts pre-purchase exam",
      "Acepta examen de pre-compra",
    ],
  },

  // ---- Passo 3 · apresentação --------------------------------------------
  {
    id: "descricao",
    chave: "descricao",
    passo: 3,
    tipo: "texto",
    seccao: "apresentacao",
    nome: ["Descrição", "Description", "Descripción"],
    mensagemPropria: "descricao",
  },
  {
    id: "videos_url",
    chave: "videos_url",
    passo: 3,
    tipo: "texto",
    seccao: "apresentacao",
    nome: ["Vídeo 1", "Video 1", "Vídeo 1"],
  },
  {
    id: "videos_url_2",
    chave: "videos_url_2",
    passo: 3,
    tipo: "texto",
    seccao: "apresentacao",
    nome: ["Vídeo 2", "Video 2", "Vídeo 2"],
  },
];

/**
 * O único campo do formulário que **não** é obrigatório, e a razão.
 *
 * `nome_veterinario` é o nome de uma pessoa que não é o vendedor e que nunca
 * consentiu em aparecer num classificados. Obrigar alguém a escrevê-lo é
 * obrigá-lo a publicar dados de um terceiro para poder vender o seu cavalo, e
 * isso não é uma decisão de produto — é o RGPD. `cavalos_venda` fica legível
 * por qualquer pessoa assim que o anúncio é aprovado (o RLS do Postgres é por
 * linha, não por coluna), por isso «guardar só para o administrador» também
 * não resolve nada se o campo entrar naquela tabela.
 *
 * A proposta, que fica escrita no relatório e não implementada aqui porque
 * mudaria a conta dos noventa e nove campos e o inventário em
 * `docs/campos-do-anuncio.md`, que está fora deste trabalho: trocá-lo por
 * «seguido por veterinário: sim/não», que é o sinal que o comprador quer — há
 * acompanhamento ou não há — sem publicar o nome de ninguém.
 */
export const CAMPOS_VOLUNTARIOS: readonly (keyof FormData)[] = ["nome_veterinario"];

/** Está respondido? A régua muda com o tipo, e é esta a única definição dela. */
export function estaPreenchido(campo: CampoDoFormulario, formData: FormData): boolean {
  const valor = formData[campo.chave];
  if (Array.isArray(valor)) return valor.length > 0;
  if (typeof valor === "string") return valor.trim() !== "";
  return false;
}

/** Este campo é exigido no estado actual do formulário? */
export function eExigido(campo: CampoDoFormulario, formData: FormData): boolean {
  return campo.exigidoQuando ? campo.exigidoQuando(formData) : true;
}

/** Os campos deste passo que o estado actual do formulário exige. */
export function camposExigidosDoPasso(
  passo: number,
  formData: FormData
): readonly CampoDoFormulario[] {
  return CAMPOS.filter((c) => c.passo === passo && eExigido(c, formData));
}

/**
 * Quantas respostas uma secção pede e quantas já lá estão.
 *
 * É o que o cabeçalho de cada secção mostra. O `total` sai das mesmas
 * condições que a validação usa, e por isso a conta de uma secção encolhe e
 * cresce com o que já foi respondido — um garanhão vê duas perguntas a mais
 * nas condições de venda, e a conta do cabeçalho di-lo em vez de mentir.
 */
export function contarSeccao(
  seccao: string,
  formData: FormData
): { feitos: number; total: number } {
  let total = 0;
  let feitos = 0;
  for (const campo of CAMPOS) {
    if (campo.seccao !== seccao || !eExigido(campo, formData)) continue;
    total++;
    if (estaPreenchido(campo, formData)) feitos++;
  }
  return { feitos, total };
}
