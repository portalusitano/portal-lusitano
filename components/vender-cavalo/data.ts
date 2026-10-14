import { paisesParaEscolha } from "@/lib/paises";

import type { FormData } from "@/components/vender-cavalo/types";

export const initialFormData: FormData = {
  // Proprietário
  proprietario_nome: "",
  proprietario_email: "",
  proprietario_telefone: "",
  proprietario_whatsapp: "",
  proprietario_nif: "",
  proprietario_morada: "",
  tipo_proprietario: "",
  pais_proprietario: "",
  website_coudelaria: "",
  // Identificação
  nome: "",
  nome_registo: "",
  numero_registo: "",
  microchip: "",
  passaporte_equino: "",
  raca_confirmada: "",
  pais_nascimento: "",
  peso: "",
  cor_olhos: "",
  cor_crina: "",
  nivel_apsl: "",
  // Linhagem
  pai_nome: "",
  pai_registo: "",
  mae_nome: "",
  mae_registo: "",
  avo_paterno_nome: "",
  avo_paterno_registo: "",
  avo_paterno_mae_nome: "",
  avo_paterno_mae_registo: "",
  avo_materno_nome: "",
  avo_materno_registo: "",
  avo_materno_mae_nome: "",
  avo_materno_mae_registo: "",
  linhagem_principal: "",
  coudelaria_origem: "",
  // Características
  data_nascimento: "",
  sexo: "",
  pelagem: "",
  altura: "",
  temperamento: "",
  marcas_distintivas: "",
  cor_casco: "",
  prova_aptidao_apsl: "",
  // Comportamento
  habituado_transporte: "",
  habituado_ferrador: "",
  habituado_veterinario: "",
  trabalha_em_grupo: "",
  trabalha_solto: "",
  trabalha_a_mao: "",
  habituado_campo: "",
  apto_criancas: "",
  // Maneio
  regime_estabulacao: "",
  tipo_alimentacao: "",
  horas_trabalho_semana: "",
  teste_dna_realizado: "",
  seguro_equino: "",
  // Treino
  nivel_treino: "",
  anos_treino: "",
  nivel_cavaleiro: "",
  treinador_atual: "",
  ginete_habitual: "",
  uso_atual: [],
  disciplinas: [],
  competicoes: "",
  premios: "",
  // Saúde
  estado_saude: "",
  vacinacao_atualizada: "",
  data_ultima_vacinacao: "",
  desparasitacao_atualizada: "",
  data_ultima_desparasitacao: "",
  exame_veterinario: "",
  radiografias_disponivel: "",
  piroplasmose_testado: "",
  data_ultima_ferragem: "",
  tipo_ferragem: "",
  nome_veterinario: "",
  historico_lesoes: "",
  observacoes_saude: "",
  // Venda
  preco: "",
  negociavel: "",
  aceita_troca: "",
  transporte_incluido: "",
  trial_possivel: "",
  duracao_trial: "",
  financiamento_possivel: "",
  exportacao_possivel: "",
  acompanhamento_pos_venda: "",
  disponivel_cobricao: "",
  preco_cobricao: "",
  regiao: "",
  localizacao: "",
  disponibilidade_visita: "",
  motivo_venda: "",
  aceita_visita_veterinario: "",
  equipamento_incluido: "",
  // Apresentação
  descricao: "",
  videos_url: "",
  videos_url_2: "",
  internato_possivel: "",
  aulas_incluidas: "",
};

export const tiposProprietario = {
  pt: [
    "Particular",
    "Coudelaria",
    "Marchante / Comerciante",
    "Leiloeiro",
    "Clube / Escola de Equitação",
  ],
  en: ["Private individual", "Stud farm", "Riding club / school", "Trader / Agent"],
  es: ["Particular", "Criadero", "Club / Escuela de equitación", "Comerciante / Agente"],
};

