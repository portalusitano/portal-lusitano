/**
 * O lado de quem enviou o documento.
 *
 * ## Porque existe
 *
 * O circuito da revisão estava fechado só de um lado. Um vendedor anexava o
 * Livro Azul, pagava, e a partir daí não havia nada: não sabia se o ficheiro
 * tinha chegado, não sabia se alguém lhe tinha pegado, e **se fosse recusado
 * não era avisado de coisa nenhuma** — o motivo ficava gravado na base e mais
 * nada acontecia. É a mesma falha do visto verde com outra cara: prometer uma
 * revisão e não a mostrar a quem depende dela.
 *
 * ## O que este módulo decide, e o que deliberadamente não mostra
 *
 * Decide **as palavras** de cada estado, num sítio só, para que não haja duas
 * ideias de «verificado» no site — a mesma razão pela qual
 * `temDocumentacaoVerificada` vive sozinha no contrato. E decide **o que sai**
 * da linha da base para o browser do vendedor.
 *
 * Fica de fora, e cada um por uma razão:
 *
 * - `caminho` — é o endereço dentro do balde privado. Não abre nada, mas um
 *   caminho de armazenamento que chega ao cliente acaba colado num relatório
 *   de erro.
 * - `leitura` e `conflitos` — são uma leitura **automática**, que se engana. O
 *   painel de revisão mostra-a rotulada como tal a quem sabe lê-la; mandá-la
 *   para o vendedor seria o site a afirmar sobre o documento dele uma coisa
 *   que nenhuma pessoa confirmou. O que o vendedor lê é o que quem reviu
 *   escreveu à mão, e mais nada.
 * - `verificado_por` — o e-mail de quem revê não é do vendedor.
 * - `sha256` — não lhe diz nada e identifica o ficheiro byte a byte.
 *
 * ## O que autoriza
 *
 * A `referencia` **não** autoriza. Vem do browser, quem quiser manda a que lhe
 * apetecer, e a rota que a recebe já o tem escrito. O que liga um documento a
 * uma pessoa é o anúncio: `documentos_cavalo.cavalo_id` →
 * `cavalos_venda.user_id` → a sessão. Um documento ainda sem `cavalo_id` —
 * enviado antes de o pagamento existir — **não tem dono conhecido** e por isso
 * não aparece a ninguém.
 */

import type { User } from "@supabase/supabase-js";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import {
  ESTADOS_DE_DOCUMENTO,
  MIMES_DE_DOCUMENTO,
  TIPOS_DE_DOCUMENTO,
  type EstadoDeDocumento,
  type MimeDeDocumento,
  type TipoDeDocumento,
} from "@/lib/documentos/contrato";

export const TABELA_DOCUMENTOS = "documentos_cavalo";
export const TABELA_ANUNCIOS = "cavalos_venda";

/**
 * As colunas que o vendedor vê. Escritas à mão e não `*`: uma coluna nova na
 * tabela não pode passar a sair daqui só porque alguém a acrescentou.
 */
export const COLUNAS_PARA_O_VENDEDOR =
  "id, cavalo_id, tipo, estado, motivo_recusa, nome_original, mime, bytes, criado_em, verificado_em";

/** Como se escreve cada tipo em português. Igual ao painel de revisão. */
export const NOME_DO_TIPO: Readonly<Record<TipoDeDocumento, string>> = {
  livro_azul: "Livro Azul",
  passaporte: "Passaporte equino",
  exame_vet: "Exame veterinário",
};

/**
 * O tom com que cada estado se pinta.
 *
 * `bom` é só um: `verificado`. Foi um visto verde a afirmar uma verificação
 * inexistente que motivou este trabalho todo, e um documento recebido pintado
 * de verde é exactamente o mesmo erro com outra cor. Quem chegou e ainda não
 * foi visto é **neutro** — nem bom nem mau, porque ainda não é nada.
 */
export type TomDoEstado = "neutro" | "bom" | "mau";

export interface PalavrasDoEstado {
  /** O que se lê a negrito. Não é um rótulo técnico: é uma frase. */
  titulo: string;
  /** A linha por baixo. Diz o que falta acontecer, sem prometer quando. */
  explicacao: string;
  tom: TomDoEstado;
}

/**
 * As quatro frases, e a razão de cada uma.
 *
 * - `por_verificar` — «Recebido» é tudo o que se pode afirmar: o ficheiro
 *   chegou e está guardado. **Não** é «em análise»: ninguém lhe pegou, e
 *   «análise» descreve trabalho que não está a acontecer.
 * - `em_revisao` — aqui sim alguém lhe pegou, e é o único caso em que se pode
 *   dizer no presente contínuo.
 * - `verificado` — «por nós» de propósito: o que dá valor ao carimbo é ter
 *   sido uma pessoa desta casa a olhar, e é isso que a frase diz.
 * - `recusado` — a frase não explica nada porque a explicação é o motivo que
 *   quem reviu escreveu, e esse mostra-se tal como foi escrito.
 *
 * Nenhuma delas traz um prazo. Não há fila com prazo e não há nada que a
 * percorra sozinho; escrever «em 24 horas» seria inventar um compromisso que
 * ninguém está a cumprir.
 */
