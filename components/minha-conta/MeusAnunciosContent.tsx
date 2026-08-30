"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import LocalizedLink from "@/components/LocalizedLink";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Eye,
  Heart,
  ImageIcon,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { useToast } from "@/context/ToastContext";
import { LISTING_STATUS, type SellerListing } from "@/lib/marketplace-listings";
import GestorFotos from "@/components/minha-conta/GestorFotos";

/** A listing plus the engagement counter the API adds on top. */
type Anuncio = SellerListing & { favoritos: number };

interface Resumo {
  total: number;
  publicados: number;
  emAprovacao: number;
  vendidos: number;
  expirados: number;
  totalVisualizacoes: number;
}

/** The subset of fields the inline editor writes. */
interface EditState {
  preco: string;
  preco_negociavel: boolean;
  descricao: string;
  localizacao: string;
  vendedor_telefone: string;
  vendedor_whatsapp: string;
}

const STATUS_STYLES: Record<string, string> = {
  active: "text-emerald-400/90 border-emerald-400/30",
  reservado: "text-amber-400/90 border-amber-400/30",
  vendido: "text-[var(--gold)]/90 border-[var(--gold)]/30",
  pending: "text-sky-400/90 border-sky-400/30",
  inativo: "text-[var(--foreground-muted)] border-[var(--border)]",
};

function formatPreco(anuncio: Anuncio): string {
  if (anuncio.precoSobConsulta) return "Sob consulta";
  if (anuncio.preco === null) return "Sem preço";
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(anuncio.preco);
}

/** The expiry line shown under each listing, or null when there is nothing to say. */
function textoExpiracao(anuncio: Anuncio): string | null {
  if (anuncio.status === LISTING_STATUS.VENDIDO) return null;
  if (anuncio.expirado) return "Anúncio expirado";
  if (anuncio.diasRestantes === null) return null;
  if (anuncio.diasRestantes <= 1) return "Expira hoje";
  return `Expira em ${anuncio.diasRestantes} dias`;
}

