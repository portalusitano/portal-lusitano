/**
 * Os documentos de um cavalo: o que são, onde ficam e o que quer dizer cada
 * estado.
 *
 * ## O que estava a acontecer, e é a razão de este módulo existir
 *
 * O formulário de venda pedia o **Livro Azul como obrigatório**: travava o
 * passo, pintava o alvo a vermelho, e ao anexar mostrava um visto verde.
 * O ficheiro ficava num `useState` do `app/vender-cavalo/page.tsx` — e o
 * `handleSubmit` **nunca o enviava a lado nenhum**. Subiam as fotografias,
 * seguia o formulário para o Stripe, e o `File` do Livro Azul desaparecia com
 * a página. Ninguém, em momento nenhum, recebia o documento.
 *
 * Ao lado disso gravava-se `documentos_em_dia: true` na base — um campo com
 * nome de facto verificado, alimentado por uma pergunta de sim ou não que o
 * próprio vendedor respondia sobre si mesmo.
 *
 * O visto verde não era um erro de programação com um sintoma pequeno: era o
 * site a **afirmar uma verificação que não existia**. É isso que aqui se
 * corrige, e é por isso que a regra central deste módulo é negativa —
 * *nada é verificado até alguém o ter verificado*.
 *
 * ## As três regras que não se negoceiam
 *
 * 1. **Um documento nunca é público.** O passaporte equino traz o nome e a
 *    morada do proprietário e o número do microchip. Vai para um balde
 *    privado, e lê-se por URL assinado de vida curta, só do lado do servidor,
 *    só para quem administra. As fotografias do cavalo é que são públicas —
 *    e vão para outro balde, como sempre foram.
 * 2. **O tipo do ficheiro lê-se nos bytes.** O `file.type` de um `FormData` é
 *    o que o cliente diz que enviou, não o que enviou. Quem decide é a
 *    assinatura no início do ficheiro.
 * 3. **`verificado` quer dizer que uma pessoa olhou.** Nenhuma leitura
 *    automática promove um documento a verificado; o mais que faz é preparar
 *    o trabalho de quem revê, e levantar a mão quando encontra uma
 *    contradição. Um site de classificados que carimbe documentos sozinho
 *    está a emprestar credibilidade que não tem como sustentar.
 */

/** Os documentos que o formulário pede. */
export const TIPOS_DE_DOCUMENTO = ["livro_azul", "passaporte", "exame_vet"] as const;
export type TipoDeDocumento = (typeof TIPOS_DE_DOCUMENTO)[number];

/**
 * O percurso de um documento. É deliberadamente curto: cada estado a mais é um
 * estado que alguém tem de saber ler no painel de revisão.
 *
 * - `por_verificar` — chegou, está guardado, ninguém olhou. **É onde tudo
 *   começa e onde a maior parte vive.**
 * - `em_revisao` — alguém o abriu e ainda não decidiu. Existe para que dois
 *   administradores não revejam o mesmo documento ao mesmo tempo.
 * - `verificado` — uma pessoa confirmou que o documento é o que diz ser e que
 *   corresponde ao cavalo do anúncio. **O único estado que o público vê.**
 * - `recusado` — não serve, e o `motivo_recusa` diz porquê. O vendedor é
 *   avisado e pode substituí-lo; o anúncio não fica com marca nenhuma.
 */
export const ESTADOS_DE_DOCUMENTO = [
  "por_verificar",
  "em_revisao",
  "verificado",
  "recusado",
] as const;
export type EstadoDeDocumento = (typeof ESTADOS_DE_DOCUMENTO)[number];

/**
 * Os formatos que se aceitam, pela assinatura que têm nos primeiros bytes.
 *
 * A extensão do nome do ficheiro não entra nesta decisão e o `Content-Type`
 * declarado também não: os dois são texto que o cliente escreveu.
 */
export const MIMES_DE_DOCUMENTO = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export type MimeDeDocumento = (typeof MIMES_DE_DOCUMENTO)[number];

export const EXTENSAO_DO_MIME: Readonly<Record<MimeDeDocumento, string>> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

/** Dez megabytes. Um Livro Azul digitalizado a 300dpi cabe folgado. */
export const MAX_BYTES_DOCUMENTO = 10 * 1024 * 1024;

/**
 * O balde privado. Não tem — e não pode vir a ter — política de leitura
 * pública: ver a migração que o cria.
 */
export const BALDE_DOCUMENTOS = "documentos-cavalos";

/**
 * Onde o ficheiro assenta dentro do balde.
 *
 * A referência vem primeiro para que apagar tudo o que pertence a uma
 * submissão seja apagar um prefixo. O nome é um UUID e não o nome original:
 * o nome que o vendedor deu ao ficheiro é dele e pode trazer lá dentro o que
 * lhe apetecer, incluindo caminhos.
 */
export function caminhoDoDocumento(
  referencia: string,
  tipo: TipoDeDocumento,
  id: string,
  mime: MimeDeDocumento
): string {
  return `${referencia}/${tipo}/${id}.${EXTENSAO_DO_MIME[mime]}`;
}

/**
 * O que se leu de dentro do documento, quando se conseguiu ler.
 *
 * Tudo é opcional de propósito: uma fotografia tirada com um
 * telemóvel a um passaporte pousado numa mesa não dá nenhum destes campos, e
 * isso não é um erro — é o caso normal.
 */
export interface LeituraDoDocumento {
  /** O texto que se extraiu, para quem revê poder procurar sem abrir o PDF. */
  texto?: string;
  ueln?: string;
  microchip?: string;
  numeroRegisto?: string;
  nome?: string;
  /** Como se chegou ao texto: `pdf` (camada de texto) ou `nenhuma`. */
  origem: "pdf" | "nenhuma";
}

/**
 * Uma contradição entre o que o documento diz e o que o vendedor escreveu.
 *
 * **Não recusa nada por si.** Uma leitura automática engana-se, e recusar um
 * anúncio verdadeiro por causa de um algarismo mal lido é o erro caro. O que
 * isto faz é pôr o caso à frente na fila de quem revê, com os dois valores
 * lado a lado.
 */
export interface Conflito {
  campo: "ueln" | "microchip" | "numero_registo" | "nome";
  noFormulario: string;
  noDocumento: string;
}

/** Uma linha da tabela `documentos_cavalo`, do lado do servidor. */
export interface DocumentoGuardado {
  id: string;
  cavalo_id: string | null;
  referencia: string;
  tipo: TipoDeDocumento;
  caminho: string;
  nome_original: string;
  /** O MIME **lido nos bytes**, nunca o declarado. */
  mime: MimeDeDocumento;
  bytes: number;
  /** SHA-256 do conteúdo. É o que denuncia o mesmo documento em dois cavalos. */
  sha256: string;
  estado: EstadoDeDocumento;
  motivo_recusa: string | null;
  verificado_por: string | null;
  verificado_em: string | null;
  leitura: LeituraDoDocumento | null;
  conflitos: Conflito[] | null;
  criado_em: string;
}

/**
 * A pergunta que o anúncio público faz, e a única resposta que lhe interessa.
 *
 * Está aqui, num sítio só, para que nunca haja duas ideias de «verificado» no
 * mesmo site. Repare-se no que **não** conta: ter enviado o documento não
 * conta, ter respondido «sim» à pergunta dos documentos em dia não conta, e
 * estar à espera de revisão não conta.
 */
export function temDocumentacaoVerificada(
  documentos: Pick<DocumentoGuardado, "tipo" | "estado">[]
) {
  return documentos.some((d) => d.tipo === "livro_azul" && d.estado === "verificado");
}
