import { z } from "zod";
import { COUDELARIA_STATUS_VALUES, type CoudelariaStatus } from "@/lib/coudelaria-status";

// Newsletter
export const newsletterSchema = z.object({
  email: z.string().email("E-mail inválido"),
});

// Reviews
export const reviewSchema = z.object({
  coudelaria_id: z.string().min(1, "ID da coudelaria é obrigatório"),
  autor_nome: z.string().min(1, "Nome é obrigatório").max(100),
  autor_email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  autor_localizacao: z.string().max(100).optional().or(z.literal("")),
  avaliacao: z.number().int().min(1, "Mínimo 1").max(5, "Máximo 5"),
  titulo: z.string().max(200).optional().or(z.literal("")),
  comentario: z.string().min(1, "Comentário é obrigatório").max(2000),
  data_visita: z.string().optional().or(z.literal("")),
  tipo_visita: z.string().optional().or(z.literal("")),
  recomenda: z.boolean().optional().default(true),
});

// Reviews de Ferramentas
export const toolReviewSchema = z.object({
  ferramenta_slug: z.string().min(1, "Ferramenta é obrigatória"),
  autor_nome: z.string().min(1, "Nome é obrigatório").max(100),
  avaliacao: z.number().int().min(1, "Mínimo 1").max(5, "Máximo 5"),
  comentario: z.string().min(1, "Comentário é obrigatório").max(2000),
  recomenda: z.boolean().optional().default(true),
});

// Login
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Password é obrigatória"),
});

// Contacto
export const contactoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(100),
  email: z.string().email("E-mail inválido"),
  mensagem: z.string().min(1, "Mensagem é obrigatória").max(5000),
  assunto: z.string().max(200).optional(),
});

// Coudelaria registration
export const coudelariaRegistoSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(200),
  localizacao: z.string().min(1, "Localização é obrigatória").max(200),
  regiao: z.string().min(1, "Região é obrigatória"),
  descricao: z.string().min(10, "Descrição deve ter pelo menos 10 caracteres").max(5000),
  email: z.string().email("E-mail inválido").optional().or(z.literal("")),
  telefone: z.string().max(20).optional().or(z.literal("")),
  website: z.string().url("URL inválido").optional().or(z.literal("")),
});

// Admin Coudelaria (create/update)
export const adminCoudelariaSchema = z.object({
  nome: z.string().min(1, "Nome é obrigatório").max(200),
  descricao: z.string().max(5000).optional().or(z.literal("")),
  historia: z.string().max(10000).optional().or(z.literal("")),
  especialidades: z.array(z.string()).optional(),
  morada: z.string().max(300).optional().or(z.literal("")),
  cidade: z.string().max(100).optional().or(z.literal("")),
  distrito: z.string().max(100).optional().or(z.literal("")),
  codigo_postal: z.string().max(20).optional().or(z.literal("")),
  pais: z.string().max(100).optional().or(z.literal("")),
  telefone: z.string().max(20).optional().or(z.literal("")),
  telemovel: z.string().max(20).optional().or(z.literal("")),
  email: z.string().email().optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  facebook: z.string().max(300).optional().or(z.literal("")),
  instagram: z.string().max(300).optional().or(z.literal("")),
  youtube: z.string().max(300).optional().or(z.literal("")),
  logo_url: z.string().max(500).optional().or(z.literal("")),
  banner_url: z.string().max(500).optional().or(z.literal("")),
  galeria: z.array(z.string()).optional(),
  ano_fundacao: z.number().int().min(1000).max(2100).optional().nullable(),
  numero_cavalos: z.number().int().min(0).optional().nullable(),
  area_hectares: z.number().min(0).optional().nullable(),
  proprietario_nome: z.string().max(200).optional().or(z.literal("")),
  proprietario_email: z.string().email().optional().or(z.literal("")),
  proprietario_telefone: z.string().max(20).optional().or(z.literal("")),
  // O vocabulário do estado é o da base — ver `lib/coudelaria-status.ts`. Aqui
  // estava um terceiro: `pendente|ativo|inativo|rejeitado`, que não coincidia
  // nem com a base (`pending|active|inactive`) nem com o do painel
  // (`pendente|aprovado|rejeitado`). O POST desta rota rejeitava com 400 o
  // único valor que a base aceita.
  status: z.enum(COUDELARIA_STATUS_VALUES as [CoudelariaStatus, ...CoudelariaStatus[]]).optional(),
  destaque: z.boolean().optional(),
});

// Cart
export const cartAddSchema = z.object({
  cartId: z.string().min(1, "cartId é obrigatório"),
  variantId: z.string().min(1, "variantId é obrigatório"),
  quantity: z.number().int().min(1).max(100).optional().default(1),
});

// Upload
export const uploadSchema = z.object({
  folder: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9_-]+$/, "Folder contém caracteres inválidos"),
});

// Admin depoimento update
export const depoimentoUpdateSchema = z.object({
  status: z.enum(["pendente", "aprovado", "rejeitado"]).optional(),
  destaque: z.boolean().optional(),
  resposta_admin: z.string().max(2000).optional().or(z.literal("")),
});

// Utility: parse with Zod and return structured error
export function parseWithZod<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const firstError = result.error.issues[0];
  return { success: false, error: firstError?.message || "Dados inválidos" };
}