/**
 * Os países, para as duas caixas que os pedem: onde reside o vendedor e onde
 * nasceu o cavalo.
 *
 * Eram onze escritos à mão, e o décimo segundo chamava-se «Outro» — que é o
 * que uma lista curta produz: uma gaveta onde o dado se perde. Num site que
 * vende Lusitanos para fora, «Outro» era a resposta certa para meio mundo.
 *
 * São 251, e vêm de `lib/paises`: os nomes não estão escritos em lado nenhum,
 * é o `Intl.DisplayNames` que os traduz a partir do código ISO. Os dez onde o
 * Lusitano está ficam em cima, pela ordem em que lá estavam; o resto vem por
 * ordem alfabética das regras do português — que sabe que o Á ordena com o A,
 * coisa que um `sort()` não sabe.
 *
 * Fica em português porque é a forma que estas duas caixas já consomem — uma
 * lista de nomes. **A versão certa guarda o código e não o nome** («Alemanha»,
 * «Germany» e «Alemania» são o mesmo país; `DE` é o mesmo em qualquer língua),
 * e `paisesParaEscolha(lingua)` já a serve. Trocar exige mexer nos dois
 * `Step*.tsx` que desenham as caixas, e esses estão neste momento com outro
 * trabalho em cima.
 */
const { frequentes, restantes } = paisesParaEscolha("pt-PT");
export const paisesOpcoes = [...frequentes, ...restantes].map((p) => p.nome);

export const usosAtuais = {
  pt: [
    "Dressage",
    "Equitação de Trabalho",
    "Toureio",
    "Atrelagem",
    "Saltos",
    "Passeio / Lazer",
    "Reprodução",
    "Ensino / Escola",
    "Alta Escola",
    "Endurance",
  ],
  en: [
    "Leisure / Hacking",
    "Dressage / High School",
    "Working Equitation",
    "Show Jumping",
    "Trail / Endurance",
    "Breeding",
    "Competition",
    "Therapy / Hippotherapy",
    "Teaching / Lessons",
  ],
  es: [
    "Ocio / Paseo",
    "Dressage / Alta Escuela",
    "Equitación de Trabajo",
    "Salto de Obstáculos",
    "Trail / Endurance",
    "Reproducción",
    "Competición",
    "Terapia / Hipoterapia",
    "Enseñanza / Clases",
  ],
};

export const regimesEstabulacao = {
  pt: [
    "Estábulo (box individual)",
    "Paddock individual",
    "Pastagem / campo aberto",
    "Misto (box + campo)",
    "Coudelaria coletiva",
  ],
  en: ["Box 24h", "Paddock / Field", "Semi-feral", "Mixed (box + paddock)"],
  es: ["Box 24h", "Paddock / Campo", "Semi-libertad", "Mixto (box + paddock)"],
};

export const tiposAlimentacao = {
  pt: [
    "Feno + concentrado",
    "Pastagem natural",
    "Pastagem + concentrado",
    "Feno + aveia",
    "Ração completa",
    "Dieta personalizada",
  ],
  en: [
    "Hay + Feed",
    "Hay + Specific Concentrate",
    "Pasture only",
    "Pasture + Supplement",
    "Complete feed",
  ],
  es: [
    "Heno + Pienso",
    "Heno + Concentrado Específico",
    "Solo pasto",
    "Pasto + Suplemento",
    "Alimentación completa",
  ],
};

export const motivosVenda = {
  pt: [
    "Excesso de cavalos na coudelaria",
    "Mudança de disciplina",
    "Mudança de vida / situação pessoal",
    "Razões económicas",
    "Reforma do cavalo",
    "Incompatibilidade cavaleiro-cavalo",
    "Outro",
  ],
  en: [
    "Change of activity",
    "Horse upgrade",
    "Financial reasons",
    "Lack of time",
    "Horse retirement",
    "Breeding programme change",
    "Relocation",
    "Other",
  ],
  es: [
    "Cambio de actividad",
    "Mejora de caballo",
    "Razones económicas",
    "Falta de tiempo",
    "Retiro del caballo",
    "Cambio de programa de cría",
    "Traslado",
    "Otro",
  ],
};

export const coresCrina = ["Loura", "Escura", "Prateada", "Mista (loura e escura)"];

