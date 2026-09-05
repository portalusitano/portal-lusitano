"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Search as SearchIcon, X, Loader2, Clock, ChevronRight } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";
import { useFocusTrap } from "@/hooks/useFocusTrap";

interface SearchResult {
  id: string;
  type: "horse" | "product" | "article" | "event" | "stud" | "page";
  title: string;
  description?: string;
  url: string;
  image?: string;
}

type FilterType = "all" | "horse" | "event" | "stud" | "page";

/**
 * Os destinos que a pesquisa mais devolve, oferecidos antes de se escrever.
 *
 * Nenhum texto aqui: as chaves apontam para o dicionário, porque este painel é
 * servido em três línguas e há um teste que proíbe literais no cromado
 * partilhado — e com razão, foi assim que o `ShareButtons` acabou a falar só
 * português para toda a gente.
 */
const ATALHOS = [
  { href: "/comprar", chave: { rotulo: "buy_horse" as const, selo: "horse" as const } },
  { href: "/directorio", chave: { rotulo: "studs" as const, selo: "stud" as const } },
  { href: "/mapa", chave: { rotulo: "map_studs" as const, selo: "stud" as const } },
  { href: "/vender-cavalo", chave: { rotulo: "sell_horse" as const, selo: "page" as const } },
];

const HISTORY_KEY = "portal-lusitano-search-history";
const MAX_HISTORY = 5;

function getSearchHistory(): string[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveSearchHistory(term: string) {
  const history = getSearchHistory().filter((h) => h !== term);
  history.unshift(term);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
}

export function SearchButton({ onClick }: { onClick: () => void }) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="p-2 hover:bg-[var(--surface-hover)] rounded-full transition-colors"
      aria-label={t.common.search}
    >
      <SearchIcon
        size={20}
        className="text-[var(--foreground-secondary)] hover:text-[var(--foreground)]"
      />
    </button>
  );
}

