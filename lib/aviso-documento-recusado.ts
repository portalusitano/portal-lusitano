/**
 * Avisar quem enviou um documento de que ele foi recusado.
 *
 * ## Porque é um módulo e não três linhas dentro da rota que recusa
 *
 * Porque a rota que recusa vive em `app/api/admin/documentos/[id]/recusar/` e
 * o aviso é do lado do vendedor. Separá-los tem uma consequência prática: o
 * aviso pode ser chamado outra vez — por um reenvio manual, por uma varredura
 * — sem ter de repetir a decisão, e a decisão não passa a depender de um
 * serviço de e-mail estar de pé.
 *
 * ## O que é preciso ser verdade para o e-mail sair
 *
 * 1. O documento existe e está mesmo em `recusado`. Ler o estado outra vez, e
 *    não confiar em quem chama, é o que impede um aviso de recusa a sair sobre
 *    um documento que entretanto foi reaberto.
 * 2. Tem um `motivo_recusa` escrito. Sem motivo o e-mail não tem corpo, e um
 *    aviso que diz «foi recusado» e mais nada é o fim de uma conversa que
 *    ninguém pode continuar. A base já exige o motivo; isto é a segunda
 *    afirmação da mesma coisa, para o caso de a primeira mudar.
 * 3. Está ligado a um anúncio, e o anúncio tem um endereço. Um documento que
 *    subiu antes de o pagamento existir **não tem a quem ser enviado**: não há
 *    anúncio, não há conta, e a `referencia` não traz endereço nenhum. Nesse
 *    caso devolve-se a razão em vez de se falhar em silêncio.
 *
 * ## Quem chama isto
 *
 * Dois caminhos, e o segundo existe por causa do primeiro:
 *
 * 1. **A recusa**, em `POST /api/admin/documentos/[id]/recusar`, no instante em
 *    que ela acontece. Não deixa cair a recusa se o aviso falhar: a decisão de
 *    quem revê já está gravada, e desfazê-la — ou devolver um erro a quem a
 *    tomou — porque um serviço de e-mail não respondeu seria trocar um problema
 *    por outro maior.
 * 2. **A varredura diária**, em `GET /api/cron/avisos-de-recusa`, que apanha o
 *    que ficou por avisar. É a metade que faltava: sem ela, um aviso que não
 *    saísse ficava um `logger.warn` e mais nada, e o vendedor que pagou e cujo
 *    Livro Azul foi recusado esperava para sempre — que é o defeito que todo
 *    este trabalho existe para acabar.
 *
 * ## O que escreve, e é o que torna a varredura possível
 *
 * Duas colunas, e nunca as duas ao mesmo tempo:
 *
 * - **`aviso_recusa_em`**, quando o e-mail saiu. É o que impede a varredura de
 *   avisar duas vezes.
 * - **`aviso_recusa_tentativas` + 1**, quando não saiu **e o documento está
 *   mesmo recusado**. É o que permite à varredura desistir de uma linha que
 *   nunca vai conseguir ser avisada.
 *
 * As razões que **não** incrementam são as que não são tentativas falhadas:
 * `sem-documento` e `nao-recusado` querem dizer que não havia nada a avisar, e
 * contá-las gastaria as tentativas de um documento que ainda nem foi recusado.
 *
 * **Nenhuma destas escritas pode deitar abaixo o aviso.** Se a marca falhar
 * depois de o e-mail sair, o vendedor já foi avisado — devolver `false` aí
 * faria a varredura mandar-lhe um segundo e-mail. O que se faz é registar e
 * seguir; a consequência de uma marca perdida é um aviso repetido, e a de um
 * `false` errado é o mesmo aviso repetido **todos os dias**.
 */

import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { EmailWorkflows } from "@/lib/resend";
import { NOME_DO_TIPO } from "@/lib/documentos-do-vendedor";
import { TIPOS_DE_DOCUMENTO, type TipoDeDocumento } from "@/lib/documentos/contrato";

/**
 * Porque é que o aviso não saiu. Cada valor é um caso diferente e todos são
 * legítimos — nenhum deles é um erro de programação, e por isso quem chama
 * distingue-os em vez de receber um `false`.
 */
export type ResultadoDoAviso =
  | { enviado: true }
  | {
      enviado: false;
      razao: /** Não existe linha nenhuma com esse id. */
        | "sem-documento"
        /** Existe, mas não está em `recusado`. */
        | "nao-recusado"
        /** Está recusado e sem motivo escrito. */
        | "sem-motivo"
        /** Sem `cavalo_id`: subiu antes do pagamento e não tem dono conhecido. */
        | "sem-anuncio"
        /** O anúncio não tem endereço de e-mail. */
        | "sem-endereco"
        /** O serviço de e-mail recusou ou não respondeu. */
        | "falha-no-envio";
    };

function texto(v: unknown): string | null {
  return typeof v === "string" && v.trim() !== "" ? v : null;
}

/**
 * Avisa, e regista o que aconteceu.
 *
 * A contagem das tentativas está **aqui**, à volta, e não espalhada pelos sete
 * pontos de saída lá dentro: assim não há nenhum caminho de falha que se
 * esqueça de contar, e acrescentar um oitavo motivo amanhã não obriga ninguém
 * a lembrar-se disto.
 *
 * `sem-documento` e `nao-recusado` não contam — não são tentativas falhadas, é
 * não haver nada a avisar, e gastá-las esgotaria as tentativas de um documento
 * que ainda nem foi recusado.
 */
