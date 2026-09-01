import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { cache } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { LISTING_STATUS, normalizeListing } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";

export const revalidate = 600;

/**
 * Everything publicly visible about one seller.
 *
 * Only listings the public can already see are included, and only fields the
 * seller chose to publish on those listings — the account email is never shown.
 */
const getVendedor = cache(async (id: string) => {
  const { data, error } = await supabaseAdmin
    .from("cavalos_venda")
    .select("*")
    .eq("user_id", id)
    .in("status", [LISTING_STATUS.ACTIVE, LISTING_STATUS.RESERVADO])
    .order("created_at", { ascending: false });

  if (error) {
    logger.error("[vendedor] Supabase error:", error);
    return null;
  }

  if (!data || data.length === 0) return null;

  const agora = new Date();
  const anuncios = data.map((row) => normalizeListing(row, agora)).filter((a) => !a.expirado);

  if (anuncios.length === 0) return null;

  // The display name comes from the listings themselves, which is what the
  // seller published; nothing is read from the account.
  const nome =
    (data.find((d) => d.vendedor_nome)?.vendedor_nome as string) || "Vendedor no Portal Lusitano";

  const vendidos = Number(data[0]?.total_vendas) || 0;
  const verificado = data.some((d) => d.verificado === true);

  return { nome, anuncios, vendidos, verificado, desde: anuncios[anuncios.length - 1].createdAt };
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const vendedor = await getVendedor(id);

  if (!vendedor) return { title: "Vendedor não encontrado — Portal Lusitano" };

  return {
    title: `${vendedor.nome} — Cavalos Lusitanos à venda`,
    description: `${vendedor.anuncios.length} ${
      vendedor.anuncios.length === 1 ? "cavalo Lusitano" : "cavalos Lusitanos"
    } à venda por ${vendedor.nome} no Portal Lusitano.`,
  };
}

function formatarPreco(preco: number | null, sobConsulta: boolean): string {
  if (sobConsulta || preco === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(preco);
}

export default async function VendedorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const vendedor = await getVendedor(id);

  if (!vendedor) notFound();

  return (
    <div className="min-h-screen bg-[var(--background)] px-5 sm:px-8 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <header className="pb-8 border-b border-[var(--border)]">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-[var(--elevate-1)] flex items-center justify-center shrink-0">
              <span className="text-[var(--foreground-muted)] text-xl font-normal">
                {vendedor.nome.charAt(0).toUpperCase()}
              </span>
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl font-normal tracking-wide text-[var(--foreground)] truncate">
                {vendedor.nome}
              </h1>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 rotulo">
                <span>
                  {vendedor.anuncios.length}{" "}
                  {vendedor.anuncios.length === 1 ? "anúncio" : "anúncios"}
                </span>
                {vendedor.vendidos > 0 && <span>{vendedor.vendidos} vendidos</span>}
                {vendedor.verificado && (
                  <span className="text-[var(--foreground-muted)]">Vendedor verificado</span>
                )}
              </div>
            </div>
          </div>
        </header>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 bg-[var(--elevate-1)] gap-px mt-10">
          {vendedor.anuncios.map((a) => (
            <LocalizedLink
              key={a.id}
              href={`/comprar/${a.id}`}
              className="bg-[var(--background)] group"
            >
              <div className="relative aspect-[4/3] bg-[var(--background-secondary)]/30 overflow-hidden">
                {a.fotoPrincipal ? (
                  <Image
                    src={a.fotoPrincipal}
                    alt={a.nome}
                    fill
                    sizes="(max-width:640px) 100vw, (max-width:1024px) 50vw, 33vw"
                    className="object-cover opacity-85 group-hover:opacity-100 group-hover:scale-[1.03] transition-all duration-500"
                  />
                ) : null}
                {a.status === LISTING_STATUS.RESERVADO && (
                  <span className="absolute top-3 left-3 bg-amber-400/90 text-black px-2 py-1 rotulo">
                    Reservado
                  </span>
                )}
              </div>
              <div className="p-4">
                <h2 className="text-sm text-[var(--foreground)] truncate group-hover:text-[var(--foreground-strong)] transition-colors">
                  {a.nome}
                </h2>
                <p className="text-sm text-[var(--foreground-muted)] mt-1">
                  {formatarPreco(a.preco, a.precoSobConsulta)}
                </p>
                <p className="rotulo mt-2">
                  {[a.idade ? `${a.idade} anos` : null, a.localizacao].filter(Boolean).join(" · ")}
                </p>
              </div>
            </LocalizedLink>
          ))}
        </div>

        <div className="mt-12 text-center">
          <LocalizedLink
            href="/comprar"
            className="inline-block px-6 py-3 border border-[var(--border-soft)] rotulo-forte hover:bg-[var(--elevate-1)] transition-colors"
          >
            Ver todos os cavalos
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
}
