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

  /* Saíram daqui dois números e um distintivo, e cada um por uma razão:

     - **«N vendidos»** lia `total_vendas` do anúncio mais recente. Essa coluna
       tem `DEFAULT 0` e **nenhum código no repositório alguma vez lhe escreve**
       — não há caminho, do webhook do Stripe ao painel de administração, que a
       incremente quando um cavalo é vendido. Ou seja: ou dizia sempre zero, ou
       dizia um número que alguém pôs à mão na base sem nada por trás. Um
       historial de vendas é a coisa que mais pesa na decisão de confiar num
       vendedor, e este não era contado por ninguém. O dado fica na base; o que
       sai é a afirmação.
     - **«Vendedor verificado»** vinha de um `.some()` sobre a coluna
       `verificado` de `cavalos_venda` — que é uma marca por **anúncio**, posta
       por um administrador através de uma rota de API, sem critério escrito em
       lado nenhum e sem ecrã que a mostre. Um anúncio marcado passava a
       carimbar a pessoa inteira, e para todos os anúncios dela, incluindo os
       que ninguém tinha visto. Uma marca por anúncio não se generaliza ao
       vendedor sem se decidir primeiro o que ela quer dizer.

     O que fica é o que se sabe mesmo: o nome que o vendedor escreveu, quantos
     anúncios tem em pé, e desde quando anuncia. */
  return { nome, anuncios, desde: anuncios[anuncios.length - 1].createdAt };
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
                <span className="text-[var(--foreground-muted)]">
                  Anúncios publicados pelo próprio vendedor
                </span>
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
