import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { logger } from "@/lib/logger";

/**
 * Tecto do recuo de contagem. Um distintivo escreve «99+» muito antes disto;
 * o número existe para a leitura de recurso nunca ser uma leitura sem fim.
 */
const TECTO_POR_LER = 500;

/**
 * GET /api/conversas/por-ler
 *
 * O número de mensagens por ler, para o distintivo da navegação.
 *
 * ── Uma pergunta em vez de duas ─────────────────────────────────────────────
 *
 * Isto lia primeiro **todas** as conversas em que o utilizador participa e
 * depois contava as mensagens dessas conversas com um `IN (...)`. Duas idas ao
 * PostgREST, e a segunda com a lista de identificadores por dentro do URL: com
 * quarenta conversas abertas são cerca de 1,5 KiB de UUIDs em cada pedido, e o
 * URL cresce com a caixa de entrada de quem mais usa o site.
 *
 * Com o `destinatario_id` que a migração 20260909000001 escreve na própria
 * mensagem, a conta é uma igualdade sobre um índice parcial. Medido em A/B
 * intercalado no PostgreSQL local, 40 pares, sobre 2 000 conversas e 60 652
 * mensagens: **0,202ms → 0,090ms** de mediana, com a mesma resposta (425).
 * O que se ganha a sério não é o tempo de base — é uma ida ao servidor a
 * menos e um URL de tamanho fixo.
 *
 * ── E é aqui que uma mensagem passa a «entregue» ────────────────────────────
 *
 * Este é o pedido que o cliente faz quando o Realtime lhe diz que chegou
 * alguma coisa, e é por isso o momento exacto em que o servidor **avisou o
 * destinatário** de que a mensagem existe. É essa — e só essa — a afirmação
 * que o `entregue_at` guarda.
 *
 * A escrita corre sempre, mas o `entregue_at IS NULL` faz dela um toque no
 * índice parcial que não encontra nada em regime de repouso: as mensagens já
 * anunciadas saem do índice e deixam de custar.
 *
 * Responde 0 em vez de 401 quando não há sessão: um visitante anónimo não tem
 * mensagens por ler, e a navegação não devia ter de tratar disso à parte.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ porLer: 0 });
    }

    /* Primeiro anunciar, depois contar. Pela ordem contrária, uma mensagem que
       chegasse entre as duas ficava contada sem ser anunciada — e depois
       ninguém voltava a anunciá-la até à mensagem seguinte. */
    const { data: entregues, error: erroEntrega } = await supabaseAdmin
      .from("marketplace_mensagens")
      .update({ entregue_at: new Date().toISOString() })
      .eq("destinatario_id", user.id)
      .is("entregue_at", null)
      .select("id");

    if (erroEntrega) {
      // Best-effort: falhar a marcar como entregue não pode calar o distintivo.
      logger.error("[conversas/por-ler] Falhou a marcar como entregue:", erroEntrega);
    }

    const { count, error } = await supabaseAdmin
      .from("marketplace_mensagens")
      .select("id", { count: "exact", head: true })
      .eq("destinatario_id", user.id)
      .is("lida_at", null);

    if (error) {
      logger.error("[conversas/por-ler] Failed to count messages:", error);
      return NextResponse.json({ error: "Erro ao contar mensagens" }, { status: 500 });
    }

    /* ── Um `count` que não veio não é um zero ──────────────────────────────
       A contagem exacta chega num cabeçalho (`content-range`). Um servidor que
       não o mande — um intermediário que o corte, uma versão que o não emita —
       devolve `count` a nulo, e um `count ?? 0` transforma isso em «não tem
       mensagens», que é indistinguível no ecrã da verdade e é a pior maneira
       possível de falhar: a pessoa não volta cá.

       Isto foi encontrado a medir, e não a pensar: contra o banco de ensaio a
       caixa de entrada dizia 14 por ler e este pedido respondia 0 — com as
       mesmas 14 linhas na base. Ali a causa era do banco, mas a lição não é
       sobre o banco.

       O recuo é contar as linhas. Só entram as que ainda estão por ler, que é
       um número que uma pessoa consegue ter, e leva tecto para nunca ser uma
       leitura sem fim. */
    let porLer = count;
    if (typeof porLer !== "number") {
      logger.error("[conversas/por-ler] O servidor não devolveu a contagem; a contar as linhas.");
      const { data: linhas, error: erroLinhas } = await supabaseAdmin
        .from("marketplace_mensagens")
        .select("id")
        .eq("destinatario_id", user.id)
        .is("lida_at", null)
        .limit(TECTO_POR_LER);

      if (erroLinhas) {
        logger.error("[conversas/por-ler] Failed to count messages:", erroLinhas);
        return NextResponse.json({ error: "Erro ao contar mensagens" }, { status: 500 });
      }
      porLer = linhas?.length ?? 0;
    }

    return NextResponse.json({
      porLer,
      /* Quantas passaram a «entregue» neste pedido. Não é para desenhar nada:
         é o que permite a um teste — e a quem estiver a depurar — ver que o
         estado do meio se mexeu, sem ter de ler a tabela. */
      entregues: entregues?.length ?? 0,
    });
  } catch (error) {
    logger.error("[conversas/por-ler] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