export const PALAVRAS_DO_ESTADO: Readonly<Record<EstadoDeDocumento, PalavrasDoEstado>> = {
  por_verificar: {
    titulo: "Recebido. Ainda não foi revisto.",
    explicacao: "O ficheiro chegou e está guardado. Ninguém o abriu ainda.",
    tom: "neutro",
  },
  em_revisao: {
    titulo: "Está a ser revisto.",
    explicacao: "Alguém da equipa abriu o documento e ainda não decidiu.",
    tom: "neutro",
  },
  verificado: {
    titulo: "Verificado por nós.",
    explicacao: "Uma pessoa da equipa confirmou o documento e que corresponde a este cavalo.",
    tom: "bom",
  },
  recusado: {
    titulo: "Recusado.",
    explicacao: "Pode enviar outro ficheiro para o mesmo documento.",
    tom: "mau",
  },
};

/** O que viaja da API para o browser do vendedor. Repare-se em quem não está cá. */
export interface DocumentoDoVendedor {
  id: string;
  anuncioId: string;
  tipo: TipoDeDocumento;
  nomeDoTipo: string;
  estado: EstadoDeDocumento;
  /** ISO 8601 — quando o ficheiro chegou. */
  criadoEm: string;
  /** ISO 8601 — quando foi decidido, ou `null` enquanto não o for. */
  decididoEm: string | null;
  /** Tal como quem reviu o escreveu. Vazio em tudo o que não seja `recusado`. */
  motivoRecusa: string | null;
  nomeOriginal: string;
  mime: MimeDeDocumento;
  bytes: number;
  /**
   * Já foi substituído por um envio mais recente do mesmo tipo neste anúncio.
   *
   * Um documento recusado **não desaparece** quando se envia outro: a decisão
   * de quem reviu fica escrita. Mas repetir o convite «envie outro» debaixo de
   * três recusas antigas é dizer três vezes uma coisa que já foi feita uma.
   */
  substituido: boolean;
}

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

function estadoDaLinha(v: unknown): EstadoDeDocumento | null {
  return typeof v === "string" && (ESTADOS_DE_DOCUMENTO as readonly string[]).includes(v)
    ? (v as EstadoDeDocumento)
    : null;
}

function tipoDaLinha(v: unknown): TipoDeDocumento | null {
  return typeof v === "string" && (TIPOS_DE_DOCUMENTO as readonly string[]).includes(v)
    ? (v as TipoDeDocumento)
    : null;
}

function mimeDaLinha(v: unknown): MimeDeDocumento | null {
  return typeof v === "string" && (MIMES_DE_DOCUMENTO as readonly string[]).includes(v)
    ? (v as MimeDeDocumento)
    : null;
}

/**
 * Uma linha crua vira o que o vendedor vê, ou `null` se não tiver a forma do
 * contrato.
 *
 * `null` em vez de um valor por omissão de propósito: um documento com um
 * estado que este código não sabe ler não pode ser mostrado como
 * «por verificar» — seria inventar. Quem chama deita-o fora e regista.
 */
export function paraOVendedor(linha: Record<string, unknown>): DocumentoDoVendedor | null {
  const id = texto(linha.id);
  const anuncioId = texto(linha.cavalo_id);
  const tipo = tipoDaLinha(linha.tipo);
  const estado = estadoDaLinha(linha.estado);
  const mime = mimeDaLinha(linha.mime);
  const criadoEm = texto(linha.criado_em);

  if (!id || !anuncioId || !tipo || !estado || !mime || !criadoEm) return null;

  return {
    id,
    anuncioId,
    tipo,
    nomeDoTipo: NOME_DO_TIPO[tipo],
    estado,
    criadoEm,
    decididoEm: texto(linha.verificado_em),
    // Só numa recusa. Noutro estado a coluna devia estar vazia, e se não
    // estiver — uma recusa que alguém reabriu — o motivo antigo já não é
    // verdade sobre o estado actual e não se mostra.
    motivoRecusa: estado === "recusado" ? texto(linha.motivo_recusa) : null,
    nomeOriginal: texto(linha.nome_original) ?? "documento",
    mime,
    bytes: typeof linha.bytes === "number" ? linha.bytes : 0,
    substituido: false,
  };
}

/**
 * Marca como substituído tudo o que tenha, no mesmo anúncio e do mesmo tipo,
 * um envio mais recente.
 *
 * A ordem é a de chegada, e é o `criado_em` que manda — não a posição na lista,
 * que depende de como a consulta veio ordenada.
 */
export function marcarSubstituidos(documentos: DocumentoDoVendedor[]): DocumentoDoVendedor[] {
  const maisRecente = new Map<string, number>();
  for (const d of documentos) {
    const chave = `${d.anuncioId} ${d.tipo}`;
    const quando = Date.parse(d.criadoEm);
    if (Number.isNaN(quando)) continue;
    const actual = maisRecente.get(chave);
    if (actual === undefined || quando > actual) maisRecente.set(chave, quando);
  }

  return documentos.map((d) => {
    const quando = Date.parse(d.criadoEm);
    const topo = maisRecente.get(`${d.anuncioId} ${d.tipo}`);
    return {
      ...d,
      substituido: !Number.isNaN(quando) && topo !== undefined && quando < topo,
    };
  });
}

