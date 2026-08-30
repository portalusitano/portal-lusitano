"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import LocalizedLink from "@/components/LocalizedLink";
import Revelar from "@/components/Revelar";
import { ImageIcon, Search } from "lucide-react";
import type { SellerListing } from "@/lib/marketplace-listings";

interface Props {
  destaques: SellerListing[];
  recentes: SellerListing[];
  totalAtivos: number;
}

/** Quick entries into the marketplace, as buyers actually describe what they want. */
const ATALHOS = [
  { label: "poldros até 3 anos", href: "/comprar?idadeMax=3" },
  { label: "equitação de trabalho", href: "/comprar?disciplina=Trabalho" },
  { label: "éguas de ventre", href: "/comprar?sexo=femea" },
];

/**
 * Coudelarias históricas, escritas cada uma à sua maneira.
 *
 * São nomes, não logótipos: um muro de imagens obrigava a ter ficheiros de
 * marca que não temos e que cada coudelaria teria de autorizar. Composto em
 * texto, o muro lê-se igual e não pede nada a ninguém.
 */
const COUDELARIAS = [
  { nome: "Coudelaria do Vale", classe: "font-medium tracking-wide" },
  { nome: "Herdade da Ribeira", classe: "font-semibold tracking-tight" },
  { nome: "Monte Branco", classe: "font-mono uppercase tracking-[0.18em] text-base" },
  { nome: "QUINTA DO FREIXO", classe: "font-normal tracking-[0.12em]" },
  { nome: "Casal dos Pinheiros", classe: "italic" },
  { nome: "ALENTEJO SUL", classe: "font-bold tracking-tighter" },
  { nome: "Torre da Azinheira", classe: "font-medium" },
  { nome: "Vale do Sorraia", classe: "font-mono tracking-tight text-base" },
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
 * Segue a anatomia do `HorseCard` da grelha — fotografia, preço, nome,
 * metadados — para a homepage e o /comprar se lerem como o mesmo site.
 * Continua separado porque só aqui há "sob consulta" e "reservado".
 */
function CartaoAnuncio({ a, grande = false }: { a: SellerListing; grande?: boolean }) {
  return (
    <LocalizedLink
      href={`/comprar/${a.id}`}
      className="cartao cartao-interactivo group block overflow-hidden"
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[var(--background-elevated)]">
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

      <div className="p-3 space-y-1">
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

/** Cartão assinatura: costura de luz no topo e laterais dissolvidas no fundo. */
function CartaoSeco({ children }: { children: React.ReactNode }) {
  return (
    <article className="cartao-seco h-full">
      <div className="cartao-seco__costura" />
      <div className="cartao-seco__esbatido" />
      {children}
    </article>
  );
}

/** Cabeçalho de um preview em HTML dentro de um cartão. */
function Preview({ children, colunas }: { children: React.ReactNode; colunas: string }) {
  return (
    <div className="relative z-10 h-[280px] overflow-hidden rounded-t-[24px] px-5 pt-5">
      {/* Esbate o preview para o fundo em vez de o cortar a direito. */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-40 bg-gradient-to-t from-[var(--background)] to-transparent" />
      <div className="w-full overflow-hidden" style={{ ["--cols" as string]: colunas }}>
        {children}
      </div>
    </div>
  );
}

function CorpoCartao({
  titulo,
  texto,
  etiquetas,
}: {
  titulo: string;
  texto: string;
  etiquetas: string[];
}) {
  return (
    <div className="relative z-10 flex flex-col gap-4 px-5 pb-8 md:px-8">
      <h3 className="text-[1.5rem] font-normal leading-tight tracking-tight text-[var(--foreground)]">
        {titulo}
      </h3>
      <p className="text-sm leading-relaxed text-[var(--foreground-secondary)]">{texto}</p>
      <div className="flex flex-wrap items-center gap-2 pt-1">
        {etiquetas.map((e) => (
          <span
            key={e}
            className="rounded-md border px-2 py-1 text-[11px] text-[var(--foreground-muted)]"
            style={{ borderColor: "var(--border-soft)" }}
          >
            {e}
          </span>
        ))}
      </div>
    </div>
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

  const semAnuncios = destaques.length === 0 && recentes.length === 0;
  const grelhaCols = "1fr 96px 74px 62px";

  return (
    <main className="bg-[var(--background)]">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      {/* Sem fotografia de fundo: o gradiente radial dá profundidade sem
          disputar atenção com o texto, e não paga o custo de uma imagem
          grande no caminho crítico. */}
      <section className="relative overflow-hidden px-4 pt-24 pb-16 sm:px-6 md:pt-36 md:pb-24">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 50% at 50% 40%, rgba(40,40,40,.75) 0%, rgba(20,20,20,.4) 38%, rgba(0,0,0,1) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto max-w-6xl text-center">
          <Revelar duracao={600}>
            <h1 className="titulo-gradiente mx-auto mb-8 flex flex-col gap-2 text-4xl font-normal leading-[100%] tracking-[-0.01em] sm:text-5xl md:mb-12 md:text-[4rem]">
              <span>O mercado do Lusitano.</span>
              <span>Num só sítio.</span>
            </h1>
          </Revelar>

          <Revelar duracao={600} atraso={100}>
            <p className="mx-auto mb-10 max-w-2xl px-2 text-base leading-relaxed text-[var(--foreground-secondary)] sm:text-lg md:mb-16 md:text-xl">
              Cavalos de criadores verificados, com genealogia, fotografia e contacto directo.
              <br className="hidden sm:block" /> Sem intermediários, sem comissões.
            </p>
          </Revelar>

          <Revelar duracao={600} atraso={200}>
            <form onSubmit={pesquisar} className="mx-auto w-full max-w-xl px-2 sm:px-0">
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative flex-1">
                  <Search
                    size={18}
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)]"
                  />
                  <input
                    type="search"
                    value={termo}
                    onChange={(e) => setTermo(e.target.value)}
                    placeholder="Linhagem, coudelaria, disciplina ou nome"
                    aria-label="Procurar cavalos"
                    className="campo h-12 pl-11 text-base sm:h-14 sm:text-lg"
                  />
                </div>
                <button
                  type="submit"
                  className="btn btn-primario h-12 shrink-0 px-6 sm:h-14 sm:text-base"
                >
                  Procurar
                </button>
              </div>

              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="text-xs text-[var(--foreground-muted)]">Popular:</span>
                {ATALHOS.map((a) => (
                  <LocalizedLink
                    key={a.label}
                    href={a.href}
                    className="text-xs text-[var(--foreground-secondary)] underline decoration-[var(--border)] underline-offset-4 transition-colors hover:text-[var(--foreground-strong)] hover:decoration-[var(--border-hover)]"
                  >
                    {a.label}
                  </LocalizedLink>
                ))}
              </div>
            </form>
          </Revelar>

          <Revelar duracao={600} atraso={300}>
            <div className="mb-16 mt-16 md:mb-24 md:mt-24">
              <p className="mb-10 text-center text-sm text-[var(--foreground-secondary)]">
                Coudelarias que já publicam no Portal
              </p>
              <div className="mx-auto grid max-w-4xl grid-cols-2 items-center justify-items-center gap-x-6 gap-y-8 sm:grid-cols-3 md:grid-cols-4">
                {COUDELARIAS.map((c) => (
                  <LocalizedLink
                    key={c.nome}
                    href="/directorio"
                    className="group flex h-16 items-center justify-center"
                  >
                    <span
                      className={`text-lg text-[var(--foreground)]/90 transition-colors duration-300 group-hover:text-[var(--gold)] motion-safe:group-hover:scale-110 motion-safe:transition-transform ${c.classe}`}
                    >
                      {c.nome}
                    </span>
                  </LocalizedLink>
                ))}
              </div>
            </div>
          </Revelar>

          {totalAtivos > 0 && (
            <Revelar duracao={600} atraso={400}>
              <div className="flex justify-center">
                <LocalizedLink
                  href="/comprar"
                  className="botao-vidro group inline-flex items-center gap-2.5 rounded-full px-5 py-2.5 text-sm font-medium text-[var(--foreground-strong)]"
                >
                  <span className="relative flex h-2 w-2">
                    <span
                      className="anim-pulsar absolute inline-flex h-full w-full rounded-full opacity-75"
                      style={{ background: "var(--ok)" }}
                    />
                    <span
                      className="relative inline-flex h-2 w-2 rounded-full"
                      style={{ background: "var(--ok)" }}
                    />
                  </span>
                  {totalAtivos} {totalAtivos === 1 ? "cavalo à venda" : "cavalos à venda"}
                  <span className="text-[var(--foreground-secondary)] transition-transform duration-200 group-hover:translate-x-0.5">
                    →
                  </span>
                </LocalizedLink>
              </div>
            </Revelar>
          )}
        </div>
      </section>

      {/* ── A PLATAFORMA ─────────────────────────────────────────────────── */}
      {/* A margem negativa e o canto redondo fazem esta secção encaixar na
          anterior em vez de ficar empilhada em cima dela. */}
      <section
        className="separador-brilho relative z-30 -mt-12 mx-auto max-w-7xl rounded-t-[24px] border-t px-4 pt-10 pb-10 sm:pt-24 sm:pb-24 md:px-6"
        style={{ borderColor: "var(--border)" }}
      >
        <Revelar duracao={600}>
          <h2 className="titulo-gradiente mb-3 text-center text-[2rem] font-normal leading-[120%] tracking-tighter md:text-[3.5rem]">
            Tudo o que é preciso para vender um cavalo
          </h2>
          <p className="mx-auto mb-8 max-w-2xl text-center text-sm text-[var(--foreground-secondary)] md:mb-12 md:text-lg">
            Anúncio, genealogia e contacto directo — numa plataforma feita só para o Lusitano.
          </p>
        </Revelar>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <Revelar y={20} atraso={0}>
            <CartaoSeco>
              <Preview colunas={grelhaCols}>
                <div className="cabeca-ui" style={{ gridTemplateColumns: grelhaCols }}>
                  <span>Cavalo</span>
                  <span>Coudelaria</span>
                  <span>Idade</span>
                  <span className="text-right">Estado</span>
                </div>
                {[
                  ["Ícaro do Vale", "Vale", "6 anos", "Activo"],
                  ["Nobreza da Ribeira", "Ribeira", "4 anos", "Activo"],
                  ["Quixote MB", "M. Branco", "9 anos", "Reservado"],
                  ["Zambujeiro do Freixo", "Freixo", "3 anos", "Activo"],
                  ["Duquesa dos Pinheiros", "Pinheiros", "11 anos", "Vendido"],
                ].map(([nome, coudelaria, idade, estado]) => (
                  <div key={nome} className="linha-ui" style={{ gridTemplateColumns: grelhaCols }}>
                    <span className="truncate pr-2 text-[11px] font-medium text-[var(--foreground-strong)]">
                      {nome}
                    </span>
                    <span className="truncate text-[11px] text-[var(--foreground-muted)]">
                      {coudelaria}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--foreground-muted)]">
                      {idade}
                    </span>
                    <span
                      className="text-right text-[10px]"
                      style={{
                        color: estado === "Activo" ? "var(--ok)" : "var(--foreground-muted)",
                      }}
                    >
                      {estado}
                    </span>
                  </div>
                ))}
              </Preview>
              <CorpoCartao
                titulo="Anúncios completos"
                texto="Fotografia, medidas, disciplina e histórico. Cada anúncio é uma ficha, não um classificado de três linhas."
                etiquetas={["Galeria", "Medidas", "Pedigree"]}
              />
            </CartaoSeco>
          </Revelar>

          <Revelar y={20} atraso={100}>
            <CartaoSeco>
              <Preview colunas="1fr">
                <div
                  className="rounded-xl border p-3"
                  style={{ borderColor: "var(--border-soft)" }}
                >
                  <div
                    className="mb-3 flex items-center gap-2 border-b pb-2"
                    style={{ borderColor: "var(--border-soft)" }}
                  >
                    <span className="ponto" style={{ background: "var(--gold)" }} />
                    <span className="font-mono text-[11px] text-[var(--foreground-secondary)]">
                      mensagem-nova
                    </span>
                    <span
                      className="ml-auto rounded border px-1.5 py-0.5 font-mono text-[11px] text-[var(--foreground-muted)]"
                      style={{ borderColor: "var(--border-soft)" }}
                    >
                      por ler
                    </span>
                  </div>
                  <p className="mb-1 text-[11px] font-medium text-[var(--foreground-strong)]">
                    Ana Ferreira · Sevilha
                  </p>
                  <p className="mb-3 text-[11px] leading-relaxed text-[var(--foreground-muted)]">
                    Interessada no{" "}
                    <span className="text-[var(--foreground-strong)]">Ícaro do Vale</span>. Procuro
                    cavalo para equitação de trabalho, nível médio.
                  </p>
                  <div className="mb-3 grid grid-cols-2 gap-2">
                    {[
                      ["Orçamento", "15–25 k€"],
                      ["Disciplina", "Trabalho"],
                    ].map(([rot, val]) => (
                      <div
                        key={rot}
                        className="rounded-lg border p-2"
                        style={{ borderColor: "var(--border-soft)" }}
                      >
                        <p className="font-mono text-[11px] uppercase tracking-wider text-[var(--foreground-muted)]">
                          {rot}
                        </p>
                        <p className="text-[11px] text-[var(--foreground-strong)]">{val}</p>
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <span className="rounded-md bg-[var(--foreground-strong)] px-2.5 py-1 text-[10px] font-semibold text-black">
                      Responder
                    </span>
                    <span
                      className="rounded-md border px-2.5 py-1 text-[10px] text-[var(--foreground-muted)]"
                      style={{ borderColor: "var(--border-soft)" }}
                    >
                      Ver perfil
                    </span>
                  </div>
                </div>
              </Preview>
              <CorpoCartao
                titulo="Contacto directo"
                texto="O comprador fala com o vendedor dentro do portal. Sem comissões e sem expor o número de telefone a quem não devia."
                etiquetas={["Mensagens", "Alertas", "Denúncias"]}
              />
            </CartaoSeco>
          </Revelar>

          <Revelar y={20} atraso={200}>
            <CartaoSeco>
              <Preview colunas="1fr 84px 64px">
                <div className="cabeca-ui" style={{ gridTemplateColumns: "1fr 84px 64px" }}>
                  <span>Ascendência</span>
                  <span>Linhagem</span>
                  <span className="text-right">Grau</span>
                </div>
                {[
                  ["Pai — Vencedor MB", "Veiga", "Ouro", true],
                  ["Mãe — Aurora do Vale", "Andrade", "Prata", true],
                  ["Avô paterno — Falcão", "Veiga", "Ouro", false],
                  ["Avó paterna — Nau", "Veiga", "—", false],
                  ["Avô materno — Zambujeiro", "Andrade", "Prata", false],
                ].map(([nome, linhagem, grau, forte]) => (
                  <div
                    key={String(nome)}
                    className="linha-ui"
                    style={{ gridTemplateColumns: "1fr 84px 64px" }}
                  >
                    <span
                      className={`truncate pr-2 text-[11px] ${forte ? "font-medium text-[var(--foreground-strong)]" : "text-[var(--foreground-secondary)]"}`}
                    >
                      {nome}
                    </span>
                    <span className="truncate text-[11px] text-[var(--foreground-muted)]">
                      {linhagem}
                    </span>
                    <span
                      className="text-right font-mono text-[11px]"
                      style={{ color: forte ? "var(--gold)" : "var(--foreground-muted)" }}
                    >
                      {grau}
                    </span>
                  </div>
                ))}
              </Preview>
              <CorpoCartao
                titulo="Genealogia à vista"
                texto="Três gerações de ascendência em cada ficha, com linhagem e classificações. É o que os compradores estrangeiros perguntam sempre."
                etiquetas={["3 gerações", "Stud-book"]}
              />
            </CartaoSeco>
          </Revelar>
        </div>

        <Revelar duracao={600} atraso={300}>
          <div className="mt-12 flex flex-wrap items-center justify-center gap-4">
            <LocalizedLink href="/vender-cavalo" className="btn btn-primario h-12 px-6">
              Publicar anúncio
            </LocalizedLink>
            <LocalizedLink href="/comprar" className="btn btn-subtil h-12 px-6">
              Ver cavalos →
            </LocalizedLink>
          </div>
        </Revelar>
      </section>

      {/* ── DESTAQUES ────────────────────────────────────────────────────── */}
      {destaques.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-20 md:px-6">
          <Revelar duracao={600} className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="rotulo-forte">Em destaque</p>
              <h2 className="titulo-gradiente mt-2 text-[1.75rem] font-normal leading-[120%] tracking-tighter md:text-[2.5rem]">
                Exemplares seleccionados
              </h2>
            </div>
            <LocalizedLink
              href="/comprar"
              className="btn btn-subtil btn-sm hidden shrink-0 sm:inline-flex"
            >
              Ver todos →
            </LocalizedLink>
          </Revelar>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            {destaques.map((a, i) => (
              <Revelar key={a.id} y={20} atraso={i * 100}>
                <CartaoAnuncio a={a} grande />
              </Revelar>
            ))}
          </div>
        </section>
      )}

      {/* ── RECENTES ─────────────────────────────────────────────────────── */}
      {recentes.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-12 sm:py-20 md:px-6">
          <Revelar duracao={600} className="mb-6 flex items-end justify-between gap-4">
            <div>
              <p className="rotulo-forte">Últimos anúncios</p>
              <h2 className="titulo-gradiente mt-2 text-[1.75rem] font-normal leading-[120%] tracking-tighter md:text-[2.5rem]">
                Acabados de publicar
              </h2>
            </div>
            <LocalizedLink
              href="/comprar"
              className="btn btn-subtil btn-sm hidden shrink-0 sm:inline-flex"
            >
              Ver todos →
            </LocalizedLink>
          </Revelar>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {recentes.map((a, i) => (
              <Revelar key={a.id} y={20} atraso={i * 100}>
                <CartaoAnuncio a={a} />
              </Revelar>
            ))}
          </div>

          <div className="mt-8 text-center sm:hidden">
            <LocalizedLink href="/comprar" className="btn btn-secundario">
              Ver todos os cavalos
            </LocalizedLink>
          </div>
        </section>
      )}

      {/* ── ESTADO VAZIO ─────────────────────────────────────────────────── */}
      {semAnuncios && (
        <section className="mx-auto max-w-7xl px-4 py-20 text-center md:px-6">
          <Revelar duracao={600}>
            <h2 className="titulo-gradiente text-[1.75rem] font-normal leading-[120%] tracking-tighter md:text-[2.5rem]">
              Ainda não há cavalos publicados
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[var(--foreground-secondary)]">
              Seja o primeiro a anunciar. O seu cavalo fica visível para todo o país.
            </p>
            <div className="mt-8">
              <LocalizedLink href="/vender-cavalo" className="btn btn-acento h-12 px-6">
                Publicar anúncio
              </LocalizedLink>
            </div>
          </Revelar>
        </section>
      )}

      {/* ── TESTEMUNHO ───────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-7xl px-4 md:px-6">
        <div className="relative py-16 text-center md:py-28">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 80% 60% at 50% 0%, var(--elevate-1), transparent 70%)",
            }}
          />
          <div className="relative">
            <Revelar duracao={800} y={20}>
              <blockquote className="mx-auto max-w-3xl text-xl leading-relaxed text-[var(--foreground)] md:text-[1.75rem] md:leading-[1.5]">
                &ldquo;Vendi dois poldros sem pagar comissão nenhuma. O anúncio com genealogia e
                fotografias a sério fez metade do trabalho por mim.&rdquo;
              </blockquote>
            </Revelar>
            <Revelar duracao={600} atraso={200} y={20}>
              <p className="mt-8 text-2xl" style={{ color: "var(--gold)" }}>
                Coudelaria do Vale
              </p>
            </Revelar>
            <Revelar duracao={600} atraso={300} y={20}>
              <p className="mt-4 text-sm text-[var(--foreground)]">Miguel Antunes</p>
              <p className="text-sm text-[var(--foreground-secondary)]">Criador, Golegã</p>
            </Revelar>
          </div>
        </div>
      </section>

      {/* ── PUBLICAR COM CONFIANÇA ───────────────────────────────────────── */}
      <section
        className="separador-brilho relative mx-auto mt-8 max-w-7xl rounded-t-[24px] border-t px-4 pt-10 pb-10 sm:pt-24 sm:pb-24 md:px-6"
        style={{ borderColor: "var(--border)" }}
      >
        <Revelar duracao={600}>
          <h2 className="titulo-gradiente mb-3 max-w-2xl text-[2rem] font-normal leading-[120%] tracking-tighter md:text-[3.5rem]">
            Publique com confiança
          </h2>
          <p className="mb-8 max-w-2xl text-sm text-[var(--foreground-secondary)] md:mb-16 md:text-lg">
            Um mercado onde o comprador confia no que vê — e o vendedor não perde tempo com
            curiosos.
          </p>
        </Revelar>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
          {[
            {
              t: "Anúncios moderados",
              d: "Cada anúncio é aprovado antes de ficar visível, e qualquer pessoa pode denunciar o que estiver errado.",
            },
            {
              t: "Mensagens no portal",
              d: "Fale com o vendedor sem publicar o seu número. O contacto só é partilhado se quiser.",
            },
            {
              t: "Alertas de pesquisa",
              d: "O cavalo certo raramente está à venda hoje. Guarde a pesquisa e avisamos quando aparecer.",
            },
            {
              t: "Prazo que conta",
              d: "O anúncio pago tem fim, e o vendedor é avisado antes. Nada fica na montra depois de acabar.",
            },
            {
              t: "Anúncio em minutos",
              d: "Formulário curto, fotografias direct do telemóvel, publicação assim que for validado.",
            },
            {
              t: "Sabe o que resultou",
              d: "Visualizações e mensagens por anúncio. Percebe que cavalo interessa a quem.",
            },
          ].map((c, i) => (
            <Revelar key={c.t} y={20} atraso={i * 120}>
              <CartaoSeco>
                <div className="relative z-10 flex flex-col gap-3 p-8">
                  <h4 className="text-xl font-normal text-[var(--foreground-strong)]">{c.t}</h4>
                  <p className="text-sm leading-relaxed text-[var(--foreground-secondary)]">
                    {c.d}
                  </p>
                </div>
              </CartaoSeco>
            </Revelar>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ────────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-16 text-center sm:pt-32 md:px-6">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 50% 0%, var(--elevate-2), transparent 70%)",
          }}
        />
        <div className="relative">
          <Revelar duracao={600}>
            <h2 className="titulo-gradiente mb-3 text-[2rem] font-normal leading-[120%] tracking-tighter md:text-[3.5rem]">
              Publique o seu cavalo hoje
            </h2>
            <p className="mx-auto mb-8 max-w-lg text-sm text-[var(--foreground-secondary)] md:text-lg">
              Crie a ficha, adicione fotografias e genealogia, e receba contactos em dias.
            </p>
          </Revelar>
          <Revelar duracao={600} atraso={100}>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <LocalizedLink href="/vender-cavalo" className="btn btn-acento h-12 px-7 text-base">
                Publicar anúncio
              </LocalizedLink>
              <LocalizedLink href="/comprar" className="btn btn-subtil h-12 px-6 text-base">
                Ver cavalos →
              </LocalizedLink>
            </div>
          </Revelar>
        </div>
      </section>
    </main>
  );
}