export function SearchModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const { t } = useLanguage();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [history, setHistory] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLUListElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useFocusTrap(modalRef, isOpen, onClose);

  // Type labels with translations
  const TYPE_LABELS = useMemo(
    () => ({
      horse: { label: t.search.type_labels.horse, badge: "C" },
      product: { label: t.search.type_labels.product, badge: "P" },
      article: { label: t.search.type_labels.article, badge: "A" },
      event: { label: t.search.type_labels.event, badge: "E" },
      stud: { label: t.search.type_labels.stud, badge: "S" },
      page: { label: t.search.type_labels.page, badge: "Pg" },
    }),
    [t]
  );

  // Filter tabs with translations
  const FILTER_TABS = useMemo(
    () => [
      { key: "all" as FilterType, label: t.search.filter_tabs.all },
      { key: "horse" as FilterType, label: t.search.filter_tabs.horses },
      { key: "event" as FilterType, label: t.search.filter_tabs.events },
      { key: "stud" as FilterType, label: t.search.filter_tabs.studs },
      { key: "page" as FilterType, label: t.search.filter_tabs.pages },
    ],
    [t]
  );

  // Load history on open
  useEffect(() => {
    if (isOpen) {
      setHistory(getSearchHistory());
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      // O Escape é tratado pelo useFocusTrap acima. Tratá-lo aqui também fazia
      // com que fechar o modal chamasse onClose duas vezes.
      if (e.key === "Escape") return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.min(prev + 1, results.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => Math.max(prev - 1, -1));
      } else if (e.key === "Enter" && selectedIndex >= 0 && results[selectedIndex]) {
        e.preventDefault();
        saveSearchHistory(query);
        handleResultClick();
        // Navigate via the link — find and click the focused item
        const items = resultsRef.current?.querySelectorAll("a");
        if (items?.[selectedIndex]) {
          items[selectedIndex].click();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose, results, selectedIndex, query]);

  // Scroll selected item into view
  useEffect(() => {
    if (selectedIndex >= 0 && resultsRef.current) {
      const items = resultsRef.current.querySelectorAll("li");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // Reset selected index on results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [results]);

  // Pesquisa com debounce - API real
  const performSearch = useCallback(async (searchQuery: string, filter: FilterType) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    // Abort any in-flight request before starting a new one
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setIsLoading(true);

    try {
      const typeParam = filter !== "all" ? `&type=${filter}` : "";
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(searchQuery)}&limit=15${typeParam}`,
        { signal: controller.signal }
      );
      if (res.ok) {
        const data = await res.json();
        setResults(data.results || []);
      } else {
        setResults([]);
      }
    } catch (err) {
      // Don't clear results if it was just an abort
      if (err instanceof DOMException && err.name === "AbortError") return;
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch(query, activeFilter);
    }, 300);

    return () => clearTimeout(timer);
  }, [query, activeFilter, performSearch]);

  const handleResultClick = () => {
    if (query.length >= 2) saveSearchHistory(query);
    setQuery("");
    setResults([]);
    setActiveFilter("all");
    onClose();
  };

  const handleHistoryClick = (term: string) => {
    setQuery(term);
  };

  if (!isOpen) return null;

  const showHistory = query.length < 2 && history.length > 0;

  return (
    <>
      {/* O pano é o mesmo do pedido de cookies — 64% de preto com 24px de
          desfoque. É o idioma de modal que o site já tem; um segundo, mais
          claro ou menos desfocado, leria-se como outra ideia. */}
      <div className="busca-pano fixed inset-0 z-50" onClick={onClose} aria-hidden="true" />

      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-label={t.search.aria_label}
        className="fixed top-20 left-1/2 z-50 w-full max-w-2xl -translate-x-1/2 px-4"
      >
        {/* `anim-crescer` com a origem no topo: a caixa nasce debaixo da lupa
            que a abriu, em vez de deslizar de um sítio que ninguém tocou. É a
            mesma animação dos dropdowns do site. */}
        <div className="busca-painel anim-crescer">
          {/* Input */}
          <div className="flex items-center gap-3 border-b border-[var(--border-soft)] px-5 py-4">
            <SearchIcon
              size={18}
              aria-hidden="true"
              className="flex-shrink-0 text-[var(--foreground-muted)]"
            />
            <input
              ref={inputRef}
              type="search"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-controls="search-results-list"
              aria-autocomplete="list"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.search.placeholder}
              className="busca-campo min-w-0 flex-1 text-lg"
            />
            {/* Estava sem `animate-spin`: era um ícone de espera imóvel, que é
                pior do que não haver ícone nenhum. Um carregador é a excepção
                aceite à regra dos ciclos, porque só existe enquanto se espera. */}
            {isLoading && (
              <Loader2
                size={18}
                aria-hidden="true"
                className="flex-shrink-0 animate-spin text-[var(--foreground-muted)]"
              />
            )}
            {query.length > 0 && !isLoading && (
              <button
                onClick={() => {
                  setQuery("");
                  inputRef.current?.focus();
                }}
                className="busca-icone"
                aria-label={t.search.clear}
              >
                <X size={16} aria-hidden="true" />
              </button>
            )}
            {/* Dois `X` lado a lado — um a limpar o texto, outro a fechar —
                diziam a mesma coisa e faziam coisas diferentes. O de fechar
                fica, e o de limpar só aparece quando há texto para limpar; os
                rótulos passam a distingui-los para quem não vê o ecrã. */}
            <button onClick={onClose} className="busca-icone" aria-label={t.common.close}>
              <X size={18} aria-hidden="true" />
            </button>
          </div>

          {/* Filter tabs */}
          {query.length >= 2 && (
            <div className="flex gap-1 px-4 py-2 border-b border-[var(--border)] overflow-x-auto">
              {FILTER_TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`px-4 py-2 text-xs rounded-full transition-colors whitespace-nowrap touch-manipulation ${
                    activeFilter === tab.key
                      ? "bg-[var(--elevate-1)] text-[var(--foreground-secondary)] border border-[var(--border-soft)]"
                      : "text-[var(--foreground-secondary)] hover:text-[var(--foreground)] hover:bg-[var(--surface-hover)] border border-transparent"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          )}

          {/* Resultados */}
          <div className="max-h-[60vh] overflow-y-auto" aria-live="polite" aria-atomic="false">
            {/* Search history */}
            {showHistory && (
              <div className="py-3">
                <p className="px-4 text-xs text-[var(--foreground-muted)] uppercase tracking-wider mb-2">
                  {t.search.recent_searches}
                </p>
                {history.map((term) => (
                  <button
                    key={term}
                    onClick={() => handleHistoryClick(term)}
                    className="flex items-center gap-3 w-full px-4 py-2 hover:bg-[var(--surface-hover)] transition-colors text-left"
                  >
                    <Clock size={14} className="text-[var(--foreground-muted)]" />
                    <span className="text-sm text-[var(--foreground-secondary)]">{term}</span>
                    <ChevronRight size={14} className="text-[var(--foreground-muted)] ml-auto" />
                  </button>
                ))}
              </div>
            )}

            {/* Results */}
            {results.length > 0 ? (
              <ul ref={resultsRef} id="search-results-list" role="listbox" className="py-2">
                {results.map((result, index) => {
                  const typeInfo = TYPE_LABELS[result.type] || TYPE_LABELS.page;
                  return (
                    <li key={result.id}>
                      <LocalizedLink
                        href={result.url}
                        onClick={handleResultClick}
                        // A escolhida distingue-se pelo fundo e pelo texto a
                        // branco. O risco à esquerda que aqui estava era uma
                        // aresta direita dentro de um painel de cantos
                        // redondos, e ainda empurrava o conteúdo dois pixéis.
                        className={`linha-busca ${index === selectedIndex ? "linha-busca--activa" : ""}`}
                        style={{ "--ordem": Math.min(index, 9) } as React.CSSProperties}
                      >
                        <div className="w-8 h-8 rounded bg-[var(--elevate-1)] flex items-center justify-center flex-shrink-0">
                          <span className="rotulo">{typeInfo.badge}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[var(--foreground)] font-medium truncate">
                            {result.title}
                          </p>
                          {result.description && (
                            <p className="text-sm text-[var(--foreground-muted)] line-clamp-1">
                              {result.description}
                            </p>
                          )}
                        </div>
                        <span className="text-xs text-[var(--foreground-secondary)] uppercase tracking-wider flex-shrink-0">
                          {typeInfo.label}
                        </span>
                      </LocalizedLink>
                    </li>
                  );
                })}
              </ul>
            ) : query.length >= 2 && !isLoading ? (
              <div className="py-12 text-center">
                <p className="text-[var(--foreground-muted)]">{t.search.no_results}</p>
                {activeFilter !== "all" && (
                  <button
                    onClick={() => setActiveFilter("all")}
                    className="mt-2 text-sm text-[var(--foreground-strong)] underline decoration-[var(--border)] underline-offset-2 hover:decoration-[var(--border-hover)]"
                  >
                    {t.search.search_all}
                  </button>
                )}
              </div>
            ) : query.length < 2 ? (
              /* O ecrã que se vê primeiro era uma parede a dizer «escreva
                 mais». É verdade e não serve para nada: quem abriu a pesquisa
                 já sabe que tem de escrever. Enquanto não há o que procurar,
                 este espaço oferece os quatro destinos que a pesquisa mais
                 devolve — e assim a caixa resolve o pedido de metade das
                 pessoas sem uma única tecla. */
              <div className="py-3">
                <p className="rotulo px-5 pb-2">{t.search.suggestions}</p>
                {ATALHOS.map(({ href, chave }, i) => (
                  <LocalizedLink
                    key={href}
                    href={href}
                    onClick={handleResultClick}
                    className="linha-busca"
                    style={{ "--ordem": i } as React.CSSProperties}
                  >
                    {/* Sem selo. «CAVALO · Encontrar cavalo» diz duas vezes a
                        mesma coisa, e três selos de larguras diferentes
                        desalinhavam os três títulos — o olho lê uma coluna
                        torta antes de ler as palavras. */}
                    <span className="linha-busca__titulo min-w-0 flex-1 truncate">
                      {t.nav[chave.rotulo]}
                    </span>
                    <ChevronRight
                      size={14}
                      aria-hidden="true"
                      className="flex-shrink-0 text-[var(--foreground-muted)]"
                    />
                  </LocalizedLink>
                ))}
                <p className="meta px-5 pt-3">{t.search.min_chars}</p>
              </div>
            ) : null}
          </div>

          {/* Atalhos */}
          <div className="flex items-center gap-4 border-t border-[var(--border-soft)] px-5 py-3 text-xs text-[var(--foreground-secondary)]">
            <span className="flex items-center gap-1">
              <kbd className="tecla">ESC</kbd>
              {t.common.close}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="tecla">↑↓</kbd>
              {t.search.navigate}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="tecla">↵</kbd>
              {t.search.open}
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
