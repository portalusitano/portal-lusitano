import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { getAuthenticatedUser } from "@/lib/seller-auth";
import { strictLimiter } from "@/lib/rate-limit";
import { logger } from "@/lib/logger";
import {
  limparNome,
  COLUNAS_PERFIL,
  MAX_NOME,
  type LinhaPerfil,
  type PerfilProprio,
} from "@/lib/perfil/contrato";

/**
 * O perfil de quem está com sessão iniciada: ler e mudar o nome.
 *
 * ── Porque é que esta rota existe, se a RLS já deixava escrever ─────────────
 *
 * Deixava de mais. A `004_user_auth_tools.sql` pôs `UPDATE` para
 * `authenticated` com a política `auth.uid() = id` — o que soa certo e é, mas
 * a RLS é por **linha** e nesta linha vivem também o `stripe_customer_id` e o
 * `tools_subscription_status`. Quem tivesse conta podia dar-se a assinatura
 * paga com uma linha de `curl`. Está reproduzido e corrigido na migração
 * `20260910000001`, com o antes e o depois provados contra um PostgreSQL.
 *
 * Depois dessa migração, o que `authenticated` pode escrever pelo PostgREST é
 * `full_name` e mais nada. Esta rota existe para o resto: a fotografia, que só
 * pode ficar na base depois de passar pelo cano que lhe tira o EXIF e a
 * encolhe, e que por isso nunca pode ser escrita pelo cliente.
 *
 * ── O que sai daqui ────────────────────────────────────────────────────────
 *
 * `PerfilProprio`, construído campo a campo em `lib/perfil/contrato`. Não sai o
 * `id`, não sai o email, não sai nada de facturação — a razão está escrita lá.
 */

/**
 * Lê o perfil, criando-o se não existir.
 *
 * O gatilho `on_auth_user_created` cria o perfil no registo e a migração
 * preenche quem já tinha conta antes dele, mas nenhuma das duas coisas é uma
 * garantia que esta rota possa assumir: um perfil em falta tem de dar um perfil
 * vazio e não um 500. `upsert` em vez de `insert` para que duas abas abertas ao
 * mesmo tempo não se atropelem.
 */
async function perfilOuCriar(userId: string): Promise<LinhaPerfil | null> {
  const { data, error } = await supabaseAdmin
    .from("user_profiles")
    .select(COLUNAS_PERFIL)
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    logger.error("[perfil/GET] Falhou a ler o perfil:", error);
    return null;
  }

  if (data) return data as LinhaPerfil;

  const { data: criado, error: erroCriar } = await supabaseAdmin
    .from("user_profiles")
    .upsert({ id: userId }, { onConflict: "id" })
    .select(COLUNAS_PERFIL)
    .maybeSingle();

  if (erroCriar) {
    logger.error("[perfil] Falhou a criar o perfil:", erroCriar);
    return null;
  }

  return (criado as LinhaPerfil | null) ?? null;
}

function vistaPropria(linha: LinhaPerfil | null): PerfilProprio {
  return {
    nome: limparNome(linha?.full_name),
    fotografia: typeof linha?.avatar_url === "string" && linha.avatar_url ? linha.avatar_url : null,
  };
}

/** GET /api/perfil — o meu nome e a minha fotografia. */
export async function GET() {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const linha = await perfilOuCriar(user.id);
    return NextResponse.json({ perfil: vistaPropria(linha) });
  } catch (error) {
    logger.error("[perfil/GET] Erro inesperado:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

/**
 * PATCH /api/perfil — mudar o nome.
 *
 * Só o nome. A fotografia tem rota própria porque tem um corpo de outra
 * natureza (multipart, megabytes) e um caminho de validação que não se parece
 * nada com este; juntar as duas numa rota que às vezes lê JSON e às vezes lê
 * `FormData` é a maneira de uma das duas validações se perder.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthenticatedUser();
    if (!user) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    /* A chave é a **conta** e não o IP, pela mesma razão escrita em
       `app/api/conversas`: por IP, uma casa com duas pessoas partilha o
       castigo. O `check` recusa a partir do limite inclusive, por isso passa-se
       o número que se quer deixar passar mais um. */
    try {
      await strictLimiter.check(11, `perfil-nome:${user.id}`);
    } catch {
      return NextResponse.json(
        { error: "Demasiadas alterações seguidas. Tente novamente dentro de um minuto." },
        { status: 429 }
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    if (!("nome" in body)) {
      return NextResponse.json({ error: "Nada para alterar" }, { status: 400 });
    }

    /* Apagar o nome é uma resposta legítima — quem não o quer escrito na caixa
       de entrada de um estranho tem de poder tirá-lo —, e por isso `null` e ""
       chegam os dois a `null`. O que não é legítimo é mandar um número: aí a
       distinção entre «apagar» e «enganei-me no tipo» perde-se, e recusa-se. */
    if (body.nome !== null && typeof body.nome !== "string") {
      return NextResponse.json({ error: "Nome inválido" }, { status: 400 });
    }

    if (typeof body.nome === "string" && body.nome.length > MAX_NOME * 4) {
      // O `limparNome` corta a `MAX_NOME`, mas cortar em silêncio um corpo de
      // um megabyte é aceitar o megabyte primeiro. A folga de quatro é para
      // caracteres fora do plano básico, que ocupam mais de uma unidade.
      return NextResponse.json(
        { error: `O nome não pode passar de ${MAX_NOME} caracteres.` },
        {
          status: 400,
        }
      );
    }

    const nome = limparNome(body.nome);

    const { error } = await supabaseAdmin.from("user_profiles").upsert(
      { id: user.id, full_name: nome, updated_at: new Date().toISOString() },
      {
        onConflict: "id",
      }
    );

    if (error) {
      logger.error("[perfil/PATCH] Falhou a gravar o nome:", error);
      return NextResponse.json({ error: "Erro ao guardar o perfil" }, { status: 500 });
    }

    const linha = await perfilOuCriar(user.id);
    return NextResponse.json({ perfil: vistaPropria(linha) });
  } catch (error) {
    logger.error("[perfil/PATCH] Erro inesperado:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
