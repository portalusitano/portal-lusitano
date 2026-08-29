"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { BellRing, ChevronLeft, ChevronRight, Search, SlidersHorizontal, X } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import HorseCard from "@/components/HorseCard";
import {
  ORDENACOES,
  aplicarFiltros,
  contarFiltrosAtivos,
  disciplinasDe,
  escreverFiltros,
  lerFiltros,
  ordenar,
  paginar,
  temFiltrosAtivos,
  type FiltrosMarketplace,
  type Ordenacao,
} from "@/lib/marketplace-filtros";

/** Shape of a horse row from the cavalos_venda table. */
export interface MarketplaceHorse {
  id: string;
  nome_cavalo: string;
  preco: number;
  image_url?: string;
  slug?: string;
  localizacao?: string;
  idade?: number;
  raca?: string;
  sexo?: string;
  disciplinas?: string[] | string | null;
  nivel?: string;
  destaque?: boolean;
  created_at?: string;
}

interface MarketplaceGridProps {
  horses: MarketplaceHorse[];
}

/** Price bands offered as one-click shortcuts, expressed as the min/max the URL carries. */
const FAIXAS_PRECO: { label: string; min: number | null; max: number | null }[] = [
  { label: "Até 10 000 €", min: null, max: 10000 },
  { label: "10 000 – 25 000 €", min: 10000, max: 25000 },
  { label: "25 000 – 50 000 €", min: 25000, max: 50000 },
  { label: "Mais de 50 000 €", min: 50000, max: null },
];

const FAIXAS_IDADE: { label: string; min: number | null; max: number | null }[] = [
  { label: "Poldros (até 3)", min: null, max: 3 },
  { label: "Jovens (4–7)", min: 4, max: 7 },
  { label: "Adultos (8–14)", min: 8, max: 14 },
  { label: "Seniores (15+)", min: 15, max: null },
];

const SEXOS = [
  { id: "macho", label: "Macho" },
  { id: "femea", label: "Fêmea" },
  { id: "castrado", label: "Castrado" },
];

