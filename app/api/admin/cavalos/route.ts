import { NextRequest } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { apiSuccess, apiError } from "@/lib/api-helpers";
import { createApiRoute } from "@/lib/createApiRoute";
import { z } from "zod";

const CavaloSchema = z.object({
  nome: z.string().min(1).max(200),
  descricao: z.string().max(5000).optional(),
  preco: z.number().positive().optional(),
  linhagem: z.string().max(200).optional(),
  idade: z.number().int().min(0).max(50).optional(),
  sexo: z.enum(["macho", "femea", "castrado"]).optional(),
  pelagem: z.string().max(100).optional(),
  altura: z.number().min(100).max(200).optional(),
  peso: z.number().min(200).max(1000).optional(),
  disciplinas: z.array(z.string()).optional(),
  nivel: z.string().max(100).optional(),
  localizacao: z.string().max(200).optional(),
  coudelaria: z.string().max(200).optional(),
  imagens: z.array(z.string().url()).optional(),
  image_url: z.string().url().optional(),
  slug: z
    .string()
    .regex(/^[a-z0-9-]+$/)
    .max(200)
    .optional(),
  destaque: z.boolean().optional(),
  contacto_nome: z.string().max(200).optional(),
  contacto_email: z.string().email().optional(),
  contacto_telefone: z.string().max(30).optional(),
});

// GET - Listar todos os cavalos (admin)
export const GET = createApiRoute(
  async (req) => {
    const { data, error } = await supabase
      .from("cavalos_venda")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (error) {
      return apiError("Erro ao buscar cavalos", 500);
    }

    return apiSuccess({ cavalos: data });
  },
  { auth: "admin" }
);

// POST - Criar novo anúncio de cavalo
export const POST = createApiRoute(
  async (request: NextRequest) => {
    const raw = await request.json();
    const parsed = CavaloSchema.safeParse(raw);
    if (!parsed.success) {
      return apiError("Dados inválidos", 400);
    }
    const body = parsed.data;

    // Ensure slug uniqueness
    if (body.slug) {
      const { data: existingSlug } = await supabase
        .from("cavalos_venda")
        .select("id")
        .eq("slug", body.slug)
        .single();
      if (existingSlug) {
        return apiError("Já existe um cavalo com este slug", 409);
      }
    }

    const { data, error } = await supabase
      .from("cavalos_venda")
      .insert({
        nome: body.nome,
        descricao: body.descricao,
        preco: body.preco,
        linhagem: body.linhagem,
        idade: body.idade,
        sexo: body.sexo,
        pelagem: body.pelagem,
        altura: body.altura,
        peso: body.peso,
        disciplinas: body.disciplinas,
        nivel: body.nivel,
        localizacao: body.localizacao,
        coudelaria: body.coudelaria,
        imagens: body.imagens,
        foto_principal: body.image_url,
        slug: body.slug,
        destaque: body.destaque,
        contacto_nome: body.contacto_nome,
        contacto_email: body.contacto_email,
        contacto_telefone: body.contacto_telefone,
        status: "active",
        views_count: 0,
      })
      .select()
      .single();

    if (error) {
      return apiError("Erro ao criar anúncio", 500);
    }

    return apiSuccess({ cavalo: data });
  },
  { auth: "admin" }
);
