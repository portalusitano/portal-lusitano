import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { invalidate, CacheTags } from "@/lib/revalidate";
import { COUDELARIA_STATUS, isCoudelariaStatus } from "@/lib/coudelaria-status";

/**
 * As colunas que a tabela `coudelarias` tem de facto e que o admin pode ler e
 * escrever.
 *
 * O que aqui estava antes pedia treze colunas que não existem — `morada`,
 * `cidade`, `telemovel`, `certificacoes`, `plano`, `plano_valor`,
 * `plano_inicio`, `plano_fim`, `plano_ativo`, `visibilidade`, `meta_title`,
 * `meta_description`, `meta_keywords` —, e o `GET` faz `throw error`: o
 * PostgREST devolve 42703 e a rota respondia 500. **O admin nunca conseguiu
 * abrir a ficha de uma coudelaria.**
 *
 * Nenhuma das treze entra por migração, e a razão é a mesma para todas:
 * página nenhuma do site as lê, e o formulário que as escreveria não existe (o
 * botão «Editar» da tabela é um `onClick` vazio). Acrescentar treze colunas à
 * base para servir um ecrã que não está escrito é acrescentar esquema morto.
 * O que existe e faz o mesmo trabalho:
 *
 * | Pedia            | Tem                                    |
 * | ---------------- | -------------------------------------- |
 * | `morada`         | `localizacao` (NOT NULL, é a morada)   |
 * | `cidade`         | `localizacao` / `regiao`               |
 * | `telemovel`      | `telefone`                             |
 * | `certificacoes`  | `premios`, `servicos`, `especialidades`|
 * | `plano*` (5)     | `plan`, `is_pro`, `expires_at`         |
 * | `visibilidade`   | `status` — é o campo que a RLS lê      |
 * | `meta_*` (3)     | nada, e nada lê                        |
 *
 * O `updated_by` que o `PATCH` escrevia em toda a actualização também não
 * existe: enquanto lá esteve, **nenhum `PATCH` chegou a passar**, e por isso
 * aprovar uma coudelaria falhava mesmo depois de o vocabulário do estado estar
 * certo. Quem regista a autoria são `approved_by` e `deleted_by`, que existem.
 */
const COLUNAS_LEITURA = [
  "id",
  "nome",
  "slug",
  "descricao",
  "historia",
  "localizacao",
  "regiao",
  "distrito",
  "codigo_postal",
  "pais",
  "telefone",
  "email",
  "website",
  "facebook",
  "instagram",
  "youtube",
  "logo",
  "logo_url",
  "banner_url",
  "foto_capa",
  "fotos",
  "galeria",
  "ano_fundacao",
  "numero_cavalos",
  "num_cavalos",
  "area_hectares",
  "especialidades",
  "premios",
  "servicos",
  "linhagens",
  "tags",
  "horario",
  "coordenadas_lat",
  "coordenadas_lng",
  "video_url",
  "cavalos_destaque",
  "testemunhos",
  "proprietario_nome",
  "proprietario_email",
  "proprietario_telefone",
  "plan",
  "is_pro",
  "has_instagram_promo",
  "expires_at",
  "status",
  "destaque",
  "ordem_destaque",
  "views_count",
  "approved_at",
  "approved_by",
  "created_at",
  "updated_at",
].join(", ");

/**
 * Colunas que o `PATCH` aceita do corpo do pedido, tal como se recebem.
 *
 * `status` fica de fora de propósito: tem validação própria mais abaixo.
 * `slug` também: mudá-lo parte todas as ligações para a ficha pública.
 */
const COLUNAS_ESCRITA = [
  "nome",
  "descricao",
  "historia",
  "localizacao",
  "regiao",
  "distrito",
  "codigo_postal",
  "pais",
  "telefone",
  "email",
  "website",
  "facebook",
  "instagram",
  "youtube",
  "logo",
  "logo_url",
  "banner_url",
  "foto_capa",
  "fotos",
  "galeria",
  "ano_fundacao",
  "numero_cavalos",
  "num_cavalos",
  "area_hectares",
  "especialidades",
  "premios",
  "servicos",
  "linhagens",
  "tags",
  "horario",
  "coordenadas_lat",
  "coordenadas_lng",
  "video_url",
  "proprietario_nome",
  "proprietario_email",
  "proprietario_telefone",
  "plan",
  "is_pro",
  "has_instagram_promo",
  "destaque",
  "ordem_destaque",
] as const;

// GET - Obter uma coudelaria específica
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const { data: coudelaria, error } = await supabase
      .from("coudelarias")
      .select(COLUNAS_LEITURA)
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;

    if (!coudelaria) {
      return NextResponse.json({ error: "Coudelaria não encontrada" }, { status: 404 });
    }

    // O histórico de planos saiu daqui: a tabela `coudelarias_plano_historico`
    // não existe na base. A consulta não rebentava porque o erro era ignorado
    // — devolvia sempre uma lista vazia, e quem lesse a resposta concluía que
    // a coudelaria nunca tinha tido plano nenhum. Uma lista vazia que nunca
    // pode encher é pior do que campo nenhum: mente com ar de dado.
    return NextResponse.json({ coudelaria });
  } catch (error) {
    logger.error("Error fetching coudelaria:", error);
    return NextResponse.json(
      {
        error: "Erro ao carregar coudelaria",
      },
      { status: 500 }
    );
  }
}

// PATCH - Atualizar coudelaria
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json();

    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Corpo do pedido inválido" }, { status: 400 });
    }

    // Só campos fornecidos, e só colunas que a tabela tem. Uma coluna a mais
    // aqui não é um campo ignorado — é um 42703 que faz a actualização inteira
    // falhar, incluindo a aprovação que ia junto.
    const updates: Record<string, unknown> = {};
    for (const coluna of COLUNAS_ESCRITA) {
      if (body[coluna] !== undefined) updates[coluna] = body[coluna];
    }

    // O estado só é aceite se for do vocabulário da base. Sem isto, um `PATCH`
    // com `status: "aprovado"` — que era o que o painel enviava — escrevia na
    // coluna um valor que a política RLS não deixa passar, e a coudelaria
    // aprovada desaparecia do directório, do mapa e da pesquisa.
    const { status } = body;
    if (status !== undefined) {
      if (!isCoudelariaStatus(status)) {
        return NextResponse.json({ error: `Estado inválido: ${String(status)}` }, { status: 400 });
      }
      updates.status = status;
      if (status === COUDELARIA_STATUS.ACTIVE) {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = email;
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: "Nada para atualizar" }, { status: 400 });
    }

    const { data: coudelaria, error } = await supabase
      .from("coudelarias")
      .update(updates)
      .eq("id", id)
      .is("deleted_at", null)
      .select(COLUNAS_LEITURA)
      .single();

    if (error) throw error;

    invalidate(CacheTags.COUDELARIAS);
    return NextResponse.json({ coudelaria });
  } catch (error) {
    logger.error("Error updating coudelaria:", error);
    return NextResponse.json(
      {
        error: "Erro ao atualizar coudelaria",
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar coudelaria (soft delete)
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    // Soft delete
    const { error } = await supabase
      .from("coudelarias")
      .update({
        deleted_at: new Date().toISOString(),
        deleted_by: email,
      })
      .eq("id", id);

    if (error) throw error;

    invalidate(CacheTags.COUDELARIAS);
    return NextResponse.json({ message: "Coudelaria eliminada com sucesso" });
  } catch (error) {
    logger.error("Error deleting coudelaria:", error);
    return NextResponse.json(
      {
        error: "Erro ao eliminar coudelaria",
      },
      { status: 500 }
    );
  }
}
