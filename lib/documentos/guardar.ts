/**
 * Guardar um documento: o ficheiro no balde privado, a linha na tabela.
 *
 * Está separado da rota porque são duas responsabilidades diferentes — a rota
 * decide se aceita o pedido, isto executa-o — e porque a ordem das duas
 * escritas tem uma consequência que é preciso ter escrita num sítio só.
 *
 * ## A ordem, e o que acontece quando a segunda falha
 *
 * Primeiro o ficheiro, depois a linha. Ao contrário ficaria uma linha na fila
 * de revisão a apontar para um caminho vazio, e quem revê abria-a e não
 * encontrava nada — o pior dos dois estados possíveis, porque parece um
 * documento e não é.
 *
 * Se a linha falhar depois de o ficheiro subir, apaga-se o ficheiro. Isso é
 * **melhor esforço**, não uma transacção: o armazenamento e a base são dois
 * sistemas e não há como escrever nos dois atomicamente. Se a limpeza também
 * falhar, fica um ficheiro no balde sem linha nenhuma a apontar-lhe — que é a
 * sobra inofensiva das duas, porque nada o lê e o prefixo da referência
 * permite varrê-lo mais tarde.
 *
 * ## O que nunca acontece aqui
 *
 * - **Nunca se chama `getPublicUrl`.** O balde é privado e um URL público
 *   dele não é um link partilhável: é o nome e a morada do proprietário de um
 *   cavalo publicados num endereço. Quem precisar de ver um documento tira um
 *   URL assinado de vida curta, do servidor, e essa chamada não vive neste
 *   ficheiro.
 * - **Nunca se escreve um estado que não seja `por_verificar`.** Não há
 *   argumento para o mudar e não há caminho de código que o desvie. Promover
 *   um documento é acto de uma pessoa, noutro sítio.
 */

import { createHash, randomUUID } from "crypto";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import {
  BALDE_DOCUMENTOS,
  caminhoDoDocumento,
  type DocumentoGuardado,
  type MimeDeDocumento,
  type TipoDeDocumento,
} from "./contrato";

export const TABELA_DOCUMENTOS = "documentos_cavalo";

/**
 * Quantos documentos uma mesma referência pode acumular.
 *
 * São três tipos, e trocar um ficheiro por outro melhor é legítimo — uma
 * digitalização torta, uma fotografia desfocada. Quatro tentativas por tipo é
 * folga que chega para isso e tecto que impede uma referência de crescer sem
 * fim. Não substitui o limite por IP da rota: são coisas diferentes, e este
 * apanha o caso em que o mesmo formulário insiste, não o de alguém a inundar.
 */
export const MAX_DOCUMENTOS_POR_REFERENCIA = 12;