export default function MarketplaceGrid({ horses }: MarketplaceGridProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // The URL is the source of truth, so a filtered search can be shared, saved
  // and walked back through with the browser's own back button.
  const filtros = useMemo(() => lerFiltros(searchParams), [searchParams]);

  // The text box is the one control that cannot read straight from the URL:
  // writing a history entry per keystroke would wreck the back button.
  const [rascunhoPesquisa, setRascunhoPesquisa] = useState(filtros.search);
  const [filtrosAbertos, setFiltrosAbertos] = useState(false);

  // Realinha a caixa quando o URL muda por fora (voltar atrás, clicar num
  // atalho da homepage). Ajustar estado durante o render é o padrão que o React
  // documenta para isto; fazê-lo num efeito provoca renders em cascata.
  const [pesquisaNoUrl, setPesquisaNoUrl] = useState(filtros.search);
  if (filtros.search !== pesquisaNoUrl) {
    setPesquisaNoUrl(filtros.search);
    setRascunhoPesquisa(filtros.search);
  }

  const navegar = useCallback(
    (novos: Partial<FiltrosMarketplace>) => {
      // Any change to what is being searched resets to page 1: staying on page 4
      // of a result set that no longer has four pages shows an empty screen.
      const mudouPesquisa = Object.keys(novos).some((k) => k !== "pagina");
      const proximos: FiltrosMarketplace = {
        ...filtros,
        ...novos,
        pagina: novos.pagina ?? (mudouPesquisa ? 1 : filtros.pagina),
      };
      const query = escreverFiltros(proximos);
      router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filtros, pathname, router]
  );

  // Debounced so typing does not fill the history with one entry per letter.
  useEffect(() => {
    if (rascunhoPesquisa === filtros.search) return;
    const timer = setTimeout(() => navegar({ search: rascunhoPesquisa }), 350);
    return () => clearTimeout(timer);
  }, [rascunhoPesquisa, filtros.search, navegar]);

  const disciplinasDisponiveis = useMemo(() => {
    const set = new Set<string>();
    horses.forEach((h) => disciplinasDe(h).forEach((d) => set.add(d)));
    return Array.from(set).sort();
  }, [horses]);

  const regioesDisponiveis = useMemo(() => {
    const set = new Set<string>();
    horses.forEach((h) => {
      const loc = h.localizacao?.trim();
      if (loc) set.add(loc);
    });
    return Array.from(set).sort();
  }, [horses]);

  const resultados = useMemo(
    () => ordenar(aplicarFiltros(horses, filtros), filtros.ordenar),
    [horses, filtros]
  );

  const pagina = useMemo(() => paginar(resultados, filtros.pagina), [resultados, filtros.pagina]);

  const activos = contarFiltrosAtivos(filtros);
  const temFiltros = temFiltrosAtivos(filtros);

  const limpar = () => router.push(pathname, { scroll: false });

  /** Turns the current search into a saved alert, pre-filled. */
  const hrefAlerta = `/minha-conta/alertas?${escreverFiltros({ ...filtros, pagina: 1 })}`;

  const chip = (activo: boolean) =>
    `px-3.5 py-2 text-[10px] uppercase tracking-widest border transition-colors ${
      activo
        ? "border-[var(--gold)] text-[var(--gold)] bg-[var(--gold)]/10"
        : "border-[var(--border)] text-[var(--foreground-secondary)] hover:border-[var(--gold)]/50 hover:text-[var(--gold)]"
    }`;

  const painelFiltros = (
    <div className="space-y-6">
      <div>
        <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] mb-3">
          Sexo
        </p>
        <div className="flex flex-wrap gap-2">
          {SEXOS.map((s) => (
            <button
              key={s.id}
              onClick={() => navegar({ sexo: filtros.sexo === s.id ? "" : s.id })}
              className={chip(filtros.sexo === s.id)}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] mb-3">
          Preço
        </p>
        <div className="flex flex-wrap gap-2">
          {FAIXAS_PRECO.map((f) => {
            const activo = filtros.precoMin === f.min && filtros.precoMax === f.max;
            return (
              <button
                key={f.label}
                onClick={() =>
                  navegar(
                    activo
                      ? { precoMin: null, precoMax: null }
                      : { precoMin: f.min, precoMax: f.max }
                  )
                }
                className={chip(activo)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] mb-3">
          Idade
        </p>
        <div className="flex flex-wrap gap-2">
          {FAIXAS_IDADE.map((f) => {
            const activo = filtros.idadeMin === f.min && filtros.idadeMax === f.max;
            return (
              <button
                key={f.label}
                onClick={() =>
                  navegar(
                    activo
                      ? { idadeMin: null, idadeMax: null }
                      : { idadeMin: f.min, idadeMax: f.max }
                  )
                }
                className={chip(activo)}
              >
                {f.label}
              </button>
            );
          })}
        </div>
      </div>

      {disciplinasDisponiveis.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] mb-3">
            Disciplina
          </p>
          <div className="flex flex-wrap gap-2">
            {disciplinasDisponiveis.map((d) => (
              <button
                key={d}
                onClick={() => navegar({ disciplina: filtros.disciplina === d ? "" : d })}
                className={chip(filtros.disciplina === d)}
              >
                {d}
              </button>
            ))}
          </div>
        </div>
      )}

      {regioesDisponiveis.length > 0 && (
        <div>
          <p className="text-[9px] uppercase tracking-[0.25em] text-[var(--foreground-muted)] mb-3">
            Localização
          </p>
          <div className="flex flex-wrap gap-2">
            {regioesDisponiveis.slice(0, 16).map((r) => (
              <button
                key={r}
                onClick={() => navegar({ regiao: filtros.regiao === r ? "" : r })}
                className={chip(filtros.regiao === r)}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div>
      {/* ── Pesquisa ── */}
      <div className="relative mb-4">
        <Search
          size={16}
          className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] pointer-events-none"
          aria-hidden
        />
        <input
          type="search"
          value={rascunhoPesquisa}
          onChange={(e) => setRascunhoPesquisa(e.target.value)}
          placeholder="Nome, linhagem, localização, disciplina…"
          aria-label="Pesquisar cavalos"
          className="w-full pl-11 pr-10 py-3 bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground)] text-sm placeholder:text-[var(--foreground-muted)] focus:outline-none focus:border-[var(--gold)] transition-colors"
        />
        {rascunhoPesquisa && (
          <button
            onClick={() => setRascunhoPesquisa("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            aria-label="Limpar pesquisa"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* ── Barra de resultados ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-[10px] uppercase tracking-[0.25em] text-[var(--foreground-muted)]">
          {pagina.total === 1 ? "1 cavalo" : `${pagina.total} cavalos`}
          {pagina.totalPaginas > 1 && ` · página ${pagina.pagina} de ${pagina.totalPaginas}`}
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFiltrosAbertos((v) => !v)}
            className="sm:hidden inline-flex items-center gap-2 px-3.5 py-2 border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--foreground-secondary)]"
          >
            <SlidersHorizontal size={12} />
            Filtros
            {activos > 0 && (
              <span className="w-4 h-4 rounded-full bg-[var(--gold)] text-black text-[9px] flex items-center justify-center font-bold">
                {activos}
              </span>
            )}
          </button>

          <label className="sr-only" htmlFor="ordenar">
            Ordenar
          </label>
          <select
            id="ordenar"
            value={filtros.ordenar}
            onChange={(e) => navegar({ ordenar: e.target.value as Ordenacao })}
            className="appearance-none bg-[var(--background-secondary)] border border-[var(--border)] text-[var(--foreground)] text-xs px-3 py-2 pr-7 cursor-pointer focus:outline-none focus:border-[var(--gold)]"
          >
            {ORDENACOES.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Filtros (sempre visíveis em ecrã grande) ── */}
      <div
        className={`${filtrosAbertos ? "block" : "hidden"} sm:block border border-[var(--border)] p-5 mb-6`}
      >
        {painelFiltros}

        {temFiltros && (
          <div className="flex flex-wrap gap-2 mt-6 pt-5 border-t border-[var(--border)]">
            <button
              onClick={limpar}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              <X size={11} />
              Limpar filtros
            </button>
            {/* Uma pesquisa que não devolve nada hoje é exactamente aquela que
                vale a pena guardar como alerta. */}
            <LocalizedLink
              href={hrefAlerta}
              className="inline-flex items-center gap-2 px-4 py-2 border border-[var(--gold)]/40 text-[10px] uppercase tracking-widest text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
            >
              <BellRing size={11} />
              Guardar esta pesquisa
            </LocalizedLink>
          </div>
        )}
      </div>

      {/* ── Resultados ── */}
      {pagina.total === 0 ? (
        <div className="border border-[var(--border)] p-12 text-center">
          <Search size={20} className="mx-auto text-[var(--gold)]/25 mb-4" />
          <p className="text-sm text-[var(--foreground)]">Nenhum cavalo corresponde à pesquisa.</p>
          <p className="text-xs text-[var(--foreground-muted)] mt-2 max-w-sm mx-auto">
            Alargue os filtros, ou guarde esta pesquisa e avisamos assim que aparecer um cavalo
            assim.
          </p>
          <div className="flex flex-wrap justify-center gap-2 mt-7">
            <button
              onClick={limpar}
              className="px-5 py-2.5 border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Limpar filtros
            </button>
            <LocalizedLink
              href={hrefAlerta}
              className="inline-flex items-center gap-2 px-5 py-2.5 border border-[var(--gold)]/40 text-[10px] uppercase tracking-widest text-[var(--gold)] hover:bg-[var(--gold)]/10 transition-colors"
            >
              <BellRing size={11} />
              Criar alerta
            </LocalizedLink>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-px bg-[var(--gold)]/8">
            {pagina.itens.map((horse, i) => (
              <HorseCard
                key={horse.id}
                horse={horse}
                href={`/comprar/${horse.id}`}
                priority={i < 4}
              />
            ))}
          </div>

          {pagina.totalPaginas > 1 && (
            <nav
              className="flex items-center justify-center gap-2 mt-10"
              aria-label="Paginação de resultados"
            >
              <button
                onClick={() => navegar({ pagina: pagina.pagina - 1 })}
                disabled={pagina.pagina <= 1}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--foreground-secondary)] hover:border-[var(--gold)]/50 hover:text-[var(--gold)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                <ChevronLeft size={12} />
                Anterior
              </button>

              <span className="px-4 text-[10px] uppercase tracking-[0.2em] text-[var(--foreground-muted)]">
                {pagina.pagina} / {pagina.totalPaginas}
              </span>

              <button
                onClick={() => navegar({ pagina: pagina.pagina + 1 })}
                disabled={pagina.pagina >= pagina.totalPaginas}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 border border-[var(--border)] text-[10px] uppercase tracking-widest text-[var(--foreground-secondary)] hover:border-[var(--gold)]/50 hover:text-[var(--gold)] transition-colors disabled:opacity-30 disabled:pointer-events-none"
              >
                Seguinte
                <ChevronRight size={12} />
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
