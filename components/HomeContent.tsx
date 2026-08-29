"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LocalizedLink from "@/components/LocalizedLink";
import {
  ArrowRight,
  BellRing,
  ImageIcon,
  MessagesSquare,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { SellerListing } from "@/lib/marketplace-listings";

interface Props {
  destaques: SellerListing[];
  recentes: SellerListing[];
  totalAtivos: number;
}

/** Quick entries into the marketplace, as buyers actually describe what they want. */
const ATALHOS = [
  { label: "Dressage", href: "/comprar?disciplina=Dressage" },
  { label: "Trabalho", href: "/comprar?disciplina=Trabalho" },
  { label: "Lazer", href: "/comprar?disciplina=Lazer" },
  { label: "Poldros", href: "/comprar?idadeMax=3" },
  { label: "Até 10 000 €", href: "/comprar?precoMax=10000" },
  { label: "Éguas", href: "/comprar?sexo=femea" },
];

function formatarPreco(a: SellerListing): string {
  if (a.precoSobConsulta || a.preco === null) return "Sob consulta";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(a.preco);
}

function CartaoAnuncio({ a, grande = false }: { a: SellerListing; grande?: boolean }) {
  return (
    <LocalizedLink href={`/comprar/${a.id}`} className="group block bg-[var(--background)]">
      <div
        className={`relative overflow-hidden bg-[var(--background-secondary)] ${
          grande ? "aspect-[4/5]" : "aspect-[4/3]"
        }`}
      >
        {a.fotoPrincipal ? (
          <Image
            src={a.fotoPrincipal}
            alt={a.nome}
            fill
            sizes={grande ? "(max-width:768px) 100vw, 33vw" : "(max-width:768px) 50vw, 25vw"}
            className="object-cover transition-transform duration-700 group-hover:scale-[1.04]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} className="text-[var(--gold)]/20" />
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-90" />

        {a.destaque && (
          <span className="absolute top-3 left-3 bg-[var(--gold)] text-black px-2.5 py-1 text-[9px] uppercase tracking-[0.2em] font-medium">
            Destaque
          </span>
        )}
        {a.status === "reservado" && (
          <span className="absolute top-3 right-3 bg-amber-400/90 text-black px-2.5 py-1 text-[9px] uppercase tracking-[0.2em]">
            Reservado
          </span>
        )}

        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h3 className={`text-white font-serif leading-tight ${grande ? "text-xl" : "text-base"}`}>
            {a.nome}
          </h3>
          <p className="text-[var(--gold)] text-sm mt-1">{formatarPreco(a)}</p>
          <p className="text-white/50 text-[10px] uppercase tracking-[0.2em] mt-1.5">
            {[a.idade ? `${a.idade} anos` : null, a.sexo, a.localizacao]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
      </div>
    </LocalizedLink>
  );
}

export default function HomeContent({ destaques, recentes, totalAtivos }: Props) {
  const router = useRouter();
  const [termo, setTermo] = useState("");

  const pesquisar = (e: React.FormEvent) => {
    e.preventDefault();
    const q = termo.trim();
    router.push(q ? `/comprar?search=${encodeURIComponent(q)}` : "/comprar");
  };

  return (
    <main className="bg-[var(--background)]">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section className="relative min-h-[88svh] flex flex-col items-center justify-center text-center px-5 overflow-hidden">
        <div className="absolute inset-0 z-0" aria-hidden="true">
          <Image
            src="/images/home/desktop/hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
            style={{ objectPosition: "center 25%", opacity: 0.5 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-[var(--background)]/70 via-transparent to-[var(--background)]" />
        </div>

        <div className="relative z-10 max-w-3xl w-full">
          <p className="text-[var(--gold)] text-[10px] uppercase tracking-[0.5em] mb-6">
            Puro-Sangue Lusitano
          </p>

          <h1 className="font-serif text-4xl sm:text-6xl leading-[1.05] text-[var(--foreground)]">
            O mercado do
            <br />
            <span className="text-[var(--gold)]">cavalo Lusitano.</span>
          </h1>

          <p className="text-[var(--foreground-secondary)] text-base sm:text-lg mt-6 max-w-xl mx-auto">
            Compre e venda directamente entre criadores e cavaleiros. Sem intermediários.
          </p>

          {/* A pesquisa é o CTA principal: quem chega aqui está a procurar um cavalo,
              não a ler sobre a marca. */}
          <form onSubmit={pesquisar} className="mt-10 flex max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              />
              <input
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Linhagem, nome, região…"
                aria-label="Procurar cavalos"
                className="w-full bg-[var(--background)]/85 backdrop-blur border border-[var(--border)] pl-11 pr-4 py-4 text-sm text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] focus:border-[var(--gold)]/60 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="bg-[var(--gold)] text-black px-6 sm:px-8 text-[11px] uppercase tracking-[0.2em] font-medium hover:bg-[var(--gold-hover)] transition-colors"
            >
              Procurar
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {ATALHOS.map((a) => (
              <LocalizedLink
                key={a.label}
                href={a.href}
                className="px-3.5 py-1.5 border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--foreground-secondary)] hover:border-[var(--gold)]/50 hover:text-[var(--gold)] transition-colors bg-[var(--background)]/50 backdrop-blur"
              >
                {a.label}
              </LocalizedLink>
            ))}
          </div>

          {totalAtivos > 0 && (
            <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--foreground-muted)] mt-8">
              {totalAtivos} {totalAtivos === 1 ? "cavalo à venda" : "cavalos à venda"}
            </p>
          )}
        </div>
      </section>

      {/* ── DESTAQUES ────────────────────────────────────────────────────── */}
      {destaques.length > 0 && (
        <section className="px-5 sm:px-8 py-20 border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-[var(--gold)] text-[10px] uppercase tracking-[0.4em]">
                  Em destaque
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl text-[var(--foreground)] mt-2">
                  Exemplares seleccionados
                </h2>
              </div>
              <LocalizedLink
                href="/comprar"
                className="hidden sm:inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors shrink-0"
              >
                Ver todos <ArrowRight size={12} />
              </LocalizedLink>
            </div>

            <div className="grid sm:grid-cols-3 bg-[var(--gold)]/8 gap-px">
              {destaques.map((a) => (
                <CartaoAnuncio key={a.id} a={a} grande />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RECENTES ─────────────────────────────────────────────────────── */}
      {recentes.length > 0 && (
        <section className="px-5 sm:px-8 py-20 border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-8">
              <div>
                <p className="text-[var(--gold)] text-[10px] uppercase tracking-[0.4em]">
                  Últimos anúncios
                </p>
                <h2 className="font-serif text-2xl sm:text-3xl text-[var(--foreground)] mt-2">
                  Acabados de publicar
                </h2>
              </div>
              <LocalizedLink
                href="/comprar"
                className="hidden sm:inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] hover:text-[var(--gold)] transition-colors shrink-0"
              >
                Ver todos <ArrowRight size={12} />
              </LocalizedLink>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 bg-[var(--gold)]/8 gap-px">
              {recentes.map((a) => (
                <CartaoAnuncio key={a.id} a={a} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <LocalizedLink
                href="/comprar"
                className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--gold)]/40 text-[10px] uppercase tracking-[0.3em] text-[var(--gold)]"
              >
                Ver todos os cavalos
              </LocalizedLink>
            </div>
          </div>
        </section>
      )}

      {/* ── CATÁLOGO VAZIO ───────────────────────────────────────────────── */}
      {recentes.length === 0 && (
        <section className="px-5 sm:px-8 py-24 border-t border-[var(--border)]">
          <div className="max-w-lg mx-auto text-center">
            <Sparkles size={22} className="mx-auto text-[var(--gold)]/30 mb-5" />
            <h2 className="font-serif text-2xl text-[var(--foreground)]">
              Ainda não há cavalos publicados
            </h2>
            <p className="text-sm text-[var(--foreground-muted)] mt-3">
              Seja o primeiro a anunciar. O seu cavalo fica visível para todo o país.
            </p>
            <LocalizedLink
              href="/vender-cavalo"
              className="inline-flex items-center gap-2 mt-8 bg-[var(--gold)] text-black px-7 py-3.5 text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-[var(--gold-hover)] transition-colors"
            >
              <Plus size={14} />
              Publicar anúncio
            </LocalizedLink>
          </div>
        </section>
      )}

      {/* ── CONFIANÇA ────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-20 border-t border-[var(--border)] bg-[var(--background-secondary)]/30">
        <div className="max-w-5xl mx-auto">
          <h2 className="font-serif text-2xl sm:text-3xl text-[var(--foreground)] text-center">
            Um negócio de milhares de euros
            <br className="hidden sm:block" /> merece mais do que um classificado.
          </h2>

          <div className="grid sm:grid-cols-3 gap-10 mt-14">
            {[
              {
                icon: MessagesSquare,
                titulo: "Mensagens no portal",
                texto:
                  "Fale com o vendedor sem publicar o seu número. O contacto só é partilhado se quiser.",
              },
              {
                icon: ShieldCheck,
                titulo: "Anúncios moderados",
                texto:
                  "Cada anúncio é aprovado antes de ficar visível, e qualquer pessoa pode denunciar o que estiver errado.",
              },
              {
                icon: BellRing,
                titulo: "Alertas de pesquisa",
                texto:
                  "O cavalo certo raramente está à venda hoje. Guarde a pesquisa e avisamos quando aparecer.",
              },
            ].map((c) => (
              <div key={c.titulo} className="text-center sm:text-left">
                <c.icon size={20} className="text-[var(--gold)] mx-auto sm:mx-0" />
                <h3 className="text-sm uppercase tracking-[0.2em] text-[var(--foreground)] mt-4">
                  {c.titulo}
                </h3>
                <p className="text-sm text-[var(--foreground-muted)] mt-3 leading-relaxed">
                  {c.texto}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── VENDER ───────────────────────────────────────────────────────── */}
      <section className="px-5 sm:px-8 py-24 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="text-[var(--gold)] text-[10px] uppercase tracking-[0.4em]">
            Tem um cavalo para vender?
          </p>
          <h2 className="font-serif text-3xl sm:text-4xl text-[var(--foreground)] mt-4 leading-tight">
            Chegue a quem procura
            <br /> um Lusitano a sério.
          </h2>
          <p className="text-sm text-[var(--foreground-muted)] mt-5 max-w-md mx-auto">
            Publique com fotografias, pedigree e histórico. Gere o anúncio a partir da sua conta e
            responda às mensagens num só sítio.
          </p>
          <LocalizedLink
            href="/vender-cavalo"
            className="inline-flex items-center gap-2 mt-9 bg-[var(--gold)] text-black px-8 py-4 text-[11px] uppercase tracking-[0.25em] font-medium hover:bg-[var(--gold-hover)] transition-colors"
          >
            <Plus size={14} />
            Publicar anúncio
          </LocalizedLink>
        </div>
      </section>
    </main>
  );
}