/** SHA-256 do conteúdo, em hexadecimal minúsculo — a forma que a coluna exige. */
export function sha256Hex(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/**
 * O nome que o vendedor deu ao ficheiro, arrumado antes de ser guardado.
 *
 * Não entra no caminho — o caminho é um UUID, e é isso que faz com que um nome
 * com `../` lá dentro não chegue a ser um problema. Mas é guardado, e mais
 * tarde é escrito num painel de revisão: um nome com bytes de controlo lá
 * dentro estraga registos e o que se lê num terminal, e um nome de dois mil
 * caracteres estraga uma tabela. Fica a última parte do caminho, sem
 * caracteres de controlo, com 200 caracteres de tecto.
 *
 * O que **não** se faz é reescrever o nome para uma forma «segura»: quem revê
 * ganha em ver o nome como ele veio, incluindo os acentos e os espaços.
 */
export function arrumarNomeOriginal(nome: string): string {
  const ultimaParte = nome.split(/[\\/]/).pop() ?? "";
  // Os caracteres de controlo (U+0000–U+001F e U+007F) saem; o resto do nome fica.
  const semControlo = ultimaParte.replace(/[\u0000-\u001F\u007F]/g, "").trim();
  const cortado = semControlo.slice(0, 200);
  return cortado || "documento";
}

export interface PedidoDeGuardar {
  referencia: string;
  tipo: TipoDeDocumento;
  /** O nome tal como veio do `FormData`; é aqui arrumado. */
  nomeOriginal: string;
  /** O MIME **lido nos bytes**. Quem o determina é `lib/documentos/tipo-real`. */
  mime: MimeDeDocumento;
  conteudo: Uint8Array;
}

/**
 * A linha que ficou escrita. É um subconjunto de `DocumentoGuardado` para que
 * os nomes dos campos continuem presos ao contrato e não derivem daqui.
 */
export type DocumentoNovo = Pick<
  DocumentoGuardado,
  | "id"
  | "referencia"
  | "tipo"
  | "caminho"
  | "nome_original"
  | "mime"
  | "bytes"
  | "sha256"
  | "estado"
>;

export type ResultadoDeGuardar =
  | { ok: true; documento: DocumentoNovo }
  /** `armazenamento` — o ficheiro não subiu. `base` — subiu e a linha não entrou. */
  | { ok: false; falha: "armazenamento" | "base" };

export async function guardarDocumento(pedido: PedidoDeGuardar): Promise<ResultadoDeGuardar> {
  const id = randomUUID();
  const caminho = caminhoDoDocumento(pedido.referencia, pedido.tipo, id, pedido.mime);
  const sha256 = sha256Hex(pedido.conteudo);
  const nomeOriginal = arrumarNomeOriginal(pedido.nomeOriginal);

  const { error: erroDeUpload } = await supabaseAdmin.storage
    .from(BALDE_DOCUMENTOS)
    .upload(caminho, pedido.conteudo, {
      contentType: pedido.mime,
      // O caminho leva um UUID gerado agora: `upsert: false` não é uma medida
      // contra colisões, que não há, é a garantia de que uma chamada repetida
      // nunca escreve por cima de um documento que já lá está.
      upsert: false,
    });

  if (erroDeUpload) {
    logger.error("Documento: falhou a subida para o balde privado", {
      referencia: pedido.referencia,
      tipo: pedido.tipo,
      erro: erroDeUpload.message,
    });
    return { ok: false, falha: "armazenamento" };
  }

  const linha = {
    id,
    referencia: pedido.referencia,
    tipo: pedido.tipo,
    caminho,
    nome_original: nomeOriginal,
    mime: pedido.mime,
    bytes: pedido.conteudo.byteLength,
    sha256,
    // Escrito à mão apesar de a coluna já ter este valor por omissão. São duas
    // afirmações da mesma coisa de propósito: a coluna protege de quem escreva
    // outra rota e se esqueça, e esta linha diz a quem lê o código que o estado
    // inicial não é uma consequência da base, é uma decisão.
    estado: "por_verificar" as const,
    // `cavalo_id` fica nulo: o anúncio ainda não existe. Quem os liga é a
    // costura que corre quando o Stripe confirma o pagamento.
  };

  const { error: erroDeInsercao } = await supabaseAdmin.from(TABELA_DOCUMENTOS).insert(linha);

  if (erroDeInsercao) {
    logger.error("Documento: o ficheiro subiu e a linha não entrou", {
      referencia: pedido.referencia,
      tipo: pedido.tipo,
      erro: erroDeInsercao.message,
    });

    // Limpeza de melhor esforço. Se falhar, o ficheiro fica no balde sem linha
    // — ninguém o lê, e o prefixo da referência dá por ele numa varredura.
    const { error: erroDeLimpeza } = await supabaseAdmin.storage
      .from(BALDE_DOCUMENTOS)
      .remove([caminho]);
    if (erroDeLimpeza) {
      logger.error("Documento: ficheiro órfão no balde", {
        caminho,
        erro: erroDeLimpeza.message,
      });
    }

    return { ok: false, falha: "base" };
  }

  return { ok: true, documento: linha };
}

/**
 * Guardar o que a análise automática leu, numa linha que já existe.
 *
 * ## Porque é que isto é uma segunda escrita e não parte da primeira
 *
 * O documento tem de entrar **antes** de se saber o que ele é. A análise é CPU
 * medida em segundos (ver a nota na rota) e corre depois de a resposta seguir;
 * se ela fizesse parte do `insert`, o vendedor esperava por ela para poder
 * pagar, e um analisador que rebentasse levava consigo o Livro Azul. Primeiro
 * guarda-se, depois analisa-se, e o que a análise souber vem por cima.
 *
 * ## O que esta função nunca escreve
 *
 * **O `estado`.** Não está no `update` e não pode vir a estar: nenhuma leitura
 * automática promove um documento, e o único sítio onde `verificado` se escreve
 * é a rota que uma pessoa aciona com o documento aberto à frente. O `where`
 * também não filtra por estado — se alguém já reviu o documento entretanto, a
 * análise entra à mesma nas colunas dela e não toca na decisão dessa pessoa.
 *
 * ## A coluna `forense` pode ainda não existir
 *
 * Ela vem de uma migração à parte, e este código pode correr contra uma base
 * que ainda não a tem. Nesse caso a escrita inteira falharia e perdia-se também
 * a `leitura` — que é a que os sinais entre anúncios leem e a que não se pode
 * recalcular sem voltar a descarregar o ficheiro. Por isso tenta-se com as três
 * colunas e, se a base disser que não conhece a coluna, repete-se com as duas
 * que ela de certeza tem. Fica escrito no registo, para que a migração em falta
 * se veja em vez de se adivinhar.
 */
export async function guardarAnalise(
  id: string,
  analise: { leitura: unknown; conflitos: unknown; forense: unknown }
): Promise<boolean> {
  const comExame = {
    leitura: analise.leitura,
    conflitos: analise.conflitos,
    forense: analise.forense,
  };

  const { error } = await supabaseAdmin.from(TABELA_DOCUMENTOS).update(comExame).eq("id", id);
  if (!error) return true;

  // `PGRST204` é o que o PostgREST devolve quando a coluna não está no esquema
  // que ele conhece. Compara-se também pela mensagem porque o código mudou de
  // valor entre versões e uma verificação só pelo código já falhou por menos.
  const colunaEmFalta =
    error.code === "PGRST204" || /forense/i.test(`${error.message} ${error.details ?? ""}`);

  if (!colunaEmFalta) {
    logger.error("Documento: a análise não ficou guardada", { id, erro: error.message });
    return false;
  }

  logger.warn("Documento: a coluna `forense` não existe; guardada só a leitura", {
    id,
    erro: error.message,
  });

  const { error: erroSemExame } = await supabaseAdmin
    .from(TABELA_DOCUMENTOS)
    .update({ leitura: analise.leitura, conflitos: analise.conflitos })
    .eq("id", id);

  if (erroSemExame) {
    logger.error("Documento: a análise não ficou guardada", {
      id,
      erro: erroSemExame.message,
    });
    return false;
  }

  return true;
}

/**
 * Quantos documentos esta referência já tem.
 *
 * Devolve `null` quando a pergunta não pôde ser feita — e quem chama trata o
 * `null` como «não sei», não como zero. Recusar uma submissão legítima porque
 * uma contagem falhou sai mais caro do que aceitar um documento a mais numa
 * referência que já tem onze.
 */
export async function contarDocumentosDaReferencia(referencia: string): Promise<number | null> {
  const { count, error } = await supabaseAdmin
    .from(TABELA_DOCUMENTOS)
    .select("id", { count: "exact", head: true })
    .eq("referencia", referencia);

  if (error) {
    logger.warn("Documento: não se conseguiu contar os da referência", {
      referencia,
      erro: error.message,
    });
    return null;
  }

  return count ?? 0;
}