/** Um anúncio do vendedor, reduzido ao que a página dos documentos escreve. */
export interface AnuncioComDocumentos {
  id: string;
  nome: string;
  documentos: DocumentoDoVendedor[];
}

/**
 * Os anúncios do vendedor com os documentos de cada um.
 *
 * Duas consultas e não uma junção embutida. A junção do PostgREST filtra pelo
 * recurso incorporado, e um `!inner` que se perca numa reescrita deixa de
 * filtrar **em silêncio** — a consulta continua a devolver linhas, só que as de
 * toda a gente. Aqui a primeira consulta decide quais são os anúncios desta
 * sessão e a segunda só pode ler dentro dessa lista; se a primeira falhar não
 * há segunda.
 */
export async function anunciosComDocumentos(user: User): Promise<AnuncioComDocumentos[] | null> {
  const { data: anuncios, error: erroAnuncios } = await supabaseAdmin
    .from(TABELA_ANUNCIOS)
    .select("id, nome, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (erroAnuncios) {
    logger.error("[documentos-do-vendedor] falha a ler os anúncios", erroAnuncios);
    return null;
  }

  const linhasDeAnuncio = (anuncios ?? []) as Array<Record<string, unknown>>;
  const ids = linhasDeAnuncio.map((a) => texto(a.id)).filter((id): id is string => id !== null);

  if (ids.length === 0) return [];

  const { data: documentos, error: erroDocumentos } = await supabaseAdmin
    .from(TABELA_DOCUMENTOS)
    .select(COLUNAS_PARA_O_VENDEDOR)
    .in("cavalo_id", ids)
    .order("criado_em", { ascending: false });

  if (erroDocumentos) {
    logger.error("[documentos-do-vendedor] falha a ler os documentos", erroDocumentos);
    return null;
  }

  const lidos: DocumentoDoVendedor[] = [];
  for (const linha of (documentos ?? []) as Array<Record<string, unknown>>) {
    const documento = paraOVendedor(linha);
    if (!documento) {
      logger.warn("[documentos-do-vendedor] linha fora do contrato, ignorada", {
        id: typeof linha.id === "string" ? linha.id : null,
      });
      continue;
    }
    lidos.push(documento);
  }

  const marcados = marcarSubstituidos(lidos);
  const porAnuncio = new Map<string, DocumentoDoVendedor[]>();
  for (const d of marcados) {
    const lista = porAnuncio.get(d.anuncioId);
    if (lista) lista.push(d);
    else porAnuncio.set(d.anuncioId, [d]);
  }

  return linhasDeAnuncio.map((a) => ({
    id: texto(a.id) as string,
    nome: texto(a.nome) ?? "Anúncio sem nome",
    documentos: porAnuncio.get(texto(a.id) as string) ?? [],
  }));
}

/** Um documento e o anúncio a que pertence, quando a sessão é dona dos dois. */
export interface DocumentoComDono {
  documento: Record<string, unknown>;
  anuncioId: string;
  anuncioNome: string;
}

/**
 * O documento `id`, **se e só se** pertencer a um anúncio desta sessão.
 *
 * Devolve `null` para tudo o resto — não existe, não está ligado a anúncio
 * nenhum, ou o anúncio é de outra pessoa. A diferença entre esses casos não vai
 * na resposta de propósito: distinguir «não existe» de «não é seu» é dizer a
 * quem adivinha identificadores quais é que acertaram.
 */
export async function documentoDoVendedor(
  user: User,
  documentoId: string
): Promise<DocumentoComDono | null> {
  const { data, error } = await supabaseAdmin
    .from(TABELA_DOCUMENTOS)
    .select("id, cavalo_id, referencia, tipo, estado, caminho, mime, nome_original, motivo_recusa")
    .eq("id", documentoId)
    .maybeSingle();

  if (error) {
    logger.error("[documentos-do-vendedor] falha a ler o documento", error);
    return null;
  }
  if (!data) return null;

  const linha = data as Record<string, unknown>;
  const cavaloId = texto(linha.cavalo_id);

  // Sem anúncio não há dono. Um documento que subiu antes de o pagamento
  // existir só está ligado a uma `referencia`, e a referência veio do browser:
  // aceitá-la aqui era deixar qualquer pessoa pedir os documentos de qualquer
  // submissão desde que adivinhasse um UUID.
  if (!cavaloId) return null;

  const { data: anuncio, error: erroAnuncio } = await supabaseAdmin
    .from(TABELA_ANUNCIOS)
    .select("id, nome")
    .eq("id", cavaloId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (erroAnuncio) {
    logger.error("[documentos-do-vendedor] falha a confirmar o dono do anúncio", erroAnuncio);
    return null;
  }
  if (!anuncio) return null;

  const linhaAnuncio = anuncio as Record<string, unknown>;

  return {
    documento: linha,
    anuncioId: cavaloId,
    anuncioNome: texto(linhaAnuncio.nome) ?? "Anúncio sem nome",
  };
}