export async function avisarDocumentoRecusado(documentoId: string): Promise<ResultadoDoAviso> {
  const resultado = await tentarAvisar(documentoId);
  if (
    !resultado.enviado &&
    resultado.razao !== "sem-documento" &&
    resultado.razao !== "nao-recusado"
  ) {
    await contarTentativaFalhada(documentoId);
  }
  return resultado;
}

async function tentarAvisar(documentoId: string): Promise<ResultadoDoAviso> {
  const { data, error } = await supabaseAdmin
    .from("documentos_cavalo")
    .select("id, cavalo_id, tipo, estado, motivo_recusa")
    .eq("id", documentoId)
    .maybeSingle();

  if (error) {
    logger.error("[aviso-documento-recusado] falha a ler o documento", error);
    return { enviado: false, razao: "sem-documento" };
  }
  if (!data) return { enviado: false, razao: "sem-documento" };

  const linha = data as Record<string, unknown>;

  if (linha.estado !== "recusado") return { enviado: false, razao: "nao-recusado" };

  const motivo = texto(linha.motivo_recusa);
  if (!motivo) {
    logger.error("[aviso-documento-recusado] recusa sem motivo escrito", { id: documentoId });
    return { enviado: false, razao: "sem-motivo" };
  }

  const cavaloId = texto(linha.cavalo_id);
  if (!cavaloId) return { enviado: false, razao: "sem-anuncio" };

  const { data: anuncio, error: erroAnuncio } = await supabaseAdmin
    .from("cavalos_venda")
    .select("id, nome, vendedor_email")
    .eq("id", cavaloId)
    .maybeSingle();

  if (erroAnuncio) {
    logger.error("[aviso-documento-recusado] falha a ler o anúncio", erroAnuncio);
    return { enviado: false, razao: "sem-anuncio" };
  }
  if (!anuncio) return { enviado: false, razao: "sem-anuncio" };

  const linhaAnuncio = anuncio as Record<string, unknown>;
  const endereco = texto(linhaAnuncio.vendedor_email);
  if (!endereco) {
    logger.warn("[aviso-documento-recusado] anúncio sem endereço de e-mail", { cavaloId });
    return { enviado: false, razao: "sem-endereco" };
  }

  const tipo = texto(linha.tipo);
  // Um tipo que o contrato não conhece não trava o aviso: o que interessa a
  // quem o recebe é o motivo, e ficar sem aviso por causa de um rótulo é o
  // pior dos dois males. Escreve-se «documento» e segue.
  const nomeDoTipo =
    tipo && (TIPOS_DE_DOCUMENTO as readonly string[]).includes(tipo)
      ? NOME_DO_TIPO[tipo as TipoDeDocumento]
      : "Documento";

  const nomeCavalo = texto(linhaAnuncio.nome) ?? "sem nome";

  // O `sendEmail` já apanha o que o serviço de e-mail devolva, mas **compor** a
  // mensagem também pode rebentar: o rodapé do modelo da casa assina o link de
  // cancelar subscrição, e sem o segredo dessa assinatura em ambiente lança.
  // Isso não pode subir daqui até quem está a recusar o documento — a decisão
  // dele já ficou escrita, e uma variável de ambiente em falta não a pode
  // desfazer nem pintar de vermelho o painel de revisão.
  let resultado: { success: boolean } | null = null;
  try {
    resultado = await EmailWorkflows.sendDocumentoRecusado(
      endereco,
      nomeCavalo,
      nomeDoTipo,
      motivo
    );
  } catch (e) {
    logger.error("[aviso-documento-recusado] falhou a compor ou a enviar", e);
    return { enviado: false, razao: "falha-no-envio" };
  }

  if (!resultado?.success) {
    logger.error("[aviso-documento-recusado] o e-mail não saiu", {
      documento: documentoId,
      cavaloId,
    });
    return { enviado: false, razao: "falha-no-envio" };
  }

  logger.info("[aviso-documento-recusado] vendedor avisado", {
    documento: documentoId,
    cavaloId,
    tipo: nomeDoTipo,
  });

  await marcarAvisado(documentoId);
  return { enviado: true };
}

/**
 * O documento fica marcado como avisado.
 *
 * Não lança e não devolve nada: quem chama já mandou o e-mail, e uma marca que
 * falha não desfaz um e-mail que saiu. O pior que acontece é a varredura mandar
 * um segundo aviso amanhã — que é bem melhor do que a alternativa, que seria
 * dizer a quem chama que o aviso não saiu quando saiu.
 */
async function marcarAvisado(documentoId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin
      .from("documentos_cavalo")
      .update({ aviso_recusa_em: new Date().toISOString() })
      .eq("id", documentoId);
    if (error) throw error;
  } catch (e) {
    logger.error("[aviso-documento-recusado] o aviso saiu mas a marca não ficou", {
      documento: documentoId,
      erro: e,
    });
  }
}

/**
 * Mais uma tentativa falhada.
 *
 * Incrementa-se no servidor com uma expressão SQL e não lendo-o-e-escrevendo-o
 * daqui: a rota que recusa e a varredura podem tocar na mesma linha ao mesmo
 * tempo, e duas leituras seguidas de duas escritas perdem uma das contagens.
 */
async function contarTentativaFalhada(documentoId: string): Promise<void> {
  try {
    const { error } = await supabaseAdmin.rpc("incrementar_aviso_recusa_tentativas", {
      documento: documentoId,
    });
    if (error) throw error;
  } catch (e) {
    logger.warn("[aviso-documento-recusado] falha a contar a tentativa", {
      documento: documentoId,
      erro: e,
    });
  }
}
