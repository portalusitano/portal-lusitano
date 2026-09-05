/**
 * O que viaja entre a API de revisão e o painel.
 *
 * Vive aqui, e não dentro de `app/api/admin/documentos/comum.ts`, por uma
 * razão prática: esse módulo importa `verifySession` e o cliente com a chave
 * de serviço, e o segundo **rebenta de propósito** se for carregado no
 * browser. Um `import type` é apagado na compilação e nunca chegaria lá — mas
 * bastava alguém acrescentar um `import` de um valor a este ficheiro para o
 * arrastar para o pacote do cliente. Separar os tipos tira essa hipótese do
 * mapa em vez de a deixar à disciplina de quem vier a seguir.
 *
 * O contrato de `lib/documentos/contrato.ts` é a fonte da verdade dos estados
 * e dos tipos; aqui só se descreve a forma da resposta HTTP.
 */

import type {
  Conflito,
  EstadoDeDocumento,
  MimeDeDocumento,
  TipoDeDocumento,
} from "@/lib/documentos/contrato";
import type { Nota, OrigemDaNota, VistaDeVerificacao } from "@/lib/documentos/verificacao";

export type { Nota, OrigemDaNota, VistaDeVerificacao };

/** Os quatro campos que se confrontam, e como se escrevem em português. */
export const ROTULO_DO_CAMPO: Readonly<Record<Conflito["campo"], string>> = {
  nome: "Nome",
  numero_registo: "Número de registo",
  ueln: "Passaporte (UELN)",
  microchip: "Microchip",
};

export const ROTULO_DO_TIPO: Readonly<Record<TipoDeDocumento, string>> = {
  livro_azul: "Livro Azul",
  passaporte: "Passaporte equino",
  exame_vet: "Exame veterinário",
};

/**
 * De onde é que cada nota veio, por extenso.
 *
 * **Não é uma escala**, e o painel não as pinta com cores diferentes por isso:
 * são quatro espécies de pergunta, e nenhuma delas vale mais do que outra. O
 * rótulo está lá para quem lê saber o que é que foi perguntado — «o ficheiro» é
 * uma pergunta sobre bytes e «entre anúncios» é uma pergunta sobre a tabela, e
 * as duas enganam-se de maneiras diferentes.
 */
export const ROTULO_DA_ORIGEM: Readonly<Record<OrigemDaNota, string>> = {
  ficheiro: "O ficheiro",
  cavalo: "O cavalo",
  entre_anuncios: "Entre anúncios",
  formulario: "Contra o formulário",
};

export const ROTULO_DO_ESTADO: Readonly<Record<EstadoDeDocumento, string>> = {
  por_verificar: "Por verificar",
  em_revisao: "Em revisão",
  verificado: "Verificado",
  recusado: "Recusado",
};

/**
 * Uma linha da fila. Só o que se lê de relance: o resto abre-se na ficha.
 *
 * Não traz `caminho` nem nada que aponte para o balde. O caminho do ficheiro
 * dentro do balde privado não tem utilidade nenhuma no browser e a única
 * coisa que faz é aumentar a superfície de quem o apanhe.
 */
export interface LinhaDaFila {
  id: string;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  /** ISO 8601. A ordem de chegada é a ordem da fila. */
  criadoEm: string;
  cavaloId: string | null;
  /** O nome do anúncio, quando já existe um. Antes do pagamento não existe. */
  cavaloNome: string | null;
  referencia: string;
  nomeOriginal: string;
  mime: MimeDeDocumento;
  bytes: number;
  /** Vazio quando a leitura automática não encontrou contradição nenhuma. */
  conflitos: Conflito[];
  /**
   * Quantas **outras submissões** trazem este mesmo ficheiro, byte a byte.
   * Zero é o caso normal; um ou mais é o sinal de fraude mais forte que este
   * sistema tem, e por isso sobe na fila.
   */
  duplicadoNoutras: number;
  verificadoPor: string | null;
  verificadoEm: string | null;
  motivoRecusa: string | null;
}

export interface RespostaDaFila {
  documentos: LinhaDaFila[];
  /** Quantos há em cada estado, para os filtros dizerem o tamanho da fila. */
  contagens: Record<EstadoDeDocumento, number>;
  /**
   * A fila foi cortada no tecto e há mais para lá dele. Dizer isto é preferível
   * a mostrar uma fila que parece completa e não é.
   */
  truncada: boolean;
}

/** De onde veio o valor da coluna «o que o vendedor escreveu». */
export type OrigemDoValor =
  /** Do anúncio publicado — o que o vendedor escreveu, tal como ficou gravado. */
  | "anuncio"
  /**
   * Do registo do conflito. O anúncio ainda não existe (o documento sobe antes
   * do pagamento), e o que resta é o valor que a leitura automática comparou.
   */
  | "conflito"
  /** Não há valor nenhum deste lado. */
  | "nenhuma";

/**
 * Um campo com os dois lados à frente um do outro.
 *
 * `noDocumento` vem sempre de uma leitura automática, e uma leitura automática
 * engana-se — é por isso que o painel a rotula como tal em vez de a apresentar
 * como o conteúdo do documento. Quem lê o documento é a pessoa que revê.
 */
export interface CampoConfrontado {
  campo: Conflito["campo"];
  rotulo: string;
  noFormulario: string | null;
  origemDoFormulario: OrigemDoValor;
  noDocumento: string | null;
  /** A leitura automática levantou a mão neste campo. Não decide nada. */
  emConflito: boolean;
}

/** Outro documento com o mesmo SHA-256, noutra submissão. */
export interface DuplicadoVizinho {
  id: string;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  criadoEm: string;
  cavaloId: string | null;
  cavaloNome: string | null;
  referencia: string;
}

export interface FichaDeDocumento {
  id: string;
  tipo: TipoDeDocumento;
  estado: EstadoDeDocumento;
  criadoEm: string;
  referencia: string;
  cavaloId: string | null;
  cavaloNome: string | null;
  cavaloSlug: string | null;
  cavaloEstado: string | null;
  vendedorNome: string | null;
  vendedorEmail: string | null;
  nomeOriginal: string;
  mime: MimeDeDocumento;
  bytes: number;
  /** Os primeiros doze caracteres do SHA-256 chegam para o identificar à vista. */
  sha256Curto: string;
  /** Como se chegou ao texto do documento, ou `null` se não se tentou. */
  origemDaLeitura: "pdf" | "nenhuma" | null;
  /** O texto extraído, quando existe. Serve para procurar sem abrir o ficheiro. */
  textoLido: string | null;
  campos: CampoConfrontado[];
  conflitos: Conflito[];
  duplicados: DuplicadoVizinho[];
  /**
   * Tudo o que os cinco motores sabem sobre este documento, já reunido e com a
   * explicação inocente ao lado de cada facto.
   *
   * Vem de `lib/documentos/verificacao.ts` e **não** decide nada: é a matéria
   * que quem revê lê antes de decidir. O tipo é importado de lá e não copiado —
   * duas ideias da mesma coisa acabam sempre com uma delas desactualizada.
   */
  verificacao: VistaDeVerificacao;
  motivoRecusa: string | null;
  verificadoPor: string | null;
  verificadoEm: string | null;
}
