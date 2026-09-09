import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import {
  validarMensagem,
  codificarCursor,
  descodificarCursor,
  linhasAPedir,
  paginaDoFio,
  limiteDaPagina,
  MAX_MENSAGENS_POR_MINUTO,
  type ChatMensagem,
} from "@/lib/marketplace-chat";
import {
  vistaCabecalho,
  vistaMensagem,
  outraParteDaConversa,
  COLUNAS_CAVALO,
  COLUNAS_MENSAGEM,
  type LinhaCavalo,
  type LinhaConversa,
  type LinhaMensagem,
} from "@/lib/chat/vista-publica";
import { perfilDe } from "@/lib/perfil/carregar";
import { devoNotificar, notificarNovaMensagem } from "@/lib/chat-notificacoes";
import { strictLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import type { User } from "@supabase/supabase-js";

/**
 * Loads a conversation only when the user is one of its two participants.
 *
 * Every read and write in this file goes through here, so a conversation id
 * guessed or copied from elsewhere is invisible to anyone else.
 */
async function conversaDoUtilizador(user: User, conversaId: string) {
  const { data, error } = await supabaseAdmin
    .from("marketplace_conversas")
    .select("*")
    .eq("id", conversaId)
    .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)
    .maybeSingle();

  if (error) {
    logger.error("[conversas/[id]] Failed to load conversation:", error);
    return null;
  }

  return (data as LinhaConversa | null) ?? null;
}