export default function MeusAnunciosContent() {
  const { showToast } = useToast();
  const [anuncios, setAnuncios] = useState<Anuncio[]>([]);
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  /** Id of the listing whose inline editor is open. */
  const [aEditar, setAEditar] = useState<string | null>(null);
  const [edicao, setEdicao] = useState<EditState | null>(null);
  /** Id of the listing with a request in flight, so only its buttons lock. */
  const [ocupado, setOcupado] = useState<string | null>(null);
  /** Id of the listing showing the delete confirmation. */
  const [aConfirmarRemocao, setAConfirmarRemocao] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro(null);
    try {
      const res = await fetch("/api/meus-anuncios");
      if (res.status === 401) {
        window.location.href = "/login";
        return;
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao carregar anúncios");
      setAnuncios(data.anuncios || []);
      setResumo(data.resumo || null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar anúncios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  /** Applies a patch to one listing and swaps the returned row into the list. */
  const actualizar = async (id: string, patch: Record<string, unknown>, sucesso: string) => {
    setOcupado(id);
    try {
      const res = await fetch(`/api/meus-anuncios/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao actualizar anúncio");

      setAnuncios((prev) =>
        prev.map((a) => (a.id === id ? { ...data.anuncio, favoritos: a.favoritos } : a))
      );
      showToast("success", sucesso);
      return true;
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao actualizar anúncio");
      return false;
    } finally {
      setOcupado(null);
    }
  };

  const remover = async (id: string) => {
    setOcupado(id);
    try {
      const res = await fetch(`/api/meus-anuncios/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Erro ao remover anúncio");

      setAnuncios((prev) => prev.filter((a) => a.id !== id));
      setAConfirmarRemocao(null);
      showToast("success", "Anúncio removido");
    } catch (e) {
      showToast("error", e instanceof Error ? e.message : "Erro ao remover anúncio");
    } finally {
      setOcupado(null);
    }
  };

  const abrirEditor = (anuncio: Anuncio) => {
    setAEditar(anuncio.id);
    setEdicao({
      preco: anuncio.preco === null ? "" : String(anuncio.preco),
      preco_negociavel: anuncio.precoNegociavel,
      descricao: anuncio.descricao || "",
      localizacao: anuncio.localizacao || "",
      vendedor_telefone: anuncio.vendedorTelefone || "",
      vendedor_whatsapp: anuncio.vendedorWhatsapp || "",
    });
  };

  const guardarEdicao = async (id: string) => {
    if (!edicao) return;
    const ok = await actualizar(
      id,
      {
        preco: edicao.preco === "" ? null : Number(edicao.preco),
        preco_negociavel: edicao.preco_negociavel,
        descricao: edicao.descricao,
        localizacao: edicao.localizacao,
        vendedor_telefone: edicao.vendedor_telefone,
        vendedor_whatsapp: edicao.vendedor_whatsapp,
      },
      "Anúncio actualizado"
    );
    if (ok) {
      setAEditar(null);
      setEdicao(null);
    }
  };

  return (
    <main className="min-h-screen bg-[var(--background)] px-5 sm:px-8 py-16 sm:py-24">
      <div className="max-w-4xl mx-auto">
        <LocalizedLink
          href="/minha-conta"
          className="inline-flex items-center gap-2 rotulo hover:text-[var(--gold)] transition-colors mb-10"
        >
          <ArrowLeft size={12} />A minha conta
        </LocalizedLink>

        <header className="mb-12">
          <h1 className="text-2xl sm:text-3xl font-light tracking-wide text-[var(--foreground)]">
            Os meus anúncios
          </h1>
          <p className="text-sm text-[var(--foreground-muted)] mt-3 max-w-xl">
            Faça a gestão dos cavalos que colocou à venda no Portal Lusitano.
          </p>
        </header>

        {resumo && resumo.total > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 bg-[var(--gold)]/8 gap-px mb-10">
            {[
              { label: "Publicados", valor: resumo.publicados },
              { label: "Em aprovação", valor: resumo.emAprovacao },
              { label: "Vendidos", valor: resumo.vendidos },
              { label: "Visualizações", valor: resumo.totalVisualizacoes },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--background)] p-5 text-center">
                <p className="text-xl font-light text-[var(--gold)]">{stat.valor}</p>
                <p className="rotulo mt-1.5">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-24 text-[var(--foreground-muted)]">
            <Loader2 size={18} className="animate-spin" />
          </div>
        )}

        {!loading && erro && (
          <div className="border border-red-400/30 p-8 text-center">
            <AlertTriangle size={18} className="mx-auto text-red-400/70 mb-3" />
            <p className="text-sm text-[var(--foreground-muted)]">{erro}</p>
            <button
              onClick={carregar}
              className="mt-5 rotulo-forte hover:text-[var(--gold)]/70 transition-colors"
            >
              Tentar novamente
            </button>
          </div>
        )}

        {!loading && !erro && anuncios.length === 0 && (
          <div className="border border-[var(--border)] p-12 text-center">
            <ImageIcon size={22} className="mx-auto text-[var(--gold)]/25 mb-4" />
            <p className="text-sm text-[var(--foreground)]">Ainda não tem anúncios publicados.</p>
            <p className="text-xs text-[var(--foreground-muted)] mt-2 max-w-sm mx-auto">
              Publique o seu primeiro cavalo e chegue a compradores em todo o país.
            </p>
            <LocalizedLink
              href="/vender-cavalo"
              className="inline-flex items-center gap-2 mt-7 px-6 py-3 border border-[var(--gold)]/40 rotulo-forte hover:bg-[var(--gold)]/10 transition-colors"
            >
              <Plus size={12} />
              Publicar anúncio
            </LocalizedLink>
          </div>
        )}

        {!loading && !erro && anuncios.length > 0 && (
          <div className="space-y-px bg-[var(--gold)]/8">
            {anuncios.map((anuncio) => {
              const emEdicao = aEditar === anuncio.id;
              const bloqueado = ocupado === anuncio.id;
              const expiracao = textoExpiracao(anuncio);

              return (
                <article key={anuncio.id} className="bg-[var(--background)] p-5 sm:p-6">
                  <div className="flex gap-5">
                    <div className="relative w-24 h-24 sm:w-28 sm:h-28 shrink-0 bg-[var(--background-secondary)]/30">
                      {anuncio.fotoPrincipal ? (
                        <Image
                          src={anuncio.fotoPrincipal}
                          alt={anuncio.nome}
                          fill
                          sizes="112px"
                          className="object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <ImageIcon size={16} className="text-[var(--gold)]/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h2 className="text-base font-light text-[var(--foreground)] truncate">
                            {anuncio.nome}
                          </h2>
                          <p className="text-sm text-[var(--gold)] mt-1">
                            {formatPreco(anuncio)}
                            {anuncio.precoNegociavel && (
                              <span className="text-[var(--foreground-muted)] text-xs ml-2">
                                negociável
                              </span>
                            )}
                          </p>
                        </div>
                        <span
                          className={`shrink-0 border px-2.5 py-1 rotulo ${
                            anuncio.expirado && anuncio.status !== LISTING_STATUS.VENDIDO
                              ? "text-red-400/80 border-red-400/30"
                              : STATUS_STYLES[anuncio.status] ||
                                "text-[var(--foreground-muted)] border-[var(--border)]"
                          }`}
                        >
                          {anuncio.expirado && anuncio.status !== LISTING_STATUS.VENDIDO
                            ? "Expirado"
                            : anuncio.statusLabel}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 mt-3 rotulo">
                        <span className="inline-flex items-center gap-1.5">
                          <Eye size={11} />
                          {anuncio.views}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <Heart size={11} />
                          {anuncio.favoritos}
                        </span>
                        <span>{anuncio.tierName}</span>
                        {expiracao && (
                          <span className={anuncio.expirado ? "text-red-400/70" : ""}>
                            {expiracao}
                          </span>
                        )}
                      </div>

                      {anuncio.status === LISTING_STATUS.PENDING && (
                        <p className="text-[11px] text-sky-400/70 mt-3">
                          A aguardar aprovação da equipa. Fica visível no marketplace assim que for
                          aprovado.
                        </p>
                      )}

                      {anuncio.expirado && anuncio.status !== LISTING_STATUS.VENDIDO && (
                        <p className="text-[11px] text-[var(--foreground-muted)] mt-3">
                          O período do anúncio terminou.{" "}
                          <LocalizedLink
                            href="/vender-cavalo"
                            className="text-[var(--gold)] hover:underline"
                          >
                            Publique novamente
                          </LocalizedLink>{" "}
                          para voltar ao marketplace.
                        </p>
                      )}
                    </div>
                  </div>

                  {emEdicao && edicao ? (
                    <div className="mt-6 pt-6 border-t border-[var(--border)] space-y-4">
                      <div className="grid sm:grid-cols-2 gap-4">
                        <label className="block">
                          <span className="rotulo">Preço (EUR)</span>
                          <input
                            type="number"
                            min="0"
                            value={edicao.preco}
                            onChange={(e) => setEdicao({ ...edicao, preco: e.target.value })}
                            className="mt-2 w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="rotulo">Localização</span>
                          <input
                            type="text"
                            value={edicao.localizacao}
                            onChange={(e) => setEdicao({ ...edicao, localizacao: e.target.value })}
                            className="mt-2 w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="rotulo">Telefone</span>
                          <input
                            type="tel"
                            value={edicao.vendedor_telefone}
                            onChange={(e) =>
                              setEdicao({ ...edicao, vendedor_telefone: e.target.value })
                            }
                            className="mt-2 w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
                          />
                        </label>
                        <label className="block">
                          <span className="rotulo">WhatsApp</span>
                          <input
                            type="tel"
                            value={edicao.vendedor_whatsapp}
                            onChange={(e) =>
                              setEdicao({ ...edicao, vendedor_whatsapp: e.target.value })
                            }
                            className="mt-2 w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none"
                          />
                        </label>
                      </div>

                      <label className="block">
                        <span className="rotulo">Descrição</span>
                        <textarea
                          rows={5}
                          value={edicao.descricao}
                          onChange={(e) => setEdicao({ ...edicao, descricao: e.target.value })}
                          className="mt-2 w-full bg-transparent border border-[var(--border)] px-3 py-2 text-sm text-[var(--foreground)] focus:border-[var(--gold)]/50 focus:outline-none resize-y"
                        />
                      </label>

                      <label className="flex items-center gap-2.5 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={edicao.preco_negociavel}
                          onChange={(e) =>
                            setEdicao({ ...edicao, preco_negociavel: e.target.checked })
                          }
                          className="accent-[var(--gold)]"
                        />
                        <span className="text-xs text-[var(--foreground-muted)]">
                          Preço negociável
                        </span>
                      </label>

                      <GestorFotos
                        anuncioId={anuncio.id}
                        fotos={anuncio.fotos}
                        onGuardado={(actualizado) =>
                          setAnuncios((prev) =>
                            prev.map((a) =>
                              a.id === actualizado.id
                                ? // `favoritos` vem da contagem inicial, não desta
                                  // resposta; perdê-la punha o número a zero.
                                  { ...actualizado, favoritos: a.favoritos }
                                : a
                            )
                          )
                        }
                      />

                      <div className="flex flex-wrap gap-2 pt-2">
                        <button
                          onClick={() => guardarEdicao(anuncio.id)}
                          disabled={bloqueado}
                          className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--gold)]/40 rotulo-forte hover:bg-[var(--gold)]/10 transition-colors disabled:opacity-40"
                        >
                          {bloqueado ? (
                            <Loader2 size={12} className="animate-spin" />
                          ) : (
                            <Check size={12} />
                          )}
                          Guardar
                        </button>
                        <button
                          onClick={() => {
                            setAEditar(null);
                            setEdicao(null);
                          }}
                          disabled={bloqueado}
                          className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--border)] rotulo hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                        >
                          <X size={12} />
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2 mt-5 pt-5 border-t border-[var(--border)]">
                      {anuncio.publico && (
                        <LocalizedLink
                          href={`/comprar/${anuncio.id}`}
                          className="px-4 py-2 border border-[var(--border)] rotulo hover:text-[var(--gold)] hover:border-[var(--gold)]/40 transition-colors"
                        >
                          Ver anúncio
                        </LocalizedLink>
                      )}

                      <button
                        onClick={() => abrirEditor(anuncio)}
                        disabled={bloqueado}
                        className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rotulo hover:text-[var(--gold)] hover:border-[var(--gold)]/40 transition-colors disabled:opacity-40"
                      >
                        <Pencil size={11} />
                        Editar
                      </button>

                      {anuncio.status === LISTING_STATUS.ACTIVE && !anuncio.expirado && (
                        <button
                          onClick={() =>
                            actualizar(
                              anuncio.id,
                              { status: LISTING_STATUS.RESERVADO },
                              "Anúncio marcado como reservado"
                            )
                          }
                          disabled={bloqueado}
                          className="px-4 py-2 border border-[var(--border)] rotulo hover:text-amber-400 hover:border-amber-400/40 transition-colors disabled:opacity-40"
                        >
                          Reservar
                        </button>
                      )}

                      {anuncio.status === LISTING_STATUS.RESERVADO && !anuncio.expirado && (
                        <button
                          onClick={() =>
                            actualizar(
                              anuncio.id,
                              { status: LISTING_STATUS.ACTIVE },
                              "Anúncio novamente disponível"
                            )
                          }
                          disabled={bloqueado}
                          className="px-4 py-2 border border-[var(--border)] rotulo hover:text-emerald-400 hover:border-emerald-400/40 transition-colors disabled:opacity-40"
                        >
                          Disponível
                        </button>
                      )}

                      {(anuncio.status === LISTING_STATUS.ACTIVE ||
                        anuncio.status === LISTING_STATUS.RESERVADO) && (
                        <button
                          onClick={() =>
                            actualizar(
                              anuncio.id,
                              { status: LISTING_STATUS.VENDIDO },
                              "Parabéns pela venda!"
                            )
                          }
                          disabled={bloqueado}
                          className="px-4 py-2 border border-[var(--gold)]/40 rotulo-forte hover:bg-[var(--gold)]/10 transition-colors disabled:opacity-40"
                        >
                          Marcar vendido
                        </button>
                      )}

                      {(anuncio.status === LISTING_STATUS.ACTIVE ||
                        anuncio.status === LISTING_STATUS.RESERVADO) && (
                        <button
                          onClick={() =>
                            actualizar(
                              anuncio.id,
                              { status: LISTING_STATUS.INATIVO },
                              "Anúncio pausado"
                            )
                          }
                          disabled={bloqueado}
                          className="px-4 py-2 border border-[var(--border)] rotulo hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                        >
                          Pausar
                        </button>
                      )}

                      {anuncio.status === LISTING_STATUS.INATIVO && !anuncio.expirado && (
                        <button
                          onClick={() =>
                            actualizar(
                              anuncio.id,
                              { status: LISTING_STATUS.ACTIVE },
                              "Anúncio novamente publicado"
                            )
                          }
                          disabled={bloqueado}
                          className="px-4 py-2 border border-[var(--border)] rotulo hover:text-emerald-400 hover:border-emerald-400/40 transition-colors disabled:opacity-40"
                        >
                          Republicar
                        </button>
                      )}

                      {aConfirmarRemocao === anuncio.id ? (
                        <span className="inline-flex items-center gap-2">
                          <button
                            onClick={() => remover(anuncio.id)}
                            disabled={bloqueado}
                            className="inline-flex items-center gap-2 px-4 py-2 border border-red-400/40 rotulo text-red-400 hover:bg-red-400/10 transition-colors disabled:opacity-40"
                          >
                            {bloqueado ? (
                              <Loader2 size={11} className="animate-spin" />
                            ) : (
                              <Trash2 size={11} />
                            )}
                            Confirmar
                          </button>
                          <button
                            onClick={() => setAConfirmarRemocao(null)}
                            disabled={bloqueado}
                            className="px-4 py-2 border border-[var(--border)] rotulo hover:text-[var(--foreground)] transition-colors disabled:opacity-40"
                          >
                            Não
                          </button>
                        </span>
                      ) : (
                        <button
                          onClick={() => setAConfirmarRemocao(anuncio.id)}
                          disabled={bloqueado}
                          className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] rotulo hover:text-red-400 hover:border-red-400/40 transition-colors disabled:opacity-40"
                        >
                          <Trash2 size={11} />
                          Remover
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        )}

        {!loading && !erro && anuncios.length > 0 && (
          <div className="mt-10 text-center">
            <LocalizedLink
              href="/vender-cavalo"
              className="inline-flex items-center gap-2 px-6 py-3 border border-[var(--gold)]/40 rotulo-forte hover:bg-[var(--gold)]/10 transition-colors"
            >
              <Plus size={12} />
              Publicar novo anúncio
            </LocalizedLink>
          </div>
        )}
      </div>
    </main>
  );
}
