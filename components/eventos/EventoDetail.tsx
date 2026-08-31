"use client";

import { useState } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import Image from "next/image";
import Breadcrumb from "@/components/Breadcrumb";
import {
  Calendar,
  MapPin,
  Clock,
  Euro,
  ExternalLink,
  Share2,
  Download,
  Tag,
  Users,
  CheckCircle,
  RefreshCw,
  AlertCircle,
  Star,
  Eye,
  Facebook,
  Twitter,
  Linkedin,
  Copy,
  Check,
} from "lucide-react";

export interface Evento {
  id: string;
  titulo: string;
  slug: string;
  descricao: string;
  descricao_completa?: string;
  tipo: string;
  data_inicio: string;
  data_fim?: string;
  hora_inicio?: string;
  hora_fim?: string;
  localizacao: string;
  regiao?: string;
  organizador?: string;
  website?: string;
  preco_entrada?: string;
  imagem_capa?: string;
  tags?: string[];
  destaque: boolean;
  confirmado?: "confirmado" | "anual" | "provisorio";
  views_count?: number;
}

export interface EventoRelacionado {
  id: string;
  titulo: string;
  slug: string;
  tipo: string;
  data_inicio: string;
  localizacao: string;
  imagem_capa?: string;
}

const tiposEvento: Record<string, { label: string; icon: string; color: string }> = {
  feira: {
    label: "Feira",
    icon: "\u{1F3A0}",
    color: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  },
  competicao: {
    label: "Competi\u00e7\u00e3o",
    icon: "\u{1F3C6}",
    color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  leilao: {
    label: "Leil\u00e3o",
    icon: "\u{1F528}",
    color: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  exposicao: {
    label: "Exposi\u00e7\u00e3o",
    icon: "\u{1F3A8}",
    color: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  workshop: {
    label: "Workshop",
    icon: "\u{1F4DA}",
    color: "bg-pink-500/20 text-pink-400 border-pink-500/30",
  },
};

interface EventoDetailProps {
  evento: Evento;
  relacionados: EventoRelacionado[];
}

export default function EventoDetail({ evento, relacionados }: EventoDetailProps) {
  const [copied, setCopied] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  function formatDateRange(start: string, end?: string) {
    const startDate = new Date(start);
    if (!end || start === end) {
      return startDate.toLocaleDateString("pt-PT", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }
    const endDate = new Date(end);
    if (startDate.getMonth() === endDate.getMonth()) {
      return `${startDate.getDate()} a ${endDate.toLocaleDateString("pt-PT", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })}`;
    }
    return `${startDate.toLocaleDateString("pt-PT", { day: "numeric", month: "short" })} - ${endDate.toLocaleDateString("pt-PT", { day: "numeric", month: "long", year: "numeric" })}`;
  }

  function generateICS() {
    const startDate = new Date(evento.data_inicio);
    const endDate = evento.data_fim ? new Date(evento.data_fim) : startDate;

    const formatICSDate = (date: Date) => {
      return date.toISOString().replace(/[-:]/g, "").split("T")[0];
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Portal Lusitano//Eventos//PT
BEGIN:VEVENT
DTSTART;VALUE=DATE:${formatICSDate(startDate)}
DTEND;VALUE=DATE:${formatICSDate(new Date(endDate.getTime() + 86400000))}
SUMMARY:${evento.titulo}
DESCRIPTION:${evento.descricao.replace(/\n/g, "\\n")}
LOCATION:${evento.localizacao}
URL:${evento.website || window.location.href}
STATUS:${evento.confirmado === "provisorio" ? "TENTATIVE" : "CONFIRMED"}
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${evento.slug}.ics`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  function copyLink() {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function shareOnSocial(platform: string) {
    const url = encodeURIComponent(window.location.href);
    const title = encodeURIComponent(evento.titulo);

    const urls: Record<string, string> = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      twitter: `https://twitter.com/intent/tweet?url=${url}&text=${title}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    window.open(urls[platform], "_blank", "width=600,height=400");
    setShowShareMenu(false);
  }

  function getConfirmacaoBadge(confirmado?: string) {
    switch (confirmado) {
      case "confirmado":
        return {
          icon: CheckCircle,
          label: "Confirmado",
          color: "text-green-400",
          bg: "bg-green-500/10 border-green-500/30",
        };
      case "anual":
        return {
          icon: RefreshCw,
          label: "Evento Anual",
          color: "text-blue-400",
          bg: "bg-blue-500/10 border-blue-500/30",
        };
      case "provisorio":
        return {
          icon: AlertCircle,
          label: "Data Provis\u00f3ria",
          color: "text-amber-400",
          bg: "bg-amber-500/10 border-amber-500/30",
        };
      default:
        return null;
    }
  }

  const tipoInfo = tiposEvento[evento.tipo] || {
    label: evento.tipo,
    icon: "\u{1F4C5}",
    color: "bg-zinc-500/20 text-[var(--foreground-secondary)]",
  };
  const confirmacaoBadge = getConfirmacaoBadge(evento.confirmado);

  return (
    <main className="min-h-screen bg-[var(--background)]">
      {/* Hero com imagem ou gradiente */}
      <section className="relative pt-24 pb-12">
        {evento.imagem_capa ? (
          <div className="absolute inset-0 h-96">
            <Image
              src={evento.imagem_capa}
              alt={evento.titulo}
              fill
              sizes="100vw"
              className="object-cover"
              priority
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/80 to-[var(--background)]" />
          </div>
        ) : (
          <div className="absolute inset-0 h-96 bg-gradient-to-b from-[var(--elevate-1)] to-transparent" />
        )}

        <div className="relative max-w-4xl mx-auto px-6 pt-16">
          {/* Breadcrumb */}
          <div className="opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]">
            <Breadcrumb
              items={[
                { label: "Home", href: "/" },
                { label: "Eventos", href: "/eventos" },
                { label: evento.titulo },
              ]}
            />
          </div>

          {/* Badges */}
          <div
            className="flex flex-wrap items-center gap-3 mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: "0.1s" }}
          >
            <span
              className={`px-3 py-1.5 text-sm border ${tipoInfo.color} flex items-center gap-2`}
            >
              <span>{tipoInfo.icon}</span>
              {tipoInfo.label}
            </span>

            {evento.destaque && (
              <span className="flex items-center gap-1.5 text-[var(--foreground-secondary)] bg-[var(--elevate-1)] border border-[var(--border-soft)] px-3 py-1.5 text-sm">
                <Star size={14} /> Destaque
              </span>
            )}

            {confirmacaoBadge && (
              <span
                className={`flex items-center gap-1.5 ${confirmacaoBadge.color} ${confirmacaoBadge.bg} border px-3 py-1.5 text-sm`}
              >
                <confirmacaoBadge.icon size={14} />
                {confirmacaoBadge.label}
              </span>
            )}

            {evento.views_count && evento.views_count > 0 && (
              <span className="flex items-center gap-1.5 text-[var(--foreground-muted)] text-sm">
                <Eye size={14} />
                {evento.views_count} visualiza\u00e7\u00f5es
              </span>
            )}
          </div>

          {/* Titulo */}
          <h1
            className="text-3xl md:text-5xl text-[var(--foreground)] mb-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: "0.2s" }}
          >
            {evento.titulo}
          </h1>

          {/* Info Principal */}
          <div
            className="grid md:grid-cols-2 gap-4 mb-8 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: "0.3s" }}
          >
            <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
              <div className="w-10 h-10 bg-[var(--elevate-1)] border border-[var(--border-soft)] flex items-center justify-center">
                <Calendar size={20} className="text-[var(--foreground-muted)]" />
              </div>
              <div>
                <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                  Data
                </span>
                <p className="capitalize">{formatDateRange(evento.data_inicio, evento.data_fim)}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
              <div className="w-10 h-10 bg-[var(--elevate-1)] border border-[var(--border-soft)] flex items-center justify-center">
                <MapPin size={20} className="text-[var(--foreground-muted)]" />
              </div>
              <div>
                <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                  Local
                </span>
                <p>{evento.localizacao}</p>
              </div>
            </div>

            {evento.hora_inicio && (
              <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
                <div className="w-10 h-10 bg-[var(--elevate-1)] border border-[var(--border-soft)] flex items-center justify-center">
                  <Clock size={20} className="text-[var(--foreground-muted)]" />
                </div>
                <div>
                  <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                    Hor\u00e1rio
                  </span>
                  <p>
                    {evento.hora_inicio}
                    {evento.hora_fim && ` - ${evento.hora_fim}`}
                  </p>
                </div>
              </div>
            )}

            {evento.preco_entrada && (
              <div className="flex items-center gap-3 text-[var(--foreground-secondary)]">
                <div className="w-10 h-10 bg-[var(--elevate-1)] border border-[var(--border-soft)] flex items-center justify-center">
                  <Euro size={20} className="text-[var(--foreground-muted)]" />
                </div>
                <div>
                  <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                    Entrada
                  </span>
                  <p>{evento.preco_entrada}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Conteudo Principal */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-8">
          {/* Descricao */}
          <div
            className="md:col-span-2 space-y-6 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: "0.4s" }}
          >
            <div className="bg-[var(--background-secondary)]/50 border border-[var(--border)] p-6">
              <h2 className="text-xl text-[var(--foreground)] mb-4">Sobre o Evento</h2>
              <div className="prose prose-invert prose-zinc max-w-none">
                <p className="text-[var(--foreground-secondary)] whitespace-pre-line leading-relaxed">
                  {evento.descricao_completa || evento.descricao}
                </p>
              </div>
            </div>

            {/* Tags */}
            {evento.tags && evento.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {evento.tags.map((tag) => (
                  <span
                    key={tag}
                    className="flex items-center gap-1.5 text-sm bg-[var(--background-card)]/50 text-[var(--foreground-secondary)] px-3 py-1.5 border border-[var(--border)]"
                  >
                    <Tag size={12} />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Organizador */}
            {evento.organizador && (
              <div className="bg-[var(--background-secondary)]/50 border border-[var(--border)] p-6">
                <h3 className="text-lg text-[var(--foreground)] mb-2 flex items-center gap-2">
                  <Users size={18} className="text-[var(--foreground-muted)]" />
                  Organizador
                </h3>
                <p className="text-[var(--foreground-secondary)]">{evento.organizador}</p>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside
            className="space-y-4 opacity-0 animate-[fadeSlideIn_0.5s_ease-out_forwards]"
            style={{ animationDelay: "0.5s" }}
          >
            {/* Acoes */}
            <div className="bg-[var(--background-secondary)]/50 border border-[var(--border)] p-4 space-y-3">
              {/* Adicionar ao Calend\u00e1rio */}
              <button
                onClick={generateICS}
                className="w-full flex items-center justify-center gap-2 btn btn-primario w-full rounded-full"
              >
                <Download size={18} />
                Adicionar ao Calend\u00e1rio
              </button>

              {/* Website */}
              {evento.website && (
                <a
                  href={evento.website}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center justify-center gap-2 bg-[var(--background-card)] text-[var(--foreground)] py-3 font-medium hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
                >
                  <ExternalLink size={18} />
                  Site Oficial
                </a>
              )}

              {/* Partilhar */}
              <div className="relative">
                <button
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="w-full flex items-center justify-center gap-2 bg-[var(--background-card)] text-[var(--foreground)] py-3 font-medium hover:bg-[var(--surface-hover)] transition-colors border border-[var(--border)]"
                >
                  <Share2 size={18} />
                  Partilhar
                </button>

                {showShareMenu && (
                  <div className="absolute top-full left-0 right-0 mt-2 bg-[var(--background-card)] border border-[var(--border)] p-2 z-10">
                    <button
                      onClick={() => shareOnSocial("facebook")}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors text-sm"
                    >
                      <Facebook size={16} className="text-blue-500" />
                      Facebook
                    </button>
                    <button
                      onClick={() => shareOnSocial("twitter")}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors text-sm"
                    >
                      <Twitter size={16} className="text-sky-400" />
                      Twitter
                    </button>
                    <button
                      onClick={() => shareOnSocial("linkedin")}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors text-sm"
                    >
                      <Linkedin size={16} className="text-blue-600" />
                      LinkedIn
                    </button>
                    <button
                      onClick={copyLink}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-[var(--surface-hover)] transition-colors text-sm"
                    >
                      {copied ? (
                        <>
                          <Check size={16} className="text-green-400" />
                          Copiado!
                        </>
                      ) : (
                        <>
                          <Copy size={16} />
                          Copiar Link
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Regiao */}
            {evento.regiao && (
              <div className="bg-[var(--background-secondary)]/50 border border-[var(--border)] p-4">
                <span className="text-xs text-[var(--foreground-muted)] uppercase tracking-wider">
                  Regi\u00e3o
                </span>
                <p className="text-[var(--foreground)] font-medium mt-1">{evento.regiao}</p>
              </div>
            )}
          </aside>
        </div>

        {/* Eventos Relacionados */}
        {relacionados.length > 0 && (
          <section
            className="mt-16 opacity-0 animate-[fadeSlideIn_0.3s_ease-out_forwards]"
            style={{ animationDelay: "0.3s" }}
          >
            <h2 className="text-2xl text-[var(--foreground)] mb-6">Eventos Relacionados</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {relacionados.map((rel) => {
                const relTipo = tiposEvento[rel.tipo] || {
                  icon: "\u{1F4C5}",
                  color: "bg-zinc-500/20 text-[var(--foreground-secondary)]",
                };
                return (
                  <LocalizedLink
                    key={rel.id}
                    href={`/eventos/${rel.slug}`}
                    className="group bg-[var(--background-secondary)]/50 border border-[var(--border)] hover:border-[var(--border-hover)] transition-all overflow-hidden"
                  >
                    {rel.imagem_capa ? (
                      <div className="relative h-32">
                        <Image
                          src={rel.imagem_capa}
                          alt={rel.titulo}
                          fill
                          sizes="(max-width: 768px) 100vw, 33vw"
                          className="object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-[var(--background-secondary)] to-transparent" />
                      </div>
                    ) : (
                      <div className="h-32 bg-[var(--elevate-1)] flex items-center justify-center">
                        <span className="text-4xl">{relTipo.icon}</span>
                      </div>
                    )}
                    <div className="p-4">
                      <span className={`inline-block px-2 py-0.5 text-xs ${relTipo.color} mb-2`}>
                        {rel.tipo}
                      </span>
                      <h3 className="text-[var(--foreground)] group-hover:text-[var(--foreground-strong)] transition-colors mb-2 line-clamp-2">
                        {rel.titulo}
                      </h3>
                      <p className="text-[var(--foreground-muted)] text-sm flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(rel.data_inicio).toLocaleDateString("pt-PT", {
                          day: "numeric",
                          month: "short",
                        })}
                      </p>
                    </div>
                  </LocalizedLink>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