export const pelagens = {
  pt: ["Ruço", "Castanho", "Preto", "Alazão", "Baio", "Palomino", "Tordilho", "Isabelo", "Malhado"],
  en: [
    "Grey",
    "Brown",
    "Black",
    "Bay",
    "Chestnut",
    "Palomino",
    "Cremello",
    "Buckskin",
    "Dun",
    "Roan",
    "Piebald/Skewbald",
    "Other",
  ],
  es: [
    "Tordo",
    "Castaño",
    "Negro",
    "Bayo",
    "Alazán",
    "Palomino",
    "Cremello",
    "Bayo Oscuro",
    "Bayo Claro",
    "Ruano",
    "Pío",
    "Otro",
  ],
};

export const niveisTreino = {
  pt: [
    "Potro (sem desbaste)",
    "Desbravado",
    "Iniciado",
    "Intermédio",
    "Avançado",
    "Alta Escola",
    "Competição",
  ],
  en: [
    "Foal (unbroken)",
    "Started",
    "Initiated",
    "Intermediate",
    "Advanced",
    "High School",
    "Competition",
  ],
  es: [
    "Potro (sin domar)",
    "Iniciado",
    "Comenzado",
    "Intermedio",
    "Avanzado",
    "Alta Escuela",
    "Competición",
  ],
};

export const disciplinasOpcoes = {
  pt: [
    "Dressage",
    "Equitação de Trabalho",
    "Toureio",
    "Atrelagem",
    "Saltos",
    "Lazer",
    "Reprodução",
    "Ensino",
  ],
  en: [
    "Dressage",
    "Working Equitation",
    "Bullfighting",
    "Driving",
    "Show Jumping",
    "Leisure",
    "Breeding",
    "Teaching",
  ],
  es: [
    "Dressage",
    "Equitación de Trabajo",
    "Rejoneo",
    "Enganche",
    "Salto de Obstáculos",
    "Ocio",
    "Reproducción",
    "Enseñanza",
  ],
};

export const disponibilidades = [
  "Imediata",
  "Após acordo",
  "Fins de semana",
  "Dias úteis",
  "Por marcação",
];

export const linhagensPrincipais = [
  "Veiga",
  "Andrade",
  "Coudelaria Nacional",
  "Alter Real",
  "Interagro",
  "Mistas",
];

export const tiposFerragemOpcoes = {
  pt: [
    "Ferrado (4 ferros)",
    "Ferrado (anterior)",
    "Ferrado (posterior)",
    "Descalço",
    "Com borrachas",
    "Misto",
  ],
  en: ["Traditional shoes", "Barefoot", "Rubber shoes", "Partial shoes", "Therapeutic shoes"],
  es: [
    "Herradura tradicional",
    "Sin herradura",
    "Herradura de goma",
    "Herradura parcial",
    "Herradura terapéutica",
  ],
};

export const coresOlhos = ["Castanho", "Âmbar", "Azul", "Heterocromia"];

export const coresCasco = ["Escuro", "Branco", "Misto (escuro e branco)", "Listado"];

export const temperamentosOpcoes = {
  pt: ["Calmo", "Sensível", "Energético", "Difícil"],
  en: ["Very Calm", "Calm", "Balanced", "Sensitive", "Very Sensitive"],
  es: ["Muy Tranquilo", "Tranquilo", "Equilibrado", "Sensible", "Muy Sensible"],
};

export const niveisCavaleiro = {
  pt: ["Principiante", "Intermédio", "Avançado", "Profissional / Competidor"],
  en: ["Beginner", "Intermediate", "Advanced", "Professional"],
  es: ["Principiante", "Intermedio", "Avanzado", "Profesional"],
};

export const duracoesTrialOpcoes = ["1 semana", "2 semanas", "1 mês", "A combinar"];

export const regioesPT = [
  "Aveiro",
  "Beja",
  "Braga",
  "Bragança",
  "Castelo Branco",
  "Coimbra",
  "Évora",
  "Faro",
  "Guarda",
  "Leiria",
  "Lisboa",
  "Portalegre",
  "Porto",
  "Santarém",
  "Setúbal",
  "Viana do Castelo",
  "Vila Real",
  "Viseu",
  "Açores",
  "Madeira",
];

export const TOTAL_STEPS = 4;
export const MIN_IMAGES = 3;
export const MIN_DESCRIPTION_LENGTH = 100;
