import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { sanitizeSearchInput } from "@/lib/sanitize";
import { strictLimiter } from "@/lib/rate-limit";
import { coudelariaRegistoSchema, parseWithZod } from "@/lib/schemas";
import { COUDELARIA_STATUS } from "@/lib/coudelaria-status";

// Criar slug a partir do nome
function createSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove acentos
    .replace(/[^a-z0-9]+/g, "-") // Substitui caracteres especiais por hífen
    .replace(/^-+|-+$/g, ""); // Remove hífens no início e fim
}

// GET - Listar coudelarias
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const regiao = searchParams.get("regiao");
    const search = searchParams.get("search");
    const onlyPro = searchParams.get("pro") === "true";

    let query = supabase
      .from("coudelarias")
      .select(
        "id, slug, nome, descricao, localizacao, regiao, telefone, email, website, foto_capa, destaque, ordem_destaque, is_pro, coordenadas_lat, coordenadas_lng, num_cavalos, especialidades, views_count"
      )
      .eq("status", COUDELARIA_STATUS.ACTIVE)
      .order("destaque", { ascending: false })
      .order("ordem_destaque", { ascending: true })
      .order("views_count", { ascending: false })
      .order("nome", { ascending: true });

    if (regiao && regiao !== "Todas") {
      query = query.eq("regiao", regiao);
    }

    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      query = query.or(`nome.ilike.%${safeSearch}%,localizacao.ilike.%${safeSearch}%`);
    }

    if (onlyPro) {
      query = query.eq("is_pro", true);
    }

    const { data, error } = await query;

    if (error) {
      logger.error("Erro ao buscar coudelarias:", error);
      return NextResponse.json({ error: "Erro ao buscar coudelarias" }, { status: 500 });
    }

    return NextResponse.json(
      { coudelarias: data },
      {
        headers: {
          // Coudelarias mudam pouco — cache 30 min, Vary garante respostas separadas por query
          "Cache-Control": "public, max-age=1800, s-maxage=1800, stale-while-revalidate=3600",
          Vary: "Accept-Encoding",
        },
      }
    );
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}

// POST - Registar nova coudelaria
export async function POST(request: NextRequest) {
  try {
    // Rate limiting — max 5 submissions per minute per IP
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "anonymous";
    try {
      await strictLimiter.check(5, ip);
    } catch {
      return NextResponse.json(
        { error: "Demasiadas submissões. Tente novamente mais tarde." },
        { status: 429 }
      );
    }

    const body = await request.json();

    // Zod validation with proper error messages
    const parsed = parseWithZod(coudelariaRegistoSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const { nome, descricao, localizacao, regiao, telefone, email, website } = parsed.data;

    // Criar slug único
    let slug = createSlug(nome);

    // Verificar se slug já existe
    const { data: existingSlug } = await supabase
      .from("coudelarias")
      .select("slug")
      .eq("slug", slug)
      .single();

    if (existingSlug) {
      slug = `${slug}-${Date.now()}`;
    }

    // Inserir na base de dados
    const { data, error } = await supabase
      .from("coudelarias")
      .insert({
        nome,
        slug,
        descricao,
        localizacao,
        regiao,
        telefone: telefone || null,
        email: email || null,
        website: website || null,
        instagram: body.instagram || null,
        num_cavalos: body.num_cavalos || null,
        especialidades: body.especialidades || [],
        fotos: [],
        status: COUDELARIA_STATUS.PENDING, // Ficam pendentes para revisão
      })
      .select()
      .single();

    if (error) {
      logger.error("Erro ao criar coudelaria:", error);
      return NextResponse.json({ error: "Erro ao registar coudelaria" }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      coudelaria: data,
      message: "Coudelaria submetida para revisão",
    });
  } catch (error) {
    logger.error("Erro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
