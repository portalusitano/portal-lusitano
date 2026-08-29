import type { Metadata } from "next";
import { supabase } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import ComprarContent from "@/components/ComprarContent";
import { generatePageMetadata } from "@/lib/seo";
import { filtroNaoExpirado } from "@/lib/marketplace-listings";

// ISR: Revalidate marketplace every hour (cavalos can be added/updated)
export const revalidate = 3600;

export const metadata: Metadata = generatePageMetadata({
  title: "Comprar Cavalos Lusitanos — Marketplace Equestre",
  description:
    "Compre cavalos Lusitanos de criadores certificados em Portugal. Marketplace com filtros de raça, idade, disciplina e preço. Exemplares selecionados com pedigree verificado.",
  path: "/comprar",
  keywords: [
    "comprar cavalo lusitano",
    "cavalos lusitanos à venda",
    "marketplace cavalos portugal",
    "venda cavalos puro-sangue lusitano",
    "cavalos dressage portugal",
    "comprar PSL",
  ],
});

export default async function ComprarPage() {
  // select("*") is intentional — the live DB column names differ from what components
  // expect (e.g. "nome" vs "nome_cavalo", "foto_principal" vs "image_url").
  // Explicit columns would break on any schema drift; normalization happens below.
  const { data: rawCavalos, error } = await supabase
    .from("cavalos_venda")
    .select("*")
    .eq("status", "active")
    // Anúncio pago que chegou ao fim do prazo sai da montra.
    .or(filtroNaoExpirado())
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("[ComprarPage] Supabase error:", error);
  }

  // Normalize DB column names → component-expected names
  // Live DB uses 'nome'/'foto_principal', components expect 'nome_cavalo'/'image_url'
  const cavalos = (rawCavalos || []).map((c) => ({
    id: c.id,
    nome_cavalo: c.nome_cavalo || (c as unknown as Record<string, unknown>)["nome"],
    preco: c.preco,
    image_url: c.image_url || (c as unknown as Record<string, unknown>)["foto_principal"],
    slug: c.slug,
    localizacao: c.localizacao,
    idade: c.idade,
    raca: c.raca || c.cor,
    sexo: c.sexo,
    disciplinas: c.disciplinas,
    nivel: c.nivel || c.nivel_treino,
    destaque: c.destaque,
    created_at: c.created_at,
    status: c.status,
  }));

  return <ComprarContent cavalos={cavalos} hasError={!!error} />;
}
