import { cache } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase-admin";
import ContactarVendedor from "@/components/comprar/ContactarVendedor";
import Pedigree from "@/components/Pedigree";
import { HorseSchema, BreadcrumbSchema } from "@/components/JsonLd";
import {
  MapPin,
  Calendar,
  ArrowLeft,
  Phone,
  Mail,
  ChevronRight,
  MessageCircle,
  Share2,
  Heart,
} from "lucide-react";
import HorseCard from "@/components/HorseCard";
import PhotoGallery from "@/components/PhotoGallery";

import { CavaloVenda } from "@/types/cavalo";

// cache() deduplicates this call between generateMetadata and the page component
// within a single server request — saves 1 Supabase round-trip per page load
const getCavalo = cache(async (id: string) => {
  const { data } = await supabase.from("cavalos_venda").select("*").eq("id", id).single();
  if (!data) return null;
  // Normalize DB column names → component-expected names
  // Live DB uses 'nome'/'foto_principal', components expect 'nome_cavalo'/'image_url'
  return {
    ...data,
    nome_cavalo: data.nome_cavalo || (data as unknown as Record<string, unknown>)["nome"],
    image_url: data.image_url || (data as unknown as Record<string, unknown>)["foto_principal"],
  };
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://portal-lusitano.pt";

// ISR: revalidar páginas de cavalos a cada 30 minutos (preços e disponibilidade mudam)
export const revalidate = 1800;

// Pré-renderizar os cavalos aprovados para indexação imediata pelo Google
export async function generateStaticParams() {
  try {
    const { data: cavalos } = await supabase
      .from("cavalos_venda")
      .select("id")
      .eq("status", "active");
    return (cavalos || []).map((c) => ({ id: c.id }));
  } catch {
    return [{ id: "demo" }];
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;

  if (id === "demo") {
    return {
      title: "Imperador do Lagar | Portal Lusitano",
      description: "Garanhão Lusitano de linhagem Veiga, 6 anos. Disponível no Portal Lusitano.",
    };
  }

  try {
    // Reuses cached result from getCavalo() — no extra Supabase call
    const cavalo = await getCavalo(id);

    if (cavalo) {
      const description = cavalo.descricao || `Cavalo Lusitano - ${cavalo.nome_cavalo}`;
      return {
        title: `${cavalo.nome_cavalo} | Portal Lusitano`,
        description,
        openGraph: {
          title: cavalo.nome_cavalo,
          description,
          images: cavalo.image_url ? [{ url: cavalo.image_url, alt: cavalo.nome_cavalo }] : [],
          type: "website",
          url: `${siteUrl}/comprar/${id}`,
        },
        twitter: {
          card: "summary_large_image",
          title: cavalo.nome_cavalo,
          description,
        },
        alternates: { canonical: `${siteUrl}/comprar/${id}` },
      };
    }
  } catch {
    // fallback
  }

  return {
    title: "Cavalo Lusitano | Portal Lusitano",
    description: "Cavalos Lusitanos de elite à venda no Portal Lusitano.",
  };
}

// Extended CavaloVenda with optional extra fields returned from SELECT *
interface CavaloDetalhe extends CavaloVenda {
  sexo?: string;
  altura?: number;
  pelagem?: string;
  disciplinas?: string[] | string | null;
  nivel?: string;
  contacto_nome?: string;
  contacto_email?: string;
  contacto_telefone?: string;
  destaque?: boolean;
  // Multiple photos stored as JSON array or comma-separated string
  image_urls?: string[] | string | null;
  fotos?: string[] | string | null;
  regiao?: string;
  coudelaria?: string;
  linhagem?: string;
  /** Conta do vendedor. Ausente em anúncios que nunca foram reclamados. */
  user_id?: string | null;
}

export default async function DetalheCavaloPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const { id } = resolvedParams;

  let cavalo: CavaloDetalhe | null = null;
  let similarHorses: CavaloDetalhe[] = [];

  // --- MODO DEMO ---
  if (id === "demo") {
    cavalo = {
      id: "demo-123",
      nome_cavalo: "Imperador do Lagar",
      preco: 45000,
      idade: 6,
      localizacao: "Golegã, Capital do Cavalo",
      linhagem: "Veiga (MV)",
      descricao:
        "Garanhão de pelagem ruça, com 1.64m ao garrote. Aprovado com 76 pontos. Apresenta uma mecânica de movimentos excecional, com facilidade natural para o Piaffe e Passage. Temperamento de fogo mas colaborante, típico da linhagem Veiga antiga.",
      image_url: "https://images.unsplash.com/photo-1553284965-83fd3e82fa5a?q=80&w=2071",
      pai: "Sultão (MV)",
      mae: "Duquesa (MV)",
      pontuacao_apsl: 76,
      sexo: "Macho",
      altura: 164,
      pelagem: "Ruça",
      nivel: "Alta-escola",
      disciplinas: ["Dressage", "Alta-escola"],
    };
  }
  // --- MODO REAL (Supabase) ---
  else {
    const [fetchedCavalo, { data: similar }] = await Promise.all([
      getCavalo(id),
      supabase.from("cavalos_venda").select("*").eq("status", "active").neq("id", id).limit(4),
    ]);
    cavalo = fetchedCavalo;
    similarHorses = (similar || []).map((c) => ({ ...c }));
  }

  if (!cavalo) {
    notFound();
  }

  // Normalise disciplines to array
  const disciplines: string[] = (() => {
    if (!cavalo.disciplinas) return [];
    if (Array.isArray(cavalo.disciplinas)) return cavalo.disciplinas as string[];
    if (typeof cavalo.disciplinas === "string") {
      return (cavalo.disciplinas as string)
        .split(",")
        .map((d: string) => d.trim())
        .filter(Boolean);
    }
    return [];
  })();

  // Collect all available photos (primary + extras)
  const allPhotos: string[] = (() => {
    const photos: string[] = [];
    if (cavalo.image_url) photos.push(cavalo.image_url);
    const extras = cavalo.image_urls || cavalo.fotos;
    if (extras) {
      const arr = Array.isArray(extras)
        ? extras
        : typeof extras === "string"
          ? extras.split(",")
          : [];
      arr.forEach((u: string) => {
        const t = u.trim();
        if (t && !photos.includes(t)) photos.push(t);
      });
    }
    return photos;
  })();

  const hasImage = allPhotos.length > 0;

  // WhatsApp link helper
  const whatsappLink = cavalo.contacto_telefone
    ? `https://wa.me/${cavalo.contacto_telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Tenho interesse no cavalo "${cavalo.nome_cavalo}" (REG: ${cavalo.id.slice(0, 8).toUpperCase()}) anunciado no Portal Lusitano.`)}`
    : null;

  return (
    <>
      <HorseSchema
        name={cavalo.nome_cavalo}
        description={cavalo.descricao || `Cavalo Lusitano - ${cavalo.nome_cavalo}`}
        image={cavalo.image_url || ""}
        price={cavalo.preco || undefined}
        breed="Lusitano"
        age={cavalo.idade || undefined}
        location={cavalo.localizacao || undefined}
      />
      <BreadcrumbSchema
        items={[
          { name: "Início", url: siteUrl },
          { name: "Comprar", url: `${siteUrl}/comprar` },
          { name: cavalo.nome_cavalo, url: `${siteUrl}/comprar/${id}` },
        ]}
      />

      {/* ── Sticky CTA bar — mobile only (above BottomNav) ── */}
      <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] px-3 py-2.5 flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] leading-none mb-0.5">
            Preço
          </p>
          <p className="text-base font-serif text-[var(--gold)] leading-none">
            {Number(cavalo.preco).toLocaleString("pt-PT")} €
          </p>
        </div>
        {whatsappLink ? (
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-4 py-2.5 text-[11px] uppercase font-bold tracking-wide rounded-lg touch-manipulation active:scale-95 whitespace-nowrap"
            style={{ background: "#25D366", color: "#fff" }}
          >
            <MessageCircle size={14} />
            WhatsApp
          </a>
        ) : null}
        <a
          href={`mailto:${cavalo.contacto_email || "geral@portal-lusitano.pt"}?subject=Interesse: ${encodeURIComponent(cavalo.nome_cavalo)} (REG: ${cavalo.id.slice(0, 8).toUpperCase()})`}
          className="flex items-center gap-1.5 bg-[var(--gold)] text-black px-4 py-2.5 text-[11px] uppercase font-bold tracking-wide rounded-lg touch-manipulation active:scale-95 whitespace-nowrap"
        >
          <Mail size={14} />
          Email
        </a>
      </div>

      <div className="flex flex-col lg:flex-row min-h-screen bg-[var(--background)] text-[var(--foreground)]">
        {/* LEFT PANEL — gallery (desktop sticky / mobile top) */}
        <div className="lg:w-1/2 lg:fixed lg:top-0 lg:left-0 lg:h-screen bg-[var(--background-secondary)] border-r border-[var(--background-secondary)] z-0 flex flex-col">
          {hasImage ? (
            <PhotoGallery
              photos={allPhotos}
              alt={cavalo.nome_cavalo}
              backHref="/comprar"
              destaque={cavalo.destaque}
            />
          ) : (
            <div className="w-full h-[55vw] lg:h-full flex items-center justify-center bg-[var(--background-secondary)]">
              <span className="text-[var(--foreground-muted)] text-[10px] uppercase tracking-widest">
                Sem Fotografia
              </span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — scrollable dossier */}
        <div className="lg:w-1/2 lg:ml-[50%] bg-[var(--background)] relative z-10">
          <div className="px-4 sm:px-8 py-12 sm:py-16 lg:p-20 xl:p-24 pb-28 lg:pb-20 max-w-2xl mx-auto space-y-12 sm:space-y-16">
            {/* HEADER */}
            <header className="space-y-4 border-b border-[var(--background-secondary)] pb-8">
              {/* Breadcrumb chips */}
              <nav
                aria-label="Localização no site"
                className="flex flex-wrap items-center gap-2 text-[9px] uppercase tracking-widest text-[var(--foreground-muted)]"
              >
                <Link href="/comprar" className="hover:text-[var(--gold)] transition-colors">
                  Comprar
                </Link>
                <ChevronRight size={10} aria-hidden="true" />
                <span className="text-[var(--foreground-secondary)]">{cavalo.nome_cavalo}</span>
              </nav>

              {/* Linhagem + ID chips */}
              <div className="flex flex-wrap items-center gap-3">
                {cavalo.linhagem && (
                  <span className="px-3 py-1 border border-[var(--gold)] text-[var(--gold)] text-[9px] uppercase tracking-widest font-bold">
                    {cavalo.linhagem}
                  </span>
                )}
                <span className="text-[var(--foreground-muted)] text-[9px] uppercase tracking-widest font-mono">
                  REG: {cavalo.id.slice(0, 8).toUpperCase()}
                </span>
              </div>

              <h1 className="text-4xl sm:text-5xl md:text-6xl font-serif italic text-[var(--foreground)] leading-tight">
                {cavalo.nome_cavalo}
              </h1>

              <p className="text-2xl sm:text-3xl text-[var(--gold)] font-serif">
                {Number(cavalo.preco).toLocaleString("pt-PT")} €
              </p>

              {/* Quick meta pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {cavalo.idade && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--foreground-secondary)] border border-[var(--border)] px-2.5 py-1">
                    <Calendar size={11} aria-hidden="true" />
                    {cavalo.idade} anos
                  </span>
                )}
                {cavalo.localizacao && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-[var(--foreground-secondary)] border border-[var(--border)] px-2.5 py-1">
                    <MapPin size={11} aria-hidden="true" />
                    {cavalo.localizacao}
                  </span>
                )}
                {cavalo.sexo && (
                  <span className="text-[10px] text-[var(--foreground-secondary)] border border-[var(--border)] px-2.5 py-1 uppercase tracking-wide">
                    {cavalo.sexo}
                  </span>
                )}
                {disciplines.map((d) => (
                  <span
                    key={d}
                    className="text-[10px] text-[var(--gold)] border border-[var(--gold)]/30 px-2.5 py-1 uppercase tracking-wide"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </header>

            {/* BIOMETRIC SPECS */}
            <section aria-labelledby="specs-heading">
              <h2
                id="specs-heading"
                className="text-[var(--gold)] uppercase tracking-[0.5em] text-[10px] font-bold mb-8"
              >
                Especificações
              </h2>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-8">
                {cavalo.idade && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">
                      Idade
                    </dt>
                    <dd className="text-xl sm:text-2xl text-[var(--foreground)] font-serif">
                      {cavalo.idade} Anos
                    </dd>
                  </div>
                )}
                {cavalo.localizacao && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">
                      Localização
                    </dt>
                    <dd className="text-xl sm:text-2xl text-[var(--foreground)] font-serif">
                      {cavalo.localizacao}
                    </dd>
                  </div>
                )}
                {cavalo.altura && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">
                      Altura ao Garrote
                    </dt>
                    <dd className="text-xl sm:text-2xl text-[var(--foreground)] font-serif">
                      {cavalo.altura} cm
                    </dd>
                  </div>
                )}
                {cavalo.pelagem && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">
                      Pelagem
                    </dt>
                    <dd className="text-xl sm:text-2xl text-[var(--foreground)] font-serif">
                      {cavalo.pelagem}
                    </dd>
                  </div>
                )}
                {cavalo.nivel && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">
                      Nível de Treino
                    </dt>
                    <dd className="text-xl sm:text-2xl text-[var(--foreground)] font-serif">
                      {cavalo.nivel}
                    </dd>
                  </div>
                )}
                {cavalo.pontuacao_apsl && (
                  <div>
                    <dt className="text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] mb-1">
                      Pontuação APSL
                    </dt>
                    <dd className="text-xl sm:text-2xl text-[var(--foreground)] font-serif">
                      {cavalo.pontuacao_apsl} pts
                    </dd>
                  </div>
                )}
              </dl>

              {/* Description */}
              {cavalo.descricao && (
                <div className="mt-10 pt-8 border-t border-[var(--background-secondary)]">
                  <h3 className="text-[10px] uppercase tracking-widest text-[var(--gold)] font-bold mb-4">
                    Parecer Técnico
                  </h3>
                  <p className="font-light leading-relaxed text-base sm:text-lg italic text-[var(--foreground-secondary)]">
                    &ldquo;{cavalo.descricao}&rdquo;
                  </p>
                </div>
              )}
            </section>

            {/* PEDIGREE */}
            {(cavalo.pai || cavalo.mae) && (
              <section
                aria-labelledby="pedigree-heading"
                className="border-t border-[var(--background-secondary)] pt-10"
              >
                <h2
                  id="pedigree-heading"
                  className="text-[var(--gold)] uppercase tracking-[0.5em] text-[10px] font-bold mb-10"
                >
                  Certificado de Sangue
                </h2>
                <Pedigree cavalo={cavalo} />
                <p className="text-center text-[9px] text-[var(--foreground-muted)] mt-6 uppercase tracking-widest">
                  Dados verificados via Stud-Book Digital
                </p>
              </section>
            )}

            {/* CONTACT / CTA */}
            <section
              aria-labelledby="contact-heading"
              className="border-t border-[var(--background-secondary)] pt-10"
            >
              <h2
                id="contact-heading"
                className="text-[var(--gold)] uppercase tracking-[0.5em] text-[10px] font-bold mb-6"
              >
                Contactar Vendedor
              </h2>

              <div className="space-y-3">
                {/* Seller info chip */}
                {cavalo.contacto_nome && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-[var(--background-secondary)] border border-[var(--border)]">
                    <div className="w-9 h-9 rounded-full bg-[var(--gold)]/15 flex items-center justify-center flex-shrink-0">
                      <span className="text-[var(--gold)] text-sm font-bold">
                        {cavalo.contacto_nome.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">
                        {cavalo.contacto_nome}
                      </p>
                      <p className="text-[10px] text-[var(--foreground-muted)] uppercase tracking-wide">
                        Vendedor verificado
                      </p>
                    </div>
                  </div>
                )}

                {/* Mensagem no portal — preferida quando o anúncio tem conta
                    associada, para o contacto directo do vendedor deixar de ser
                    o único caminho e não ficar exposto a scraping. */}
                {cavalo.user_id && (
                  <ContactarVendedor cavaloId={cavalo.id} cavaloNome={cavalo.nome_cavalo} />
                )}

                {/* WhatsApp CTA — primary */}
                {whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex w-full items-center justify-center gap-3 py-4 text-[12px] uppercase font-bold tracking-[0.2em] transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                    style={{ background: "#25D366", color: "#fff" }}
                  >
                    <MessageCircle size={16} aria-hidden="true" />
                    Contactar via WhatsApp
                  </a>
                )}

                {/* Phone call */}
                {cavalo.contacto_telefone && (
                  <a
                    href={`tel:${cavalo.contacto_telefone.replace(/\s/g, "")}`}
                    className="flex w-full items-center justify-center gap-3 py-4 text-[12px] uppercase font-bold tracking-[0.2em] bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground)] hover:border-[var(--gold)]/50 transition-all duration-300"
                  >
                    <Phone size={16} aria-hidden="true" />
                    {cavalo.contacto_telefone}
                  </a>
                )}

                {/* Email — always available as fallback */}
                <a
                  href={`mailto:${cavalo.contacto_email || "geral@portal-lusitano.pt"}?subject=Interesse: ${encodeURIComponent(cavalo.nome_cavalo)} (REG: ${cavalo.id.slice(0, 8).toUpperCase()})`}
                  className="flex w-full items-center justify-center gap-3 bg-[var(--gold)] text-black py-4 text-[12px] uppercase font-bold tracking-[0.2em] hover:bg-[var(--gold-hover)] transition-all duration-300 shadow-[0_0_30px_rgba(197,160,89,0.2)]"
                >
                  <Mail size={16} aria-hidden="true" />
                  Enviar Mensagem
                </a>

                <p className="text-center text-[9px] text-[var(--foreground-muted)] uppercase tracking-widest pt-1">
                  Resposta em menos de 24 horas · Transacção segura
                </p>
              </div>
            </section>

            {/* SIMILAR HORSES */}
            {similarHorses.length > 0 && (
              <section className="border-t border-[var(--background-secondary)] pt-10">
                <h2 className="text-[var(--gold)] uppercase tracking-[0.5em] text-[10px] font-bold mb-6">
                  Anúncios Similares
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {similarHorses.map((h, i) => (
                    <HorseCard
                      key={h.id}
                      horse={{
                        id: h.id,
                        nome_cavalo: h.nome_cavalo,
                        preco: h.preco,
                        image_url: h.image_url,
                        localizacao: h.localizacao,
                        idade: h.idade,
                        disciplinas: h.disciplinas,
                        nivel: h.nivel,
                        destaque: h.destaque,
                      }}
                      href={`/comprar/${h.id}`}
                      compact
                      priority={false}
                    />
                  ))}
                </div>
                <div className="mt-6 text-center">
                  <Link
                    href="/comprar"
                    className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[var(--gold)] border border-[var(--gold)]/30 px-5 py-3 hover:bg-[var(--gold)]/5 transition-all"
                  >
                    Ver todos os anúncios
                  </Link>
                </div>
              </section>
            )}

            {/* Back to marketplace */}
            {similarHorses.length === 0 && (
              <div className="border-t border-[var(--background-secondary)] pt-8">
                <Link
                  href="/comprar"
                  className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors"
                >
                  <ArrowLeft size={12} aria-hidden="true" />
                  Ver todos os anúncios
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
