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

/**
 * Cartão de anúncio na homepage.
 *
 * Segue a mesma anatomia do `HorseCard` da grelha — fotografia em cima,
 * preço primeiro, metadados por baixo — para a homepage e o /comprar se
 * lerem como o mesmo site. Continua separado porque só aqui há "sob
 * consulta" e "reservado", que vêm do `SellerListing`.
 */
function CartaoAnuncio({ a, grande = false }: { a: SellerListing; grande?: boolean }) {
  return (
    <LocalizedLink
      href={`/comprar/${a.id}`}
      className="cartao cartao-interactivo group block overflow-hidden"
    >
      <div
        className={`relative overflow-hidden bg-[var(--background-secondary)] ${
          grande ? "aspect-[4/3]" : "aspect-[4/3]"
        }`}
      >
        {a.fotoPrincipal ? (
          <Image
            src={a.fotoPrincipal}
            alt={a.nome}
            fill
            sizes={grande ? "(max-width:768px) 50vw, 33vw" : "(max-width:768px) 50vw, 25vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon size={20} className="text-[var(--gold)]/20" />
          </div>
        )}

        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
          {a.destaque && <span className="selo selo-destaque">Destaque</span>}
          {a.status === "reservado" && (
            <span className="selo" style={{ background: "#fbbf24", color: "#000" }}>
              Reservado
            </span>
          )}
        </div>
      </div>

      <div className="p-2.5 space-y-1">
        <p className={`preco ${grande ? "text-lg" : "text-base"}`}>{formatarPreco(a)}</p>
        <h3 className="text-sm font-medium text-[var(--foreground)] line-clamp-1 group-hover:text-[var(--gold)] transition-colors">
          {a.nome}
        </h3>
        <p className="meta line-clamp-1">
          {[a.idade ? `${a.idade} anos` : null, a.sexo, a.localizacao].filter(Boolean).join(" · ")}
        </p>
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
      <section className="relative min-h-[62svh] sm:min-h-[58svh] flex flex-col items-center justify-center text-center px-5 py-16 overflow-hidden">
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
          <p className="rotulo-forte mb-4">Puro-Sangue Lusitano</p>

          <h1 className="font-serif text-3xl sm:text-5xl leading-[1.08] text-[var(--foreground)]">
            O mercado do
            <br />
            <span className="text-[var(--gold)]">cavalo Lusitano.</span>
          </h1>

          <p className="text-[var(--foreground-secondary)] text-sm sm:text-base mt-4 max-w-xl mx-auto">
            Compre e venda directamente entre criadores e cavaleiros. Sem intermediários.
          </p>

          {/* A pesquisa é o CTA principal: quem chega aqui está a procurar um cavalo,
              não a ler sobre a marca. */}
          <form onSubmit={pesquisar} className="mt-7 flex max-w-xl mx-auto gap-2">
            <div className="relative flex-1">
              <Search
                size={16}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
              />
              <input
                type="search"
                value={termo}
                onChange={(e) => setTermo(e.target.value)}
                placeholder="Linhagem, nome, região…"
                aria-label="Procurar cavalos"
                className="campo pl-10 bg-[var(--background)]/85 backdrop-blur"
              />
            </div>
            <button type="submit" className="btn btn-primario px-6">
              Procurar
            </button>
          </form>

          <div className="flex flex-wrap justify-center gap-2 mt-5">
            {ATALHOS.map((a) => (
              <LocalizedLink key={a.label} href={a.href} className="chip backdrop-blur">
                {a.label}
              </LocalizedLink>
            ))}
          </div>

          {totalAtivos > 0 && (
            <p className="meta mt-6">
              {totalAtivos} {totalAtivos === 1 ? "cavalo à venda" : "cavalos à venda"}
            </p>
          )}
        </div>
      </section>

      {/* ── DESTAQUES ────────────────────────────────────────────────────── */}
      {destaques.length > 0 && (
        <section className="px-5 sm:px-8 py-12 border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <p className="rotulo-forte">Em destaque</p>
                <h2 className="font-serif text-xl sm:text-2xl text-[var(--foreground)] mt-1">
                  Exemplares seleccionados
                </h2>
              </div>
              <LocalizedLink
                href="/comprar"
                className="btn btn-subtil btn-sm shrink-0 hidden sm:inline-flex"
              >
                Ver todos <ArrowRight size={12} />
              </LocalizedLink>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {destaques.map((a) => (
                <CartaoAnuncio key={a.id} a={a} grande />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── RECENTES ─────────────────────────────────────────────────────── */}
      {recentes.length > 0 && (
        <section className="px-5 sm:px-8 py-12 border-t border-[var(--border)]">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-end justify-between gap-4 mb-5">
              <div>
                <p className="rotulo-forte">Últimos anúncios</p>
                <h2 className="font-serif text-xl sm:text-2xl text-[var(--foreground)] mt-1">
                  Acabados de publicar
                </h2>
              </div>
              <LocalizedLink
                href="/comprar"
                className="btn btn-subtil btn-sm shrink-0 hidden sm:inline-flex"
              >
                Ver todos <ArrowRight size={12} />
              </LocalizedLink>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {recentes.map((a) => (
                <CartaoAnuncio key={a.id} a={a} />
              ))}
            </div>

            <div className="mt-8 text-center sm:hidden">
              <LocalizedLink href="/comprar" className="btn btn-secundario">
                Ver todos os cavalos
              </LocalizedLink>
            </div>
          </div>
        </section>
      )}

      {/* ── CATÁLOGO VAZIO ───────────────────────────────────────────────── */}
      {recentes.length === 0 && (
        <section className="px-5 sm:px-8 py-14 border-t border-[var(--border)]">
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
      <section className="px-5 sm:px-8 py-12 border-t border-[var(--border)] bg-[var(--background-secondary)]/30">
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
      <section className="px-5 sm:px-8 py-14 border-t border-[var(--border)]">
        <div className="max-w-3xl mx-auto text-center">
          <p className="rotulo-forte">Tem um cavalo para vender?</p>
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
