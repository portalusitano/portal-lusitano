"use client";

import { useMemo } from "react";
import Image from "next/image";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";
import { CONTACT_EMAIL } from "@/lib/constants";
import RevealOnScroll from "@/components/ui/RevealOnScroll";
import AnimatedCounter from "@/components/ui/AnimatedCounter";
import {
  BookOpen,
  Shield,
  Crown,
  Users,
  Mail,
  ArrowRight,
  ArrowUpRight,
  Heart,
  Globe,
  Store,
  Search,
  Building2,
  Trophy,
  Briefcase,
  Check,
  LucideIcon,
  Euro,
  Calendar,
} from "lucide-react";

export default function SobreContent() {
  const { language } = useLanguage();
  const tr = useMemo(() => createTranslator(language), [language]);

  const values = useMemo(
    () => [
      {
        icon: Shield,
        title: tr("Rigor", "Rigour", "Rigor"),
        desc: tr(
          "Cada facto publicado é verificado em fontes credíveis. Preferimos ter menos informação do que informação errada.",
          "Every fact published is verified from credible sources. We prefer less information over wrong information.",
          "Cada hecho publicado es verificado en fuentes creíbles. Preferimos menos información que información errónea."
        ),
      },
      {
        icon: BookOpen,
        title: tr("Conhecimento", "Knowledge", "Conocimiento"),
        desc: tr(
          "Arquivo editorial com investigação profunda sobre a história, genética e arte equestre do Lusitano.",
          "Editorial archive with deep research on the history, genetics and equestrian art of the Lusitano.",
          "Archivo editorial con investigación profunda sobre la historia, genética y arte ecuestre del Lusitano."
        ),
      },
      {
        icon: Crown,
        title: tr("Tradição", "Tradition", "Tradición"),
        desc: tr(
          "Honramos a tradição de criação equestre portuguesa, preservando o legado das grandes coudelarias.",
          "We honour the tradition of Portuguese horse breeding, preserving the legacy of the great stud farms.",
          "Honramos la tradición de cría ecuestre portuguesa, preservando el legado de los grandes establos."
        ),
      },
      {
        icon: Globe,
        title: tr("Acessibilidade", "Accessibility", "Accesibilidad"),
        desc: tr(
          "Um classificados onde o anúncio diz o que é preciso saber e o negócio se fecha entre as duas partes.",
          "Free tools and trilingual content so that knowledge about the Lusitano reaches everyone.",
          "Herramientas gratuitas y contenido trilingüe para que el conocimiento sobre el Lusitano llegue a todos."
        ),
      },
    ],
    [tr]
  );

  const features = useMemo(
    (): {
      icon: LucideIcon;
      title: string;
      desc: string;
      href: string;
    }[] => [
      {
        icon: Store,
        title: tr("Marketplace de Cavalos", "Horse Marketplace", "Mercado de Caballos"),
        desc: tr(
          "Compra e venda de cavalos Lusitanos com fichas técnicas detalhadas.",
          "Buy and sell Lusitano horses with detailed technical sheets.",
          "Compra y venta de caballos Lusitanos con fichas técnicas detalladas."
        ),
        href: "/comprar",
      },
      {
        icon: Building2,
        title: tr("Directório de Coudelarias", "Stud Farm Directory", "Directorio de Caballerizas"),
        desc: tr(
          "As melhores coudelarias de Portugal, com perfis completos e avaliações.",
          "The best stud farms in Portugal, with complete profiles and reviews.",
          "Las mejores caballerizas de Portugal, con perfiles completos y valoraciones."
        ),
        href: "/directorio",
      },
      {
        icon: Euro,
        title: tr("Vender o seu cavalo", "Sell your horse", "Vender su caballo"),
        desc: tr(
          "Publique com fotografias, pedigree e histórico. Gere o anúncio e as mensagens a partir da sua conta.",
          "Publish with photographs, pedigree and history. Manage the listing and messages from your account.",
          "Publique con fotografías, pedigrí e historial. Gestione el anuncio y los mensajes desde su cuenta."
        ),
        href: "/vender-cavalo",
      },
      {
        icon: Calendar,
        title: tr("Eventos", "Events", "Eventos"),
        desc: tr(
          "Feiras, concursos e leilões onde compradores e criadores se encontram.",
          "Fairs, competitions and auctions where buyers and breeders meet.",
          "Ferias, concursos y subastas donde compradores y criadores se encuentran."
        ),
        href: "/eventos",
      },
      {
        icon: Users,
        title: tr("Comunidade", "Community", "Comunidad"),
        desc: tr(
          "Rede de cavaleiros, criadores, veterinários e profissionais do sector.",
          "Network of riders, breeders, veterinarians and industry professionals.",
          "Red de jinetes, criadores, veterinarios y profesionales del sector."
        ),
        href: "/registar",
      },
    ],
    [tr]
  );

  const stats = useMemo(
    () => [
      {
        value: 15,
        suffix: "+",
        label: tr("Cavalos documentados", "Documented horses", "Caballos documentados"),
      },
      {
        value: 0,
        suffix: "%",
        label: tr("Comissão sobre a venda", "Sale commission", "Comisión sobre la venta"),
      },
      { value: 3, suffix: "", label: tr("Línguas", "Languages", "Idiomas") },
      { value: 2023, suffix: "", label: tr("Ano de fundação", "Founded", "Año de fundación") },
    ],
    [tr]
  );

  const principles = useMemo(
    () => [
      tr("Informação verificada", "Verified information", "Información verificada"),
      tr("Trilingue PT / EN / ES", "Trilingual PT / EN / ES", "Trilingüe PT / EN / ES"),
      tr(
        "Contacto directo, sem comissões",
        "Direct contact, no commissions",
        "Contacto directo, sin comisiones"
      ),
      tr("Comunidade aberta", "Open community", "Comunidad abierta"),
      tr("Sem anúncios invasivos", "No invasive ads", "Sin anuncios invasivos"),
    ],
    [tr]
  );

  const audience = useMemo(
    (): { icon: LucideIcon; title: string; desc: string }[] => [
      {
        icon: Search,
        title: tr("Compradores", "Buyers", "Compradores"),
        desc: tr(
          "Pesquisa com filtros, alertas para quando aparecer o cavalo certo, e contacto directo com quem vende.",
          "Filtered search, alerts for when the right horse turns up, and direct contact with the seller.",
          "Búsqueda con filtros, alertas para cuando aparezca el caballo adecuado, y contacto directo con quien vende."
        ),
      },
      {
        icon: Building2,
        title: tr("Criadores", "Breeders", "Criadores"),
        desc: tr(
          "Promove a tua coudelaria para compradores nacionais e internacionais.",
          "Promote your stud farm to national and international buyers.",
          "Promociona tu caballeriza para compradores nacionales e internacionales."
        ),
      },
      {
        icon: Trophy,
        title: tr("Cavaleiros", "Riders", "Jinetes"),
        desc: tr(
          "Mantém-te a par da actualidade equestre lusitana.",
          "Stay up to date with Lusitano equestrian news.",
          "Mantente al tanto de la actualidad ecuestre lusitana."
        ),
      },
      {
        icon: Briefcase,
        title: tr("Profissionais", "Professionals", "Profesionales"),
        desc: tr(
          "Ganha visibilidade no directório de profissionais equestres.",
          "Gain visibility in the equestrian professionals directory.",
          "Gana visibilidad en el directorio de profesionales ecuestres."
        ),
      },
      {
        icon: Globe,
        title: tr("Internacional", "International", "Internacional"),
        desc: tr(
          "Descobre o património equestre português em três línguas.",
          "Discover Portuguese equestrian heritage in three languages.",
          "Descubre el patrimonio ecuestre portugués en español."
        ),
      },
    ],
    [tr]
  );

  return (
    <main className="min-h-screen bg-[var(--background)] overflow-x-hidden">
      {/* ── HERO ───────────────────────────────────────────────────────────
          Era um herói cinematográfico de ecrã inteiro: fotografia, grelha
          técnica, scan lines, cantos ornamentais, coordenadas e texto
          vertical. Bonito e de outra família visual — o sistema faz a
          profundidade com um gradiente radial e deixa o texto respirar. */}
      <section
        data-revelar=""
        className="relative overflow-hidden px-4 pt-28 pb-16 sm:px-6 md:pt-40 md:pb-24"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(40,40,40,.75) 0%, rgba(20,20,20,.4) 38%, rgba(0,0,0,1) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <p className="rotulo-forte mb-6">{tr("Sobre nós", "About us", "Sobre nosotros")}</p>

          <h1 className="titulo-gradiente mb-8 text-4xl font-normal leading-[100%] tracking-[-0.01em] sm:text-5xl md:text-[4rem]">
            {tr("A nossa missão", "Our mission", "Nuestra misión")}
          </h1>

          <p className="mx-auto max-w-2xl text-base leading-relaxed text-[var(--foreground-secondary)] sm:text-lg md:text-xl">
            {tr(
              "O Portal Lusitano existe para pôr criadores e compradores em contacto directo, sem intermediários e sem comissões. Um anúncio com genealogia, fotografias e contacto — e mais nada pelo meio.",
              "Portal Lusitano exists to put breeders and buyers in direct contact, with no middlemen and no commissions. A listing with pedigree, photographs and contact — and nothing else in between.",
              "Portal Lusitano existe para poner en contacto directo a criadores y compradores, sin intermediarios ni comisiones. Un anuncio con genealogía, fotografías y contacto — y nada más en medio."
            )}
          </p>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 STATS — editorial pillars
 ══════════════════════════════════════════════════════════════════════════ */}
      <section
        data-revelar=""
        className="grid grid-cols-2 sm:grid-cols-4 gap-px"
        style={{ background: "rgb(var(--gold-rgb) / 0.07)" }}
      >
        {stats.map((stat, i) => (
          <RevealOnScroll key={stat.label} delay={i * 100} variant="fade-up">
            <div
              className="relative group overflow-hidden flex flex-col items-center text-center p-8 sm:p-12 lg:p-14"
              style={{ background: "var(--background)" }}
            >
              {/* Top gold accent */}
              <div
                className="absolute top-0 left-0 right-0 h-[1px]"
                style={{
                  background:
                    "linear-gradient(90deg, rgb(var(--gold-rgb) / 0.5) 0%, rgb(var(--gold-rgb) / 0.1) 60%, transparent 100%)",
                }}
                aria-hidden
              />
              {/* Hover sweep */}
              <div
                className="absolute bottom-0 left-0 h-[1px] w-0 group-hover:w-full transition-[width] duration-500 bg-[var(--gold)]/30 pointer-events-none"
                aria-hidden
              />
              {/* Hover fill */}
              <div
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                style={{ background: "rgb(var(--gold-rgb) / 0.025)" }}
              />

              {/* Animated number */}
              <div className="relative z-10" style={{ fontSize: "clamp(2.2rem, 5vw, 3.5rem)" }}>
                <AnimatedCounter
                  end={stat.value}
                  duration={1800}
                  suffix={stat.suffix}
                  className="text-[var(--gold)] tabular-nums leading-none"
                />
              </div>

              <p className="text-[10px] sm:text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]/60 mt-3 relative z-10">
                {stat.label}
              </p>

              {/* Ghost watermark */}
              <span
                className="absolute bottom-1 right-3 select-none pointer-events-none"
                aria-hidden
                style={{ fontSize: "56px", color: "rgb(var(--gold-rgb) / 0.04)", lineHeight: 1 }}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
            </div>
          </RevealOnScroll>
        ))}
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 MANIFESTO — cinematic quote
 ══════════════════════════════════════════════════════════════════════════ */}
      <section
        data-revelar=""
        className="relative px-6 sm:px-10 lg:px-16 py-24 sm:py-40 overflow-hidden"
      >
        {/* Atmospheric glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: "800px",
            height: "500px",
            background: "radial-gradient(ellipse, rgb(var(--gold-rgb) / 0.05) 0%, transparent 55%)",
          }}
          aria-hidden
        />

        <RevealOnScroll variant="blur-up" duration={700}>
          <div className="max-w-4xl mx-auto text-center relative">
            {/* Giant quotation mark */}
            <div className="relative mb-6 select-none pointer-events-none" aria-hidden>
              <span
                className="absolute left-1/2 -translate-x-1/2 -top-8 leading-none text-[var(--gold)]/8 select-none"
                style={{ fontSize: "clamp(8rem, 20vw, 16rem)" }}
              >
                &ldquo;
              </span>
            </div>

            <blockquote className="relative z-10">
              <p
                className="font-normal text-[var(--foreground)] leading-[1.35] max-w-3xl mx-auto"
                style={{ fontSize: "clamp(1.5rem, 4vw, 2.8rem)" }}
              >
                {tr(
                  "O Lusitano não é apenas uma raça — é uma civilização inteira a galope.",
                  "The Lusitano is not just a breed — it is an entire civilisation at full gallop.",
                  "El Lusitano no es solo una raza — es toda una civilización al galope."
                )}
              </p>
            </blockquote>

            <div className="mt-10 flex items-center justify-center gap-4">
              <div
                className="w-10 h-px"
                style={{
                  background: "linear-gradient(to right, transparent, rgb(var(--gold-rgb) / 0.4))",
                }}
              />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]/50">
                Portal Lusitano
              </span>
              <div
                className="w-10 h-px"
                style={{
                  background: "linear-gradient(to left, transparent, rgb(var(--gold-rgb) / 0.4))",
                }}
              />
            </div>
          </div>
        </RevealOnScroll>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 ORIGIN STORY — editorial timeline
 ══════════════════════════════════════════════════════════════════════════ */}
      <section
        data-revelar=""
        className="px-6 sm:px-10 lg:px-16 py-16 sm:py-28"
        style={{ borderTop: "1px solid rgb(var(--gold-rgb) / 0.06)" }}
      >
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll variant="fade-up">
            <div className="grid lg:grid-cols-[1.1fr_0.9fr] gap-16 lg:gap-24 items-start">
              {/* Left — story */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div
                    className="w-6 h-px"
                    style={{ background: "rgb(var(--gold-rgb) / 0.55)" }}
                    aria-hidden
                  />
                  <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]/60">
                    {tr("A Origem", "The Origin", "El Origen")}
                  </span>
                </div>

                <h2
                  className="text-[var(--foreground)] leading-[0.92] mb-10"
                  style={{ fontSize: "clamp(2rem, 4vw, 3.2rem)" }}
                >
                  {tr("Fundado em 2023", "Founded in 2023", "Fundado en 2023")}
                </h2>

                {/* Timeline */}
                <div className="space-y-8">
                  {[
                    tr(
                      "O Portal Lusitano foi fundado com uma visão clara: criar a plataforma de referência para o cavalo Lusitano no mundo digital.",
                      "Portal Lusitano was founded with a clear vision: to create the reference platform for the Lusitano horse in the digital world.",
                      "Portal Lusitano fue fundado con una visión clara: crear la plataforma de referencia para el caballo Lusitano en el mundo digital."
                    ),
                    tr(
                      "Combinando engenharia digital com profundo conhecimento equestre, construímos ferramentas que ajudam cavaleiros, criadores e entusiastas a tomar decisões informadas.",
                      "Combining digital engineering with deep equestrian knowledge, we build tools that help riders, breeders and enthusiasts make informed decisions.",
                      "Combinando ingeniería digital con profundo conocimiento ecuestre, construimos herramientas que ayudan a jinetes, criadores y entusiastas a tomar decisiones informadas."
                    ),
                    tr(
                      "Cada peça de conteúdo é verificada em fontes credíveis. Cada ferramenta é optimizada para as especificidades da raça Lusitana.",
                      "Every piece of content is verified from credible sources. Every tool is optimised for the specificities of the Lusitano breed.",
                      "Cada pieza de contenido es verificada en fuentes creíbles. Cada herramienta está optimizada para las especificidades de la raza Lusitana."
                    ),
                  ].map((text, i) => (
                    <div key={i} className="flex gap-5">
                      <div className="flex flex-col items-center flex-shrink-0 pt-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background: "rgb(var(--gold-rgb) / 0.5)",
                            boxShadow: "0 0 12px rgb(var(--gold-rgb) / 0.2)",
                          }}
                        />
                        {i < 2 && (
                          <div
                            className="w-px flex-1 mt-2"
                            style={{
                              background:
                                "linear-gradient(to bottom, rgb(var(--gold-rgb) / 0.2), transparent)",
                            }}
                          />
                        )}
                      </div>
                      <p className="text-[var(--foreground-secondary)] leading-[1.8] text-sm sm:text-base">
                        {text}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Right — commitments card */}
              <RevealOnScroll variant="fade-up" delay={200}>
                <div
                  className="p-8 sm:p-10 relative"
                  style={{
                    border: "1px solid rgb(var(--gold-rgb) / 0.1)",
                    background: "rgb(var(--gold-rgb) / 0.015)",
                  }}
                >
                  {/* Corner ornaments */}
                  <div
                    className="absolute top-3 left-3 w-6 h-6 border-t border-l border-[var(--gold)]/20 pointer-events-none"
                    aria-hidden
                  />
                  <div
                    className="absolute bottom-3 right-3 w-6 h-6 border-b border-r border-[var(--gold)]/20 pointer-events-none"
                    aria-hidden
                  />

                  <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]/70 mb-8">
                    {tr("Os Nossos Compromissos", "Our Commitments", "Nuestros Compromisos")}
                  </p>
                  <ul className="space-y-4">
                    {principles.map((p) => (
                      <li key={p} className="flex items-center gap-4 group/item">
                        <div
                          className="w-6 h-6 flex items-center justify-center flex-shrink-0 group-hover/item:bg-[var(--gold)]/15 transition-colors duration-300"
                          style={{ border: "1px solid rgb(var(--gold-rgb) / 0.2)" }}
                        >
                          <Check size={11} className="text-[var(--gold)]" />
                        </div>
                        <span className="text-sm text-[var(--foreground-secondary)] group-hover/item:text-[var(--foreground)] transition-colors duration-300">
                          {p}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </RevealOnScroll>
            </div>
          </RevealOnScroll>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 FULL-BLEED IMAGE BREAK — cinematic interlude
 ══════════════════════════════════════════════════════════════════════════ */}
      <section data-revelar="" className="relative h-[50vh] sm:h-[60vh] overflow-hidden">
        <Image
          src="/images/sobre/break/break.png"
          alt=""
          fill
          sizes="100vw"
          className="object-cover object-[center_35%]"
          loading="lazy"
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.7) 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: "radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.5) 100%)",
          }}
          aria-hidden
        />

        {/* Centered editorial text */}
        <RevealOnScroll
          variant="blur-up"
          duration={700}
          className="absolute inset-0 flex items-center justify-center z-10"
        >
          <div className="text-center px-6">
            <p
              className="font-normal text-white/80 leading-[1.3] max-w-xl mx-auto"
              style={{ fontSize: "clamp(1.3rem, 3.5vw, 2.2rem)" }}
            >
              {tr(
                "Tecnologia ao serviço da tradição equestre portuguesa.",
                "Technology in service of Portuguese equestrian tradition.",
                "Tecnología al servicio de la tradición ecuestre portuguesa."
              )}
            </p>
            <div className="flex items-center justify-center gap-3 mt-6">
              <div className="w-8 h-px" style={{ background: "rgb(var(--gold-rgb) / 0.5)" }} />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]/60">
                Est. MMXXIII
              </span>
              <div className="w-8 h-px" style={{ background: "rgb(var(--gold-rgb) / 0.5)" }} />
            </div>
          </div>
        </RevealOnScroll>

        {/* Gold horizontal lines */}
        <div
          className="absolute top-0 inset-x-0 h-px"
          style={{ background: "rgb(var(--gold-rgb) / 0.1)" }}
          aria-hidden
        />
        <div
          className="absolute bottom-0 inset-x-0 h-px"
          style={{ background: "rgb(var(--gold-rgb) / 0.1)" }}
          aria-hidden
        />
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 VALUES — editorial grid
 ══════════════════════════════════════════════════════════════════════════ */}
      <section
        data-revelar=""
        className="px-6 sm:px-10 lg:px-16 py-16 sm:py-28"
        style={{ borderTop: "1px solid rgb(var(--gold-rgb) / 0.06)" }}
      >
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll variant="fade-up" className="text-center mb-12 sm:mb-20">
            <div className="flex items-center justify-center gap-4 mb-5">
              <div
                className="w-8 h-px"
                style={{
                  background: "linear-gradient(to right, transparent, rgb(var(--gold-rgb) / 0.5))",
                }}
                aria-hidden
              />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]/60">
                {tr("Valores", "Values", "Valores")}
              </span>
              <div
                className="w-8 h-px"
                style={{
                  background: "linear-gradient(to left, transparent, rgb(var(--gold-rgb) / 0.5))",
                }}
                aria-hidden
              />
            </div>
            <h2 className="text-[var(--foreground)]" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
              {tr("O Que Nos Define", "What Defines Us", "Lo Que Nos Define")}
            </h2>
          </RevealOnScroll>

          <div
            className="grid sm:grid-cols-2 gap-px"
            style={{ background: "rgb(var(--gold-rgb) / 0.06)" }}
          >
            {values.map((value, i) => (
              <RevealOnScroll key={value.title} delay={i * 100} variant="fade-up">
                <div
                  className="group relative overflow-hidden p-8 sm:p-10 lg:p-12 transition-colors duration-500"
                  style={{ background: "var(--background)" }}
                >
                  {/* Hover fill */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: "rgb(var(--gold-rgb) / 0.02)" }}
                  />

                  {/* Gold sweep on hover */}
                  <div
                    className="absolute top-0 left-0 h-[1px] w-0 group-hover:w-full transition-[width] duration-700 bg-[var(--gold)]/40 pointer-events-none"
                    aria-hidden
                  />

                  {/* Ordinal */}
                  <span
                    className="text-[11px] font-mono uppercase tracking-wider text-[var(--gold)]/30 mb-6 block relative z-10"
                    aria-hidden
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>

                  {/* Icon */}
                  <div
                    className="w-12 h-12 flex items-center justify-center mb-6 relative z-10 group-hover:bg-[var(--gold)]/10 transition-colors duration-300"
                    style={{ border: "1px solid rgb(var(--gold-rgb) / 0.15)" }}
                  >
                    <value.icon size={20} className="text-[var(--gold)]" />
                  </div>

                  <h3
                    className="text-[var(--foreground)] mb-4 relative z-10"
                    style={{ fontSize: "clamp(1.2rem, 2.5vw, 1.6rem)" }}
                  >
                    {value.title}
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm leading-[1.8] relative z-10">
                    {value.desc}
                  </p>

                  {/* Ghost number */}
                  <span
                    className="absolute bottom-2 right-4 select-none pointer-events-none"
                    aria-hidden
                    style={{
                      fontSize: "72px",
                      color: "rgb(var(--gold-rgb) / 0.03)",
                      lineHeight: 1,
                    }}
                  >
                    {String(i + 1).padStart(2, "0")}
                  </span>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 WHAT WE OFFER — feature cards
 ══════════════════════════════════════════════════════════════════════════ */}
      <section
        data-revelar=""
        className="px-6 sm:px-10 lg:px-16 py-16 sm:py-28"
        style={{ borderTop: "1px solid rgb(var(--gold-rgb) / 0.06)" }}
      >
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll variant="fade-up" className="text-center mb-12 sm:mb-20">
            <div className="flex items-center justify-center gap-4 mb-5">
              <div
                className="w-8 h-px"
                style={{
                  background: "linear-gradient(to right, transparent, rgb(var(--gold-rgb) / 0.5))",
                }}
                aria-hidden
              />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]/60">
                {tr("Plataforma", "Platform", "Plataforma")}
              </span>
              <div
                className="w-8 h-px"
                style={{
                  background: "linear-gradient(to left, transparent, rgb(var(--gold-rgb) / 0.5))",
                }}
                aria-hidden
              />
            </div>
            <h2 className="text-[var(--foreground)]" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
              {tr("O Que Oferecemos", "What We Offer", "Lo Que Ofrecemos")}
            </h2>
          </RevealOnScroll>

          <div
            className="grid sm:grid-cols-2 lg:grid-cols-3 gap-px"
            style={{ background: "rgb(var(--gold-rgb) / 0.06)" }}
          >
            {features.map((feature, i) => (
              <RevealOnScroll key={feature.title} delay={i * 80} variant="fade-up">
                <LocalizedLink
                  href={feature.href}
                  className="group block relative overflow-hidden p-7 sm:p-9 transition-colors duration-500"
                  style={{ background: "var(--background)" }}
                >
                  {/* Hover fill */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: "rgb(var(--gold-rgb) / 0.02)" }}
                  />

                  {/* Gold sweep */}
                  <div
                    className="absolute top-0 left-0 h-[1px] w-0 group-hover:w-full transition-[width] duration-600 bg-[var(--gold)]/40 pointer-events-none"
                    aria-hidden
                  />

                  <div className="flex items-start justify-between mb-5 relative z-10">
                    <div
                      className="w-10 h-10 flex items-center justify-center group-hover:bg-[var(--gold)]/10 transition-colors duration-300"
                      style={{ border: "1px solid rgb(var(--gold-rgb) / 0.12)" }}
                    >
                      <feature.icon
                        size={17}
                        className="text-[var(--gold)]/70 group-hover:text-[var(--gold)] transition-colors duration-300"
                      />
                    </div>
                    <ArrowUpRight
                      size={15}
                      className="text-[var(--gold)]/0 group-hover:text-[var(--gold)]/60 transition-[opacity,transform,color] duration-300 opacity-0 group-hover:opacity-100 -translate-y-1 group-hover:translate-y-0 translate-x-1 group-hover:translate-x-0"
                    />
                  </div>
                  <h3
                    className="text-[var(--foreground)] mb-2 relative z-10 group-hover:text-[var(--gold)] transition-colors duration-300"
                    style={{ fontSize: "clamp(1rem, 2vw, 1.2rem)" }}
                  >
                    {feature.title}
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-sm leading-[1.7] relative z-10">
                    {feature.desc}
                  </p>
                </LocalizedLink>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 AUDIENCE — who is this for
 ══════════════════════════════════════════════════════════════════════════ */}
      <section
        data-revelar=""
        className="px-6 sm:px-10 lg:px-16 py-16 sm:py-28"
        style={{ borderTop: "1px solid rgb(var(--gold-rgb) / 0.06)" }}
      >
        <div className="max-w-6xl mx-auto">
          <RevealOnScroll variant="fade-up" className="text-center mb-12 sm:mb-20">
            <div className="flex items-center justify-center gap-4 mb-5">
              <div
                className="w-8 h-px"
                style={{
                  background: "linear-gradient(to right, transparent, rgb(var(--gold-rgb) / 0.5))",
                }}
                aria-hidden
              />
              <span className="text-[10px] font-mono uppercase tracking-wider text-[var(--gold)]/60">
                {tr("Audiência", "Audience", "Audiencia")}
              </span>
              <div
                className="w-8 h-px"
                style={{
                  background: "linear-gradient(to left, transparent, rgb(var(--gold-rgb) / 0.5))",
                }}
                aria-hidden
              />
            </div>
            <h2 className="text-[var(--foreground)]" style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}>
              {tr("Para Quem é o Portal?", "Who Is the Portal For?", "¿Para Quién es el Portal?")}
            </h2>
          </RevealOnScroll>

          <div
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-px"
            style={{ background: "rgb(var(--gold-rgb) / 0.06)" }}
          >
            {audience.map((a, i) => (
              <RevealOnScroll key={a.title} delay={i * 80} variant="fade-up">
                <div
                  className="group relative overflow-hidden flex flex-col items-center text-center p-6 sm:p-8 transition-colors duration-500"
                  style={{ background: "var(--background)" }}
                >
                  {/* Hover fill */}
                  <div
                    className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                    style={{ background: "rgb(var(--gold-rgb) / 0.025)" }}
                  />

                  {/* Gold sweep */}
                  <div
                    className="absolute top-0 left-0 h-[1px] w-0 group-hover:w-full transition-[width] duration-500 bg-[var(--gold)]/30 pointer-events-none"
                    aria-hidden
                  />

                  <div
                    className="w-14 h-14 flex items-center justify-center mb-5 relative z-10 group-hover:bg-[var(--gold)]/10 transition-colors duration-300"
                    style={{ border: "1px solid rgb(var(--gold-rgb) / 0.12)" }}
                  >
                    <a.icon
                      size={22}
                      className="text-[var(--gold)] group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="text-[var(--foreground)] mb-2 relative z-10 text-base sm:text-lg">
                    {a.title}
                  </h3>
                  <p className="text-[var(--foreground-muted)] text-xs sm:text-sm leading-relaxed relative z-10 group-hover:text-[var(--foreground-secondary)] transition-colors duration-300">
                    {a.desc}
                  </p>
                </div>
              </RevealOnScroll>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 CTA — join the community
 ══════════════════════════════════════════════════════════════════════════ */}
      <section
        data-revelar=""
        className="relative px-6 sm:px-10 lg:px-16 py-24 sm:py-40 overflow-hidden"
        style={{ borderTop: "1px solid rgb(var(--gold-rgb) / 0.06)" }}
      >
        {/* Atmospheric glow */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
          style={{
            width: "800px",
            height: "400px",
            background: "radial-gradient(ellipse, rgb(var(--gold-rgb) / 0.05) 0%, transparent 55%)",
          }}
          aria-hidden
        />

        <RevealOnScroll variant="blur-up" duration={700}>
          <div className="max-w-3xl mx-auto relative z-10 text-center">
            {/* Diamond separator */}
            <div className="flex items-center justify-center gap-4 mb-10" aria-hidden>
              <div
                className="w-14 h-px"
                style={{
                  background: "linear-gradient(to right, transparent, rgb(var(--gold-rgb) / 0.4))",
                }}
              />
              <Heart className="text-[var(--gold)]/30" size={18} />
              <div
                className="w-14 h-px"
                style={{
                  background: "linear-gradient(to left, transparent, rgb(var(--gold-rgb) / 0.4))",
                }}
              />
            </div>

            <h2
              className="text-[var(--foreground)] mb-5"
              style={{ fontSize: "clamp(2rem, 4vw, 3rem)" }}
            >
              {tr("Junta-te à Comunidade", "Join the Community", "Únete a la Comunidad")}
            </h2>
            <p className="text-[var(--foreground-secondary)] mb-12 max-w-lg mx-auto leading-[1.8] text-sm sm:text-base">
              {tr(
                "Faz parte da maior comunidade digital dedicada ao cavalo Lusitano. Regista-te gratuitamente.",
                "Be part of the largest digital community dedicated to the Lusitano horse. Register for free.",
                "Sé parte de la mayor comunidad digital dedicada al caballo Lusitano. Regístrate gratuitamente."
              )}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-5 mb-8">
              <LocalizedLink
                href="/registar"
                className="ripple-btn inline-flex items-center gap-3 bg-[var(--gold)] text-black px-10 py-4.5 rotulo font-bold hover:bg-white transition-[background-color] duration-300 shadow-[0_8px_32px_rgb(var(--gold-rgb) / 0.25)] group/cta"
              >
                <Users size={14} aria-hidden />
                {tr("Criar Conta Grátis", "Create Free Account", "Crear Cuenta Gratis")}
                <ArrowRight
                  size={11}
                  className="group-hover/cta:translate-x-1 transition-transform duration-300"
                  aria-hidden
                />
              </LocalizedLink>

              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="inline-flex items-center gap-2 text-[var(--foreground-secondary)] hover:text-[var(--gold)] text-[10px] uppercase tracking-wider transition-colors duration-300 group/mail"
              >
                <Mail size={12} />
                {tr("Contactar", "Contact", "Contactar")}
                <ArrowRight
                  size={10}
                  className="group-hover/mail:translate-x-0.5 transition-transform duration-300"
                />
              </a>
            </div>

            <p className="text-[10px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]/40">
              {tr(
                "Sem cartão de crédito. Sem compromisso.",
                "No credit card. No commitment.",
                "Sin tarjeta de crédito. Sin compromiso."
              )}
            </p>
          </div>
        </RevealOnScroll>
      </section>

      {/* ═══════════════════════════════════════════════════════════════════════
 FOOTER COLOPHON
 ══════════════════════════════════════════════════════════════════════════ */}
      <footer
        className="px-6 sm:px-10 lg:px-16 py-14 flex flex-col items-center text-center gap-5"
        style={{ borderTop: "1px solid rgb(var(--gold-rgb) / 0.06)" }}
      >
        <div className="flex items-center gap-4" aria-hidden>
          <div
            className="w-8 h-px"
            style={{
              background: "linear-gradient(to right, transparent, rgb(var(--gold-rgb) / 0.3))",
            }}
          />
          <span className="text-[var(--gold)]/30 text-[10px]">&#9670;</span>
          <div
            className="w-8 h-px"
            style={{
              background: "linear-gradient(to left, transparent, rgb(var(--gold-rgb) / 0.3))",
            }}
          />
        </div>
        <span className="text-[6px] font-mono uppercase tracking-wider text-[var(--foreground-muted)]/25">
          38.7° N · 9.1° W — Portal Lusitano · Est. MMXXIII · Portugal
        </span>
      </footer>
    </main>
  );
}
