import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import {
  validarMensagem,
  MAX_CONVERSAS_NOVAS_POR_MINUTO,
  type ChatConversa,
} from "@/lib/marketplace-chat";
import {
  vistaConversa,
  outraParteDaConversa,
  COLUNAS_CAVALO,
  type LinhaCavalo,
  type LinhaConversa,
} from "@/lib/chat/vista-publica";
import { perfisPorId } from "@/lib/perfil/carregar";
import { limparNome } from "@/lib/perfil/contrato";
import { LISTING_STATUS } from "@/lib/marketplace-listings";
import { devoNotificar, notificarNovaMensagem } from "@/lib/chat-notificacoes";
import { strictLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";

/**
 * Display name for the authenticated user, used when opening a conversation.
 *
 * ── O `limparNome` e não um `slice` ─────────────────────────────────────────
 *
 * O `user_metadata.full_name` é texto em cru do formulário de registo —
 * `app/(auth)/registar` faz `signUp({ data: { full_name: name } })` e mais
 * ninguém o olha pelo caminho. Este valor fica gravado no `comprador_nome` da
 * conversa e é o que o vendedor lê na caixa de entrada **e no email de aviso**.
 *
 * Um `slice(0, 120)` corta o comprimento e deixa passar tudo o resto. O
 * `limparNome` é a decisão que esta casa já tinha tomado para o nome do perfil,
 * e com a razão escrita: um `\n` parte a linha de uma lista e o U+202E faz o
 * resto da linha ler-se ao contrário. O mesmo tecto de 120 vive lá dentro, pela
 * razão escrita no `MAX_NOME` — dois números divergem à primeira distracção.
 *
 * A parte local do email só entra se não sobrar nome nenhum, e nunca o endereço:
 * a outra parte não recebe um contacto que ninguém escolheu partilhar.
 */
function nomeDoUtilizador(user: { email?: string; user_metadata?: Record<string, unknown> }) {
  const meta = user.user_metadata || {};
  const completo = limparNome(meta.full_name);
  if (completo) return completo;

  return limparNome(user.email?.split("@")[0]) || "Utilizador";
}

/**
 * GET /api/conversas
 *
 * A caixa de entrada do utilizador, dos dois lados: as conversas em que compra
 * e as dos anúncios que vende.
 *
 * ── O que deixou de ler ─────────────────────────────────────────────────────
 *
 * Isto trazia **todas as mensagens de todas as conversas** para ficar com a
 * última de cada uma e contar as não lidas em JavaScript. Medido no banco de
 * ensaio (2 000 conversas, 60 652 mensagens), numa caixa de entrada de 40
 * conversas em que uma é antiga: **1 970 linhas lidas** para escrever 40
 * pré-visualizações.
 *
 * A pré-visualização passou a ser uma coluna que um gatilho mantém — zero
 * linhas de mensagem para a escrever — e as não lidas saem de um índice
 * parcial onde só entram as que ainda o são. Em A/B intercalado, 30 pares:
 * **1,027ms → 0,137ms**.
 */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { data: conversas, error } = await supabaseAdmin
      .from("marketplace_conversas")
      .select("*")
      .or(`comprador_id.eq.${user.id},vendedor_id.eq.${user.id}`)
      .order("ultima_mensagem_at", { ascending: false });

    if (error) {
      logger.error("[conversas/GET] Supabase error:", error);
      return NextResponse.json({ error: "Erro ao carregar mensagens" }, { status: 500 });
    }

    if (!conversas || conversas.length === 0) {
      return NextResponse.json({ conversas: [], porLer: 0 });
    }

    // Listings and messages are fetched separately rather than through an
    // embedded select: PostgREST relationship embedding depends on its schema
    // cache, and this codebase has been bitten by that before.
    const cavaloIds = [...new Set(conversas.map((c) => c.cavalo_id))];

    /* ── Quem é a outra parte, numa pergunta e não em trinta ──────────────────
       Uma leitura de perfil por conversa seriam trinta idas à base para
       escrever trinta linhas de lista — o mesmo defeito que esta rota já
       corrigiu uma vez, quando trazia todas as mensagens de todas as conversas
       para ficar com a última de cada uma.

       Medido contra o PostgreSQL local com 5 000 contas, em A/B intercalado:
       **3,23–3,40ms → 0,26–0,29ms**, 11 a 13 vezes, e a pergunta única ganha em
       30 de 30 pares nas três corridas. O número está escrito como intervalo de
       propósito — ver `lib/perfil/carregar`.

       E vai no mesmo `Promise.all` das outras duas, não a seguir: as três não
       dependem umas das outras, e em série a mais barata das três passaria a
       somar-se ao caminho crítico em vez de se esconder atrás dele. */
    const outrasPartes = conversas.map((c) => outraParteDaConversa(c as LinhaConversa, user.id));

    const [{ data: cavalos }, { data: porLerLinhas, error: erroPorLer }, perfis] =
      await Promise.all([
        supabaseAdmin.from("cavalos_venda").select(COLUNAS_CAVALO).in("id", cavaloIds),
        /* Só as que ainda estão por ler, e só a coluna que as agrupa. Numa caixa
           de entrada em repouso isto devolve zero linhas. */
        supabaseAdmin
          .from("marketplace_mensagens")
          .select("conversa_id")
          .eq("destinatario_id", user.id)
          .is("lida_at", null),
        /* Nunca lança: se falhar, o mapa vem vazio e as conversas saem sem
           fotografia. Uma caixa de entrada que não abre porque a fotografia de
           alguém não carregou é pior do que uma caixa sem fotografias. */
        perfisPorId(outrasPartes),
      ]);

    if (erroPorLer) {
      logger.error("[conversas/GET] Falhou a contar as não lidas:", erroPorLer);
    }

    const porCavalo = new Map<string, LinhaCavalo>(
      (cavalos || []).map((c) => [(c as { id: string }).id, c as LinhaCavalo])
    );

    const porLerPorConversa = new Map<string, number>();
    for (const linha of porLerLinhas || []) {
      const chave = (linha as { conversa_id: string }).conversa_id;
      porLerPorConversa.set(chave, (porLerPorConversa.get(chave) || 0) + 1);
    }

    /* A resposta é construída campo a campo em `vista-publica`, e não a partir
       da linha da tabela: é lá que está escrito porque é que um `select("*")`
       daqui até ao anúncio publicaria o telefone do vendedor. */
    const resultado: ChatConversa[] = conversas.map((c, i) =>
      vistaConversa(
        c as LinhaConversa,
        porCavalo.get(c.cavalo_id) ?? null,
        {
          ultimaMensagem: (c as { ultima_mensagem_previa?: string | null }).ultima_mensagem_previa,
          porLer: porLerPorConversa.get(c.id) || 0,
          perfil: perfis.get(outrasPartes[i]) ?? null,
        },
        user.id
      )
    );

    return NextResponse.json({
      conversas: resultado,
      porLer: resultado.reduce((total, c) => total + c.porLer, 0),
    });
  } catch (error) {
    logger.error("[conversas/GET] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * POST /api/conversas
 *
 * Opens the conversation about a listing and posts the first message. Contacting
 * the same listing again reuses the existing thread rather than starting a new
 * one, so the seller sees one continuous conversation per interested buyer.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    const cavaloId = typeof body.cavaloId === "string" ? body.cavaloId : null;
    if (!cavaloId) {
      return NextResponse.json({ error: "Anúncio não indicado" }, { status: 400 });
    }

    const validada = validarMensagem(body.mensagem);
    if ("erro" in validada) {
      return NextResponse.json({ error: validada.erro }, { status: 400 });
    }

    const { data: cavalo, error: cavaloError } = await supabaseAdmin
      .from("cavalos_venda")
      .select("id, user_id, status, nome")
      .eq("id", cavaloId)
      .maybeSingle();

    if (cavaloError) {
      logger.error("[conversas/POST] Failed to load listing:", cavaloError);
      return NextResponse.json({ error: "Erro ao abrir conversa" }, { status: 500 });
    }

    if (!cavalo) {
      return NextResponse.json({ error: "Anúncio não encontrado" }, { status: 404 });
    }

    // Only listings the public can see accept new conversations. An existing
    // thread stays usable after the listing is sold — see the [id] route.
    if (cavalo.status !== LISTING_STATUS.ACTIVE && cavalo.status !== LISTING_STATUS.RESERVADO) {
      return NextResponse.json({ error: "Este anúncio já não está disponível" }, { status: 409 });
    }

    if (!cavalo.user_id) {
      return NextResponse.json(
        { error: "Este anúncio não tem mensagens no portal. Use os contactos indicados." },
        { status: 409 }
      );
    }

    if (cavalo.user_id === user.id) {
      return NextResponse.json({ error: "Este anúncio é seu" }, { status: 409 });
    }

    // Reuse the thread when it exists. The unique constraint on
    // (cavalo_id, comprador_id) is what actually guarantees this under a race.
    const { data: existente } = await supabaseAdmin
      .from("marketplace_conversas")
      .select("id")
      .eq("cavalo_id", cavaloId)
      .eq("comprador_id", user.id)
      .maybeSingle();

    let conversaId = existente?.id as string | undefined;

    if (!conversaId) {
      /* ── O limite de ritmo trava conversas **novas**, e por isso está aqui ──
         Depois de sabermos que não há fio, e antes de o abrirmos: continuar um
         fio já aberto não é o comportamento que se quer travar, e uma conta
         que responda depressa a quem já lhe escreveu não pode ser confundida
         com uma que varre o directório.

         Sem isto, uma conta criada de fresco abria conversa com os vinte e
         nove vendedores em três segundos, e os vinte e nove recebiam um email.
         Medido a chamar esta rota em ciclo: 29 conversas abertas em 29
         pedidos; com o limite, 5.

         O mecanismo é o que a casa já usa — o `strictLimiter` do
         `lib/rate-limit`, o mesmo das denúncias — e a chave é a **conta** e não
         o IP: por IP, uma casa com duas pessoas partilha o castigo. E fica
         escrito o que este limitador não é: vive em memória do processo, logo
         um arranque a frio devolve o crédito. A camada durável é a do
         `middleware.ts` (Upstash, 60 pedidos por minuto por IP), que já cobre
         tudo o que seja `/api/*`. Duas redes com buracos em sítios
         diferentes, e nenhuma inventada aqui.

         O `check` recusa a partir do limite **inclusive** (`>= limite`), por
         isso passa-se o limite mais um para que o número escrito na constante
         seja o número de conversas que passam. */
      try {
        await strictLimiter.check(MAX_CONVERSAS_NOVAS_POR_MINUTO + 1, `conversa-nova:${user.id}`);
      } catch {
        return NextResponse.json(
          {
            error:
              "Abriu demasiadas conversas seguidas. Espere um minuto antes de contactar outro vendedor.",
          },
          { status: 429 }
        );
      }

      const { data: criada, error: criarError } = await supabaseAdmin
        .from("marketplace_conversas")
        .insert({
          cavalo_id: cavaloId,
          comprador_id: user.id,
          vendedor_id: cavalo.user_id,
          comprador_nome: nomeDoUtilizador(user),
        })
        .select("id")
        .single();

      if (criarError || !criada) {
        // Another request opened the same thread between the check and the
        // insert; fall back to that one instead of failing the send.
        const { data: corrida } = await supabaseAdmin
          .from("marketplace_conversas")
          .select("id")
          .eq("cavalo_id", cavaloId)
          .eq("comprador_id", user.id)
          .maybeSingle();

        if (!corrida) {
          logger.error("[conversas/POST] Failed to create conversation:", criarError);
          return NextResponse.json({ error: "Erro ao abrir conversa" }, { status: 500 });
        }
        conversaId = corrida.id;
      } else {
        conversaId = criada.id;
      }
    }

    if (!conversaId) {
      // Unreachable in practice: every branch above either sets it or returns.
      // Kept so the compiler — and a future edit to those branches — cannot let
      // a message be written against no conversation.
      logger.error("[conversas/POST] No conversation id after resolution");
      return NextResponse.json({ error: "Erro ao abrir conversa" }, { status: 500 });
    }

    const { data: mensagem, error: mensagemError } = await supabaseAdmin
      .from("marketplace_mensagens")
      .insert({
        conversa_id: conversaId,
        remetente_id: user.id,
        corpo: validada.corpo,
      })
      .select("id")
      .single();

    if (mensagemError || !mensagem) {
      logger.error("[conversas/POST] Failed to insert message:", mensagemError);
      return NextResponse.json({ error: "Erro ao enviar mensagem" }, { status: 500 });
    }

    /* O `ultima_mensagem_at` e a pré-visualização deixaram de se escrever
       daqui: são um gatilho na base (migração 20260909000001). Uma escrita a
       menos por mensagem, e a ordem da caixa de entrada deixa de depender de
       quem escreve na tabela. */

    // Awaited rather than fired and forgotten: an unawaited promise can be
    // killed when the serverless invocation ends. A failure inside never throws.
    if (await devoNotificar(conversaId, user.id, mensagem.id)) {
      await notificarNovaMensagem({
        conversaId,
        destinatarioId: cavalo.user_id,
        remetenteNome: nomeDoUtilizador(user),
        cavaloNome: cavalo.nome || "o seu anúncio",
        corpo: validada.corpo,
      });
    }

    return NextResponse.json({ conversaId }, { status: 201 });
  } catch (error) {
    logger.error("[conversas/POST] Unexpected error:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
