import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { invalidate, CacheTags } from "@/lib/revalidate";
import { COUDELARIA_STATUS, isCoudelariaStatus } from "@/lib/coudelaria-status";

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
      .select(
        "id, nome, slug, descricao, historia, localizacao, regiao, morada, cidade, distrito, codigo_postal, pais, telefone, telemovel, email, website, facebook, instagram, youtube, logo_url, banner_url, foto_capa, galeria, ano_fundacao, numero_cavalos, num_cavalos, area_hectares, especialidades, certificacoes, premios, servicos, horario, coordenadas_lat, coordenadas_lng, video_url, cavalos_destaque, testemunhos, linhagens, proprietario_nome, proprietario_email, proprietario_telefone, plano, plano_valor, plano_inicio, plano_fim, plano_ativo, status, destaque, ordem_destaque, visibilidade, is_pro, views_count, meta_title, meta_description, meta_keywords, created_at, updated_at"
      )
      .eq("id", id)
      .is("deleted_at", null)
      .single();

    if (error) throw error;

    if (!coudelaria) {
      return NextResponse.json({ error: "Coudelaria não encontrada" }, { status: 404 });
    }

    // Buscar histórico de planos
    const { data: historico } = await supabase
      .from("coudelarias_plano_historico")
      .select("id, coudelaria_id, plano, valor, inicio, fim, status, created_at")
      .eq("coudelaria_id", id)
      .order("created_at", { ascending: false });

    return NextResponse.json({
      coudelaria,
      plano_historico: historico || [],
    });
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

    const {
      nome,
      descricao,
      historia,
      especialidades,
      morada,
      cidade,
      distrito,
      codigo_postal,
      pais,
      telefone,
      telemovel,
      email: coudelariaEmail,
      website,
      facebook,
      instagram,
      youtube,
      logo_url,
      banner_url,
      galeria,
      ano_fundacao,
      numero_cavalos,
      area_hectares,
      certificacoes,
      premios,
      proprietario_nome,
      proprietario_email,
      proprietario_telefone,
      plano,
      plano_valor,
      plano_inicio,
      plano_fim,
      plano_ativo,
      status,
      destaque,
      ordem_destaque,
      visibilidade,
      meta_title,
      meta_description,
      meta_keywords,
    } = body;

    // Construir objeto de atualização (só campos fornecidos)
    const updates: Record<string, unknown> = { updated_by: email };

    if (nome !== undefined) updates.nome = nome;
    if (descricao !== undefined) updates.descricao = descricao;
    if (historia !== undefined) updates.historia = historia;
    if (especialidades !== undefined) updates.especialidades = especialidades;
    if (morada !== undefined) updates.morada = morada;
    if (cidade !== undefined) updates.cidade = cidade;
    if (distrito !== undefined) updates.distrito = distrito;
    if (codigo_postal !== undefined) updates.codigo_postal = codigo_postal;
    if (pais !== undefined) updates.pais = pais;
    if (telefone !== undefined) updates.telefone = telefone;
    if (telemovel !== undefined) updates.telemovel = telemovel;
    if (coudelariaEmail !== undefined) updates.email = coudelariaEmail;
    if (website !== undefined) updates.website = website;
    if (facebook !== undefined) updates.facebook = facebook;
    if (instagram !== undefined) updates.instagram = instagram;
    if (youtube !== undefined) updates.youtube = youtube;
    if (logo_url !== undefined) updates.logo_url = logo_url;
    if (banner_url !== undefined) updates.banner_url = banner_url;
    if (galeria !== undefined) updates.galeria = galeria;
    if (ano_fundacao !== undefined) updates.ano_fundacao = ano_fundacao;
    if (numero_cavalos !== undefined) updates.numero_cavalos = numero_cavalos;
    if (area_hectares !== undefined) updates.area_hectares = area_hectares;
    if (certificacoes !== undefined) updates.certificacoes = certificacoes;
    if (premios !== undefined) updates.premios = premios;
    if (proprietario_nome !== undefined) updates.proprietario_nome = proprietario_nome;
    if (proprietario_email !== undefined) updates.proprietario_email = proprietario_email;
    if (proprietario_telefone !== undefined) updates.proprietario_telefone = proprietario_telefone;
    if (plano !== undefined) updates.plano = plano;
    if (plano_valor !== undefined) updates.plano_valor = plano_valor;
    if (plano_inicio !== undefined) {
      updates.plano_inicio = plano_inicio ? new Date(plano_inicio).toISOString() : null;
    }
    if (plano_fim !== undefined) {
      updates.plano_fim = plano_fim ? new Date(plano_fim).toISOString() : null;
    }
    if (plano_ativo !== undefined) updates.plano_ativo = plano_ativo;
    // O estado só é aceite se for do vocabulário da base. Sem isto, um `PATCH`
    // com `status: "aprovado"` — que era o que o painel enviava — escrevia na
    // coluna um valor que a política RLS não deixa passar, e a coudelaria
    // aprovada desaparecia do directório, do mapa e da pesquisa.
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
    if (destaque !== undefined) updates.destaque = destaque;
    if (ordem_destaque !== undefined) updates.ordem_destaque = ordem_destaque;
    if (visibilidade !== undefined) updates.visibilidade = visibilidade;
    if (meta_title !== undefined) updates.meta_title = meta_title;
    if (meta_description !== undefined) updates.meta_description = meta_description;
    if (meta_keywords !== undefined) updates.meta_keywords = meta_keywords;

    // Atualizar
    const { data: coudelaria, error } = await supabase
      .from("coudelarias")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;

    // Se mudou o plano, criar histórico
    if (plano !== undefined && plano !== "gratis" && plano_inicio && plano_fim) {
      await supabase.from("coudelarias_plano_historico").insert({
        coudelaria_id: id,
        plano,
        valor: plano_valor || 0,
        inicio: new Date(plano_inicio).toISOString(),
        fim: new Date(plano_fim).toISOString(),
        status: "ativo",
      });
    }

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
