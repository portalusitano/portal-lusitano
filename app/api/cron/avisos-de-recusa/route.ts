/**
 * GET /api/cron/avisos-de-recusa — o que ficou por avisar.
 *
 * ## Porque é que isto existe
 *
 * Quando quem revê recusa um documento, o vendedor é avisado no mesmo instante.
 * Se esse envio falhar — o serviço de e-mail em baixo, a rede a cair, o
 * endereço ainda por existir porque o anúncio nasce depois do pagamento —, a
 * recusa fica gravada e o aviso não sai. **Sem esta varredura, ninguém volta a
 * tentar**: fica um `logger.warn` no registo e um vendedor que pagou, cujo
 * Livro Azul foi recusado, à espera para sempre de uma resposta que já existe.
 *
 * É o defeito que todo o sistema de documentos existe para acabar, e estava
 * dentro dele.
 *
 * ## Porque é que não avisa duas vezes
 *
 * Porque só olha para linhas com `aviso_recusa_em` a nulo, e o
 * `avisarDocumentoRecusado` escreve essa coluna quando o e-mail sai. E porque
 * essa função **relê o estado do documento antes de enviar**: um documento que
 * entretanto foi reaberto ou verificado não gera aviso nenhum, mesmo que a
 * linha ainda esteja na fila.
 *
 * ## Porque é que desiste
 *
 * Há recusas que nunca vão conseguir ser avisadas: um documento que subiu antes
 * do pagamento e cujo anúncio nunca chegou a nascer não tem a quem ser enviado.
 * Sem um tecto, essas linhas voltavam todos os dias, para sempre, e — por serem
 * as mais antigas — ficavam à cabeça da fila a comer o orçamento de cada
 * passagem antes de ele chegar a uma recusa nova.
 *
 * O índice ordena por `aviso_recusa_tentativas` e só depois por `criado_em`,
 * que é o que põe quem nunca falhou à frente de quem já falhou três vezes.
 */

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { cronAutorizado } from "@/lib/cron-autorizado";
import { avisarDocumentoRecusado } from "@/lib/aviso-documento-recusado";

export const dynamic = "force-dynamic";

/**
 * Quantas se tentam por passagem.
 *
 * Cada uma custa duas leituras e um e-mail. Cinquenta cabem folgadamente no
 * tempo de uma função sem servidor, e cinquenta recusas por avisar num só dia
 * é um número que este site não vê — o tecto é uma rede contra um engano, não
 * uma quota que se gaste.
 */
const MAX_POR_PASSAGEM = 50;

/**
 * Ao fim de cinco dias desiste-se desta linha.
 *
 * Com uma passagem por dia, são cinco dias de tentativas. Um serviço de e-mail
 * que esteja em baixo cinco dias seguidos é um problema que esta varredura não
 * resolve, e um anúncio que não nasceu em cinco dias já não vai nascer.
 *
 * Desistir **não apaga nada**: a linha fica com `aviso_recusa_em` a nulo e a
 * contagem à vista, e por isso continua a ser possível perguntar à base quem
 * ficou por avisar. O que se deixa de fazer é tentar.
 */
const MAX_TENTATIVAS = 5;

export async function GET(request: NextRequest) {
  const autorizacao = cronAutorizado(request, "cron/avisos-de-recusa");
  if (!autorizacao.ok) return autorizacao.resposta;

  try {
    const { data, error } = await supabaseAdmin
      .from("documentos_cavalo")
      .select("id")
      .eq("estado", "recusado")
      .is("aviso_recusa_em", null)
      .lt("aviso_recusa_tentativas", MAX_TENTATIVAS)
      .order("aviso_recusa_tentativas", { ascending: true })
      .order("criado_em", { ascending: true })
      .limit(MAX_POR_PASSAGEM);

    if (error) {
      logger.error("[cron/avisos-de-recusa] falha a ler a fila", error);
      return NextResponse.json({ error: "Erro ao ler a fila" }, { status: 500 });
    }

    const fila = (data ?? []) as { id: string }[];
    let enviados = 0;
    const porRazao: Record<string, number> = {};

    /* Um de cada vez, e não em paralelo.
     *
     * São e-mails para pessoas diferentes e não há aqui nada que ganhe com
     * concorrência a não ser o relógio — e cinquenta envios ao mesmo tempo é a
     * melhor maneira de um serviço de e-mail nos limitar a taxa e falharem
     * todos de uma vez, que é precisamente o problema que esta rota existe para
     * remediar. */
    for (const { id } of fila) {
      try {
        const aviso = await avisarDocumentoRecusado(id);
        if (aviso.enviado) enviados += 1;
        else porRazao[aviso.razao] = (porRazao[aviso.razao] ?? 0) + 1;
      } catch (e) {
        /* Uma linha que rebenta não leva as outras atrás. O
           `avisarDocumentoRecusado` já não lança por si; isto é a rede para o
           que não se previu. A contagem de tentativas fica por somar nesse
           caso, e fica bem: uma excepção inesperada é um defeito nosso, e não
           uma razão para gastar as tentativas de um vendedor. */
        porRazao.excepcao = (porRazao.excepcao ?? 0) + 1;
        logger.error("[cron/avisos-de-recusa] excepção a avisar", { documento: id, erro: e });
      }
    }

    if (fila.length > 0) {
      logger.info("[cron/avisos-de-recusa] passagem concluída", {
        naFila: fila.length,
        enviados,
        porRazao,
      });
    }

    return NextResponse.json({ naFila: fila.length, enviados, porRazao });
  } catch (e) {
    logger.error("[cron/avisos-de-recusa] erro inesperado", e);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
