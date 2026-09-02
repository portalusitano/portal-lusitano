import type { ErrosPorCampo } from "@/components/vender-cavalo/campos-com-erro";
import type { ApontamentosPorCampo } from "@/components/vender-cavalo/inspeccao";

export interface FormData {
  // Dados do Proprietario
  proprietario_nome: string;
  proprietario_email: string;
  proprietario_telefone: string;
  proprietario_whatsapp: string;
  proprietario_nif: string;
  proprietario_morada: string;
  tipo_proprietario: string;
  pais_proprietario: string;
  website_coudelaria: string;

  // Identificacao do Cavalo
  nome: string;
  nome_registo: string;
  numero_registo: string;
  microchip: string;
  passaporte_equino: string;
  raca_confirmada: string;
  pais_nascimento: string;
  peso: string;
  cor_olhos: string;
  cor_crina: string;
  nivel_apsl: string;

  // Linhagem
  pai_nome: string;
  pai_registo: string;
  mae_nome: string;
  mae_registo: string;
  avo_paterno_nome: string; // pai do pai
  avo_paterno_registo: string;
  avo_paterno_mae_nome: string; // mãe do pai
  avo_paterno_mae_registo: string;
  avo_materno_nome: string; // pai da mãe
  avo_materno_registo: string;
  avo_materno_mae_nome: string; // mãe da mãe
  avo_materno_mae_registo: string;
  linhagem_principal: string;
  coudelaria_origem: string;

  // Caracteristicas
  data_nascimento: string;
  sexo: string;
  pelagem: string;
  altura: string;
  temperamento: string;
  marcas_distintivas: string;
  cor_casco: string;
  prova_aptidao_apsl: boolean;

  // Treino e Competicao
  nivel_treino: string;
  anos_treino: string;
  nivel_cavaleiro: string;
  treinador_atual: string;
  ginete_habitual: string;
  uso_atual: string[];
  disciplinas: string[];
  competicoes: string;
  premios: string;

  // Comportamento e Maneabilidade
  habituado_transporte: boolean;
  habituado_ferrador: boolean;
  habituado_veterinario: boolean;
  trabalha_em_grupo: boolean;
  trabalha_solto: boolean;
  trabalha_a_mao: boolean;
  habituado_campo: boolean;
  apto_criancas: boolean;

  // Maneio
  regime_estabulacao: string;
  tipo_alimentacao: string;
  horas_trabalho_semana: string;
  teste_dna_realizado: boolean;
  seguro_equino: boolean;

  // Saude
  estado_saude: string;
  vacinacao_atualizada: boolean;
  data_ultima_vacinacao: string;
  desparasitacao_atualizada: boolean;
  data_ultima_desparasitacao: string;
  exame_veterinario: boolean;
  radiografias_disponivel: boolean;
  piroplasmose_testado: boolean;
  data_ultima_ferragem: string;
  tipo_ferragem: string;
  nome_veterinario: string;
  historico_lesoes: string;
  observacoes_saude: string;

  // Venda
  preco: string;
  negociavel: boolean;
  aceita_troca: boolean;
  transporte_incluido: boolean;
  trial_possivel: boolean;
  duracao_trial: string;
  financiamento_possivel: boolean;
  exportacao_possivel: boolean;
  acompanhamento_pos_venda: boolean;
  disponivel_cobricao: boolean;
  preco_cobricao: string;
  regiao: string;
  localizacao: string;
  disponibilidade_visita: string;
  motivo_venda: string;
  aceita_visita_veterinario: boolean;
  equipamento_incluido: string;

  // Descricao
  descricao: string;
  videos_url: string;
  videos_url_2: string;
  internato_possivel: boolean;
  aulas_incluidas: boolean;
}

export interface Documentos {
  livroAzul?: File;
  passaporte?: File;
  exameVet?: File;
}

export type DocumentType = keyof Documentos;

export interface AccoesCampo {
  aoFocar: (campo: string, valor: string) => void;
  aoSair: (campo: string) => void;
  /** Uma escolha numa lista é um acto acabado: fala logo, sem esperar pelo `blur`. */
  aoEscolher: (campo: string) => void;
  /** Escreve no campo a correcção que uma sugestão propõe. */
  aoAceitar: (campo: string, valor: string) => void;
}

export interface StepProps {
  formData: FormData;
  updateField: (field: keyof FormData, value: FormData[keyof FormData]) => void;
  /**
   * Os campos deste passo que estão a travar quem quer avançar, por `id`.
   * Chega a cada passo para que o erro se veja no campo e não só num resumo
   * no topo — num passo de quarenta e sete campos, o resumo sozinho manda
   * procurar.
   */
  erros: ErrosPorCampo;
  /**
   * O que cada campo tem a dizer sobre si próprio e que **não** o impede de
   * avançar — 193cm de altura, um preço com um zero a menos, um domínio de
   * email a um passo de `gmail.com`. Chega já filtrado pelo momento: um campo
   * onde ainda ninguém entrou não aparece aqui (ver `usar-inspeccao.ts`).
   */
  apontamentos: ApontamentosPorCampo;
  /**
   * Os três momentos de um campo. É deles que sai a regra de nunca marcar a
   * vermelho quem ainda está a escrever, e a de avisar ao sair em vez de
   * esperar pelo botão de Continuar.
   */
  campo: AccoesCampo;
}