/**
 * GET /api/conversas/[id]
 *
 * Uma página do fio, da mais recente para trás.
 *
 * ── Porque é que isto é por cursor e não por página ─────────────────────────
 *
 * Isto trazia o fio inteiro a **cada abertura**. Medido no PostgreSQL local
 * sobre uma conversa de 800 mensagens: 199 092 bytes de corpos contra 7 719 de
 * uma página de trinta, e um varrimento contra cinco blocos de índice.
 *
 * Por cursor e não por `offset` porque a conversa cresce por cima: com um
 * `offset`, uma mensagem que chegue enquanto alguém rola para trás empurra a
 * lista e faz a página seguinte repetir a linha da fronteira. O cursor aponta
 * para uma linha, não para uma contagem, e por isso não se desalinha.
 *
 * Abrir a primeira página — a que não traz cursor — é o que marca como lidas as
 * mensagens da outra parte. Pedir as antigas não marca nada: já foram lidas.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const conversa = await conversaDoUtilizador(user, id);
    if (!conversa) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    const cursorBruto = req.nextUrl.searchParams.get("antes");
    const cursor = descodificarCursor(cursorBruto);
    if (cursorBruto && !cursor) {
      return NextResponse.json({ error: "Cursor inválido" }, { status: 400 });
    }

    const limite = limiteDaPagina(req.nextUrl.searchParams.get("limite"));

    /* Pedem-se mais linhas do que se devolvem. A primeira a mais é como se
       sabe que há mais sem uma segunda pergunta — e sem um `count`, que obriga
       o Postgres a contar o fio inteiro para responder a uma pergunta de sim ou
       não. As outras são a margem de empate: o corte é inclusivo e o desempate
       pelo `id` faz-se no `paginaDoFio`, que é onde tem testes. */
    const pedido = linhasAPedir(limite);

    let consulta = supabaseAdmin
      .from("marketplace_mensagens")
      .select(COLUNAS_MENSAGEM)
      .eq("conversa_id", id)
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(pedido);

    if (cursor) {
      /* Uma desigualdade só, que qualquer PostgREST lê da mesma maneira. A
         subtileza — não repetir a linha da fronteira — está no `paginaDoFio`.
         Ver lá a medição que fez esta escolha mudar. */
      consulta = consulta.lte("created_at", cursor.createdAt);
    }

    const { data: descendente, error } = await consulta;

    if (error) {
      logger.error("[conversas/[id]/GET] Failed to load messages:", error);
      return NextResponse.json({ error: "Erro ao carregar mensagens" }, { status: 500 });
    }

    const linhas = (descendente || []) as unknown as LinhaMensagem[];
    const { pagina, temMais } = paginaDoFio(linhas, limite, pedido, cursor);
    const maisAntiga = pagina[pagina.length - 1];

    /* Lê-se do mais recente para trás e devolve-se por ordem de leitura. A
       inversão é aqui e não no cliente porque quem sabe qual foi a ordem do
       `ORDER BY` é quem a escreveu. */
    const mensagens: ChatMensagem[] = pagina
      .slice()
      .reverse()
      .map((m) => vistaMensagem(m, user.id));

    if (!cursor) {
      /* Melhor esforço, e por isso não bloqueia a resposta: falhar a marcar
         como lida não pode impedir o fio de aparecer.

         São duas escritas porque o PostgREST não sabe escrever
         `entregue_at = coalesce(entregue_at, now())` — e escrever a data nova
         por cima da antiga faria uma mensagem «entregue» há uma hora parecer
         entregue agora. As duas condições são disjuntas no que interessa: cada
         uma só toca na coluna que ainda está a nulo. E a ordem entre elas não
         importa, porque quem lê o estado lê primeiro o `lida_at` — uma lida
         nunca recua a «enviada» por a outra escrita ter falhado. */
      const agora = new Date().toISOString();
      const [entrega, leitura] = await Promise.all([
        supabaseAdmin
          .from("marketplace_mensagens")
          .update({ entregue_at: agora })
          .eq("conversa_id", id)
          .eq("destinatario_id", user.id)
          .is("entregue_at", null),
        supabaseAdmin
          .from("marketplace_mensagens")
          .update({ lida_at: agora })
          .eq("conversa_id", id)
          .eq("destinatario_id", user.id)
          .is("lida_at", null),
      ]);

      if (entrega.error) {
        logger.error("[conversas/[id]/GET] Failed to mark as delivered:", entrega.error);
      }
      if (leitura.error) {
        logger.error("[conversas/[id]/GET] Failed to mark as read:", leitura.error);
      }
    }

    /* O anúncio e o perfil da outra parte não dependem um do outro: em série,
       o mais barato dos dois somava-se ao caminho crítico em vez de se esconder
       atrás dele.

       Quem tem direito a ver o perfil de alguém não é «qualquer pessoa com
       sessão», é a outra parte de uma conversa — e essa condição está
       verificada acima, no `conversaDoUtilizador`, que é por onde toda a
       leitura deste ficheiro passa. O `perfilDe` é chamado depois disso e
       nunca antes. */
    const [{ data: cavalo }, perfil] = await Promise.all([
      supabaseAdmin
        .from("cavalos_venda")
        .select(COLUNAS_CAVALO)
        .eq("id", conversa.cavalo_id)
        .maybeSingle(),
      perfilDe(outraParteDaConversa(conversa, user.id)),
    ]);

    return NextResponse.json({
      conversa: vistaCabecalho(conversa, (cavalo as LinhaCavalo | null) ?? null, user.id, perfil),
      mensagens,
      pagina: {
        temMais,
        /* O cursor aponta para a mais **antiga** desta página, que é a
           fronteira por onde a próxima continua. Vem a nulo quando não há
           mais nada atrás: um cursor que não leva a lado nenhum é um convite
           a um pedido que devolve zero. */
        cursor:
          temMais && maisAntiga
            ? codificarCursor({ createdAt: maisAntiga.created_at, id: maisAntiga.id })
            : null,
      },
    });
  } catch (error) {
    logger.error("[conversas/[id]/GET] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/conversas/[id]
 *
 * Replies in an existing thread. Unlike opening one, this stays available after
 * the listing is sold or withdrawn: an ongoing negotiation should not be cut off
 * the moment the seller updates the listing.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const conversa = await conversaDoUtilizador(user, id);
    if (!conversa) {
      return NextResponse.json({ error: "Conversa não encontrada" }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const validada = validarMensagem(body.mensagem);
    if ("erro" in validada) {
      return NextResponse.json({ error: validada.erro }, { status: 400 });
    }

    /* Mais folgado do que o de abrir conversas, e de propósito: responder
       depressa a quem já nos escreveu é o que esta funcionalidade existe para
       permitir. O que este número trava é o guião, não a conversa. Mesmo
       mecanismo e mesma chave — a conta — que na rota de abrir. */
    try {
      await strictLimiter.check(MAX_MENSAGENS_POR_MINUTO + 1, `mensagem:${user.id}`);
    } catch {
      return NextResponse.json(
        { error: "Demasiadas mensagens seguidas. Tente novamente dentro de um minuto." },
        { status: 429 }
      );
    }

    const { data: mensagem, error } = await supabaseAdmin
      .from("marketplace_mensagens")
      .insert({
        conversa_id: id,
        remetente_id: user.id,
        corpo: validada.corpo,
      })
      .select(COLUNAS_MENSAGEM)
      .single();

    if (error || !mensagem) {
      logger.error("[conversas/[id]/POST] Failed to insert message:", error);
      return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
    }

    /* Pôr a conversa no topo das duas caixas de entrada e desarquivá-la é
       agora um gatilho da base (migração 20260909000001), e não um segundo
       `UPDATE` escrito nesta rota e outro igual — mas não igual — na de abrir.
       Um gatilho corre também para quem escreva na tabela por outro caminho. */

    if (await devoNotificar(id, user.id, (mensagem as unknown as LinhaMensagem).id)) {
      const destinatarioId = outraParteDaConversa(conversa, user.id);

      const { data: cavalo } = await supabaseAdmin
        .from("cavalos_venda")
        .select("nome, vendedor_nome")
        .eq("id", conversa.cavalo_id)
        .maybeSingle();

      const souComprador = conversa.comprador_id === user.id;

      await notificarNovaMensagem({
        conversaId: id,
        destinatarioId,
        // The counterpart already knows the other side by the name shown in the
        // thread; reuse it rather than exposing an account email.
        remetenteNome: souComprador
          ? conversa.comprador_nome || "Comprador interessado"
          : cavalo?.vendedor_nome || "Vendedor",
        cavaloNome: cavalo?.nome || "o anúncio",
        corpo: validada.corpo,
      });
    }

    return NextResponse.json(
      { mensagem: vistaMensagem(mensagem as unknown as LinhaMensagem, user.id) },
      { status: 201 }
    );
  } catch (error) {
    logger.error("[conversas/[id]/POST] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
