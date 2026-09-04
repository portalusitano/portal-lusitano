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
 * ## Quem chama isto, hoje: ninguém
 *
 * E é a metade que falta a este trabalho. O instante em que a recusa acontece
 * é o `POST /api/admin/documentos/[id]/recusar`, e esse ficheiro pertence a
 * outra pessoa — está a ser mexido por outro agente enquanto isto se escreve.
 * A ligação é uma linha, a seguir ao `logger.info` dessa rota e antes do
 * `NextResponse.json`:
 *
 * ```ts
 * import { avisarDocumentoRecusado } from "@/lib/aviso-documento-recusado";
 * // …
 * const aviso = await avisarDocumentoRecusado(id);
 * if (!aviso.enviado) {
 *   logger.warn("[admin/documentos/recusar] vendedor não avisado", { id, razao: aviso.razao });
 * }
 * ```
 *
 * Repare-se no que ela **não** faz: não deixa cair a recusa se o aviso falhar.
 * A decisão de quem revê já está gravada, e desfazê-la — ou devolver um erro a
 * quem a tomou — porque um serviço de e-mail não respondeu seria trocar um
 * problema por outro maior.
 *
 * ## O que não faz
 *
 * Não escreve estado nenhum. Não marca o documento como avisado — não há coluna
 * para isso, e inventar uma aqui seria inventá-la no código sem a inventar na
 * base. A consequência está escrita: se o envio falhar, ninguém volta a tentar.
 * Quem chama recebe o resultado e regista-o.
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

export async function avisarDocumentoRecusado(documentoId: string): Promise<ResultadoDoAviso> {
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

  return { enviado: true };
}
