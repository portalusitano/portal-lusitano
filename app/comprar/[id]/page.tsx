import { cache } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase-admin";
import ContactarVendedor from "@/components/comprar/ContactarVendedor";
import RegistarVisualizacao from "@/components/comprar/RegistarVisualizacao";
import DenunciarAnuncio from "@/components/comprar/DenunciarAnuncio";
import AccoesAnuncio from "@/components/comprar/AccoesAnuncio";
import HistoricoVisita from "@/components/comprar/HistoricoVisita";
import VistosRecentemente from "@/components/VistosRecentemente";
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
  Clock,
} from "lucide-react";
import HorseCard from "@/components/HorseCard";
import Revelar from "@/components/Revelar";
import PhotoGallery from "@/components/PhotoGallery";

import { CavaloVenda } from "@/types/cavalo";
import { filtroNaoExpirado, visibilidadeFicha } from "@/lib/marketplace-listings";

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
      .eq("status", "active")
      .or(filtroNaoExpirado());
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
  /** Fim do período pago. Ausente nos anúncios anteriores aos escalões. */
  listing_expires_at?: string | null;
  status?: string | null;
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
      supabase
        .from("cavalos_venda")
        .select("*")
        .eq("status", "active")
        .or(filtroNaoExpirado())
        .neq("id", id)
        .limit(4),
    ]);
    cavalo = fetchedCavalo;
    similarHorses = (similar || []).map((c) => ({ ...c }));
  }

  if (!cavalo) {
    notFound();
  }

  // O anúncio pago tem um fim. Passado o prazo — ou depois de vendido — a ficha
  // continua a abrir, porque o link já circulou, mas deixa de encaminhar
  // contactos para um vendedor que já não está à espera deles. O que nunca foi
  // público, o que está pausado e o que foi apagado dão 404.
  const visibilidade =
    id === "demo"
      ? ("visivel" as const)
      : visibilidadeFicha(cavalo.status ?? "", cavalo.listing_expires_at ?? null);

  if (visibilidade === "indisponivel") {
    notFound();
  }

  const encerrado = visibilidade !== "visivel";

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
    ? `https://wa.me/${cavalo.contacto_telefone.replace(/\D/g, "")}?text=${encodeURIComponent(`Olá! Tenho interesse no cavalo"${cavalo.nome_cavalo}" (REG: ${cavalo.id.slice(0, 8).toUpperCase()}) anunciado no Portal Lusitano.`)}`
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

      {/* ── Barra de contacto fixa — só em telemóvel ── */}
      {!encerrado && (
        <div className="lg:hidden fixed bottom-16 left-0 right-0 z-30 bg-[var(--background)]/95 backdrop-blur-md border-t border-[var(--border)] px-3 py-2.5 flex items-center gap-2">
          <div className="flex-1 min-w-0">
            <p className="rotulo mb-0.5 leading-none">Preço</p>
            <p className="preco text-base leading-none">
              {Number(cavalo.preco).toLocaleString("pt-PT")} €
            </p>
          </div>
          {whatsappLink ? (
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="btn touch-manipulation gap-1.5 whitespace-nowrap rounded-full px-4 active:scale-95"
              style={{ background: "#25D366", color: "#fff" }}
            >
              <MessageCircle size={14} />
              WhatsApp
            </a>
          ) : null}
          <a
            href={`mailto:${cavalo.contacto_email || "geral@portal-lusitano.pt"}?subject=Interesse: ${encodeURIComponent(cavalo.nome_cavalo)} (REG: ${cavalo.id.slice(0, 8).toUpperCase()})`}
            className="btn btn-primario btn-sm touch-manipulation active:scale-95 whitespace-nowrap"
          >
            <Mail size={14} />
            Email
          </a>
        </div>
      )}

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
              <span className="rotulo">Sem Fotografia</span>
            </div>
          )}
        </div>

        {/* RIGHT PANEL — scrollable dossier */}
        <div className="lg:w-1/2 lg:ml-[50%] bg-[var(--background)] relative z-10">
          <div className="px-4 sm:px-8 py-10 lg:px-14 lg:py-14 pb-28 lg:pb-16 max-w-2xl mx-auto space-y-10">
            {/* HEADER */}
            <header className="space-y-4 border-b border-[var(--background-secondary)] pb-8">
              {encerrado && (
                <div
                  role="status"
                  className="flex items-start gap-3 border border-[var(--border-soft)] bg-[var(--elevate-1)] px-4 py-3"
                >
                  <Clock
                    size={15}
                    aria-hidden="true"
                    className="mt-0.5 flex-shrink-0 text-[var(--foreground-muted)]"
                  />
                  <div className="space-y-1">
                    <p className="rotulo-forte text-[var(--foreground-strong)]">
                      {visibilidade === "vendido" ? "Cavalo vendido" : "Anúncio terminado"}
                    </p>
                    <p className="text-xs text-[var(--foreground-secondary)] leading-relaxed">
                      {visibilidade === "vendido"
                        ? "Este cavalo já foi vendido. A ficha fica para consulta — os contactos do vendedor deixaram de estar disponíveis."
                        : "O período de publicação deste anúncio chegou ao fim, por isso os contactos do vendedor já não estão disponíveis."}
                      {""}
                      <Link
                        href="/comprar"
                        className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
                      >
                        Ver cavalos disponíveis
                      </Link>
                      .
                    </p>
                  </div>
                </div>
              )}

              {/* Breadcrumb chips */}
              <nav
                aria-label="Localização no site"
                className="meta flex flex-wrap items-center gap-2"
              >
                <Link
                  href="/comprar"
                  className="hover:text-[var(--foreground-strong)] transition-colors"
                >
                  Comprar
                </Link>
                <ChevronRight size={10} aria-hidden="true" />
                <span className="text-[var(--foreground-secondary)]">{cavalo.nome_cavalo}</span>
              </nav>

              {/* Linhagem + ID chips */}
              <div className="flex flex-wrap items-center gap-3">
                {cavalo.linhagem && <span className="chip chip-activo">{cavalo.linhagem}</span>}
                <span className="meta font-mono">REG: {cavalo.id.slice(0, 8).toUpperCase()}</span>
              </div>

              <h1 className="titulo-gradiente text-3xl sm:text-4xl font-normal leading-[110%] tracking-tight">
                {cavalo.nome_cavalo}
              </h1>

              <p className="preco text-2xl sm:text-3xl">
                {Number(cavalo.preco).toLocaleString("pt-PT")} €
              </p>

              {/* Guardar + partilhar — como em qualquer classificados, é daqui
 que o anúncio circula para fora do site. */}
              <AccoesAnuncio
                cavalo={{
                  id: cavalo.id,
                  slug: cavalo.id,
                  name: cavalo.nome_cavalo,
                  age: cavalo.idade ?? undefined,
                  price: cavalo.preco ?? undefined,
                  image: cavalo.image_url ?? undefined,
                  location: cavalo.localizacao ?? undefined,
                }}
                url={`${siteUrl}/comprar/${id}`}
              />

              {/* Quick meta pills */}
              <div className="flex flex-wrap gap-2 pt-1">
                {cavalo.idade && (
                  <span className="chip">
                    <Calendar size={11} aria-hidden="true" />
                    {cavalo.idade} anos
                  </span>
                )}
                {cavalo.localizacao && (
                  <span className="chip">
                    <MapPin size={11} aria-hidden="true" />
                    {cavalo.localizacao}
                  </span>
                )}
                {cavalo.sexo && <span className="chip">{cavalo.sexo}</span>}
                {disciplines.map((d) => (
                  <span key={d} className="chip chip-activo">
                    {d}
                  </span>
                ))}
              </div>
            </header>

            {/* BIOMETRIC SPECS */}
            <Revelar duracao={600}>
              <section aria-labelledby="specs-heading">
                <h2 id="specs-heading" className="titulo-seccao mb-5">
                  Especificações
                </h2>
                <dl className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
                  {cavalo.idade && (
                    <div>
                      <dt className="rotulo mb-1">Idade</dt>
                      <dd className="text-base font-medium text-[var(--foreground)]">
                        {cavalo.idade} Anos
                      </dd>
                    </div>
                  )}
                  {cavalo.localizacao && (
                    <div>
                      <dt className="rotulo mb-1">Localização</dt>
                      <dd className="text-base font-medium text-[var(--foreground)]">
                        {cavalo.localizacao}
                      </dd>
                    </div>
                  )}
                  {cavalo.altura && (
                    <div>
                      <dt className="rotulo mb-1">Altura ao Garrote</dt>
                      <dd className="text-base font-medium text-[var(--foreground)]">
                        {cavalo.altura} cm
                      </dd>
                    </div>
                  )}
                  {cavalo.pelagem && (
                    <div>
                      <dt className="rotulo mb-1">Pelagem</dt>
                      <dd className="text-base font-medium text-[var(--foreground)]">
                        {cavalo.pelagem}
                      </dd>
                    </div>
                  )}
                  {cavalo.nivel && (
                    <div>
                      <dt className="rotulo mb-1">Nível de Treino</dt>
                      <dd className="text-base font-medium text-[var(--foreground)]">
                        {cavalo.nivel}
                      </dd>
                    </div>
                  )}
                  {cavalo.pontuacao_apsl && (
                    <div>
                      <dt className="rotulo mb-1">Pontuação APSL</dt>
                      <dd className="text-base font-medium text-[var(--foreground)]">
                        {cavalo.pontuacao_apsl} pts
                      </dd>
                    </div>
                  )}
                </dl>

                {/* Description */}
                {cavalo.descricao && (
                  <div className="mt-10 pt-8 border-t border-[var(--background-secondary)]">
                    <h3 className="rotulo-forte mb-2">Parecer Técnico</h3>
                    <p className="leading-relaxed text-sm sm:text-base text-[var(--foreground-secondary)]">
                      &ldquo;{cavalo.descricao}&rdquo;
                    </p>
                  </div>
                )}
              </section>
            </Revelar>

            {/* PEDIGREE */}
            {(cavalo.pai || cavalo.mae) && (
              <Revelar duracao={600}>
                <section
                  aria-labelledby="pedigree-heading"
                  className="border-t border-[var(--background-secondary)] pt-10"
                >
                  <h2 id="pedigree-heading" className="titulo-seccao mb-5">
                    Certificado de Sangue
                  </h2>
                  <Pedigree cavalo={cavalo} />
                  <p className="meta text-center mt-4">Dados verificados via Stud-Book Digital</p>
                </section>
              </Revelar>
            )}

            {/* Conta a visualização — o vendedor paga o anúncio e este é o
 único indicador de retorno que recebe. */}
            <RegistarVisualizacao cavaloId={cavalo.id} />

            {/* Histórico local, para o comprador conseguir voltar a este
 anúncio depois de percorrer outros. */}
            <HistoricoVisita
              id={cavalo.id}
              nome={cavalo.nome_cavalo}
              preco={cavalo.preco}
              imagem={cavalo.image_url}
              localizacao={cavalo.localizacao}
            />

            {/* CONTACT / CTA */}
            <Revelar duracao={600}>
              <section
                aria-labelledby="contact-heading"
                className="border-t border-[var(--background-secondary)] pt-10"
              >
                <h2 id="contact-heading" className="titulo-seccao mb-4">
                  {encerrado ? "Vendedor" : "Contactar Vendedor"}
                </h2>

                <div className="space-y-3">
                  {/* Seller info chip */}
                  {cavalo.contacto_nome && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-[var(--background-secondary)] border border-[var(--border)]">
                      <div className="w-9 h-9 rounded-full bg-[var(--elevate-1)] flex items-center justify-center flex-shrink-0">
                        <span className="text-sm font-bold text-[var(--foreground-strong)]">
                          {cavalo.contacto_nome.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {cavalo.contacto_nome}
                        </p>
                        {cavalo.user_id ? (
                          <a
                            href={`/vendedor/${cavalo.user_id}`}
                            className="rotulo transition-colors hover:text-[var(--foreground-strong)]"
                          >
                            Ver outros anúncios deste vendedor →
                          </a>
                        ) : (
                          <p className="rotulo">Vendedor verificado</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Passado o prazo, os contactos deixam de ser encaminhados:
 o vendedor já não está à espera de chamadas por este
 anúncio, e recebê-las é pior do que não receber nada. */}
                  {encerrado && (
                    <p className="px-4 py-3 bg-[var(--background-secondary)] border border-[var(--border)] text-xs text-[var(--foreground-secondary)] leading-relaxed">
                      Os contactos deste anúncio já não estão disponíveis.
                      {cavalo.user_id ? (
                        <>
                          {""}
                          Pode ver o que este vendedor tem à venda em{""}
                          <Link
                            href={`/vendedor/${cavalo.user_id}`}
                            className="text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 transition-colors hover:decoration-[var(--border-hover)]"
                          >
                            outros anúncios
                          </Link>
                          .
                        </>
                      ) : null}
                    </p>
                  )}

                  {/* Mensagem no portal — preferida quando o anúncio tem conta
 associada, para o contacto directo do vendedor deixar de ser
 o único caminho e não ficar exposto a scraping. */}
                  {!encerrado && cavalo.user_id && (
                    <ContactarVendedor cavaloId={cavalo.id} cavaloNome={cavalo.nome_cavalo} />
                  )}

                  {/* WhatsApp CTA — primary */}
                  {!encerrado && whatsappLink && (
                    <a
                      href={whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn w-full text-white"
                      style={{ background: "#25D366", color: "#fff" }}
                    >
                      <MessageCircle size={16} aria-hidden="true" />
                      Contactar via WhatsApp
                    </a>
                  )}

                  {/* Phone call */}
                  {!encerrado && cavalo.contacto_telefone && (
                    <a
                      href={`tel:${cavalo.contacto_telefone.replace(/\s/g, "")}`}
                      className="btn btn-secundario w-full"
                    >
                      <Phone size={16} aria-hidden="true" />
                      {cavalo.contacto_telefone}
                    </a>
                  )}

                  {/* Email — always available as fallback */}
                  {!encerrado && (
                    <a
                      href={`mailto:${cavalo.contacto_email || "geral@portal-lusitano.pt"}?subject=Interesse: ${encodeURIComponent(cavalo.nome_cavalo)} (REG: ${cavalo.id.slice(0, 8).toUpperCase()})`}
                      className="btn btn-primario w-full"
                    >
                      <Mail size={16} aria-hidden="true" />
                      Enviar Mensagem
                    </a>
                  )}

                  {!encerrado && (
                    <p className="meta text-center pt-1">
                      Resposta em menos de 24 horas · Transacção segura
                    </p>
                  )}

                  <DenunciarAnuncio cavaloId={cavalo.id} />
                </div>
              </section>
            </Revelar>

            {/* SIMILAR HORSES */}
            {similarHorses.length > 0 && (
              <section className="border-t border-[var(--background-secondary)] pt-10">
                <h2 className="titulo-seccao mb-4">Anúncios Similares</h2>
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {similarHorses.map((h) => (
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
                  <Link href="/comprar" className="btn btn-secundario">
                    Ver todos os anúncios
                  </Link>
                </div>
              </section>
            )}

            <VistosRecentemente
              excluirId={cavalo.id}
              limite={4}
              gridClassName="grid-cols-2"
              className="border-t border-[var(--background-secondary)] pt-10"
            />

            {/* Back to marketplace */}
            {similarHorses.length === 0 && (
              <div className="border-t border-[var(--background-secondary)] pt-8">
                <Link href="/comprar" className="btn btn-subtil">
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
