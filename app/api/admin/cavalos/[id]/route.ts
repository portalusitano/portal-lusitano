import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { invalidate, CacheTags } from "@/lib/revalidate";
import { isListingStatus } from "@/lib/marketplace-listings";

// PUT - Atualizar cavalo
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const allowedFields = [
      "nome",
      "nome_cavalo",
      "descricao",
      "preco",
      "linhagem",
      "idade",
      "sexo",
      "pelagem",
      "altura",
      "peso",
      "disciplinas",
      "nivel",
      "localizacao",
      "coudelaria",
      "imagens",
      "image_url",
      "slug",
      "destaque",
      "status",
      "contacto_nome",
      "contacto_email",
      "contacto_telefone",
    ];
    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    for (const key of allowedFields) {
      if (key in body) updateData[key] = body[key];
    }

    const { data, error } = await supabase
      .from("cavalos_venda")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Erro ao atualizar cavalo:", error);
      return NextResponse.json({ error: "Erro ao atualizar cavalo" }, { status: 500 });
    }

    invalidate(CacheTags.CAVALOS);
    return NextResponse.json({ cavalo: data });
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// PATCH - Atualizar status ou verificação do cavalo
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    // O estado tem de ser um dos seis de `LISTING_STATUS`. Aceitava-se aqui
    // qualquer texto, e foi por aí que `aprovado` — palavra de um vocabulário
    // que esta tabela nunca usou — entrou na coluna: `/comprar` filtra por
    // `active`, por isso o anúncio ficava pago e invisível.
    if (body.status !== undefined) {
      if (!isListingStatus(body.status)) {
        return NextResponse.json(
          { error: `Estado inválido: ${String(body.status)}` },
          { status: 400 }
        );
      }
      updateData.status = body.status;
    }

    // Support verificado toggle
    if (body.verificado !== undefined) {
      updateData.verificado = body.verificado;
      updateData.verificado_at = body.verificado ? new Date().toISOString() : null;
      updateData.verificado_por = body.verificado ? email : null;
    }

    const { data, error } = await supabase
      .from("cavalos_venda")
      .update(updateData)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      logger.error("Erro ao atualizar cavalo:", error);
      return NextResponse.json({ error: "Erro ao atualizar cavalo" }, { status: 500 });
    }

    invalidate(CacheTags.CAVALOS);
    return NextResponse.json({ cavalo: data });
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// DELETE - Eliminar cavalo
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { id } = await params;

    const { error } = await supabase.from("cavalos_venda").delete().eq("id", id);

    if (error) {
      logger.error("Erro ao eliminar cavalo:", error);
      return NextResponse.json({ error: "Erro ao eliminar cavalo" }, { status: 500 });
    }

    invalidate(CacheTags.CAVALOS);
    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
