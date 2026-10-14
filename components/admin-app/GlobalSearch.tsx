"use client";

import { useState, useEffect, useRef } from "react";
import { Search, X, Loader2, ArrowRight, Clock } from "lucide-react";

interface SearchResult {
  category: string;
  icon: string;
  items: Array<{
    id: string;
    title: string;
    subtitle: string;
    type: string;
    link: string;
    timestamp: string;
  }>;
}

interface GlobalSearchProps {
  onNavigate?: (link: string) => void;
}

export default function GlobalSearch({ onNavigate }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [total, setTotal] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);

  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Carregar pesquisas recentes do localStorage
  useEffect(() => {
    const saved = localStorage.getItem("admin_recent_searches");
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved));
      } catch (e) {
        if (process.env.NODE_ENV === "development") console.error("[GlobalSearch]", e);
      }
    }
  }, []);

  // Fechar ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Atalho de teclado Ctrl+K ou Cmd+K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setShowResults(true);
      }

      // ESC para fechar
      if (e.key === "Escape") {
        setShowResults(false);
        inputRef.current?.blur();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Pesquisa com debounce
  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.trim().length < 2) {
      setResults([]);
      setTotal(0);
      setLoading(false);
      return;
    }

    setLoading(true);

    debounceRef.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/admin/search?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        setResults(data.results || []);
        setTotal(data.total || 0);
      } catch (error) {
        if (process.env.NODE_ENV === "development") console.error("[GlobalSearch]", error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query]);

  const handleResultClick = (item: { title: string; link: string }) => {
    // Adicionar às pesquisas recentes
    const newRecent = [item.title, ...recentSearches.filter((s) => s !== item.title)].slice(0, 5);
    setRecentSearches(newRecent);
    localStorage.setItem("admin_recent_searches", JSON.stringify(newRecent));

    // Navegar
    if (onNavigate) {
      onNavigate(item.link);
    }

    // Limpar
    setQuery("");
    setShowResults(false);
  };

  const handleRecentClick = (search: string) => {
    setQuery(search);
    inputRef.current?.focus();
  };

  const clearRecent = () => {
    setRecentSearches([]);
    localStorage.removeItem("admin_recent_searches");
  };

  return (
    <div ref={searchRef} className="relative w-full max-w-2xl">
      {/* Input de Pesquisa */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setShowResults(true)}
          placeholder="Pesquisar tudo... (Ctrl+K)"
          className="w-full bg-white/5 border border-white/10 pl-12 pr-12 py-3 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-[var(--gold)] focus:bg-white/10 transition-all"
        />

        {/* Loading ou Clear */}
        <div className="absolute right-4 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          ) : query ? (
            <button
              onClick={() => {
                setQuery("");
                setResults([]);
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          ) : (
            <kbd className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-gray-400">
              ⌘K
            </kbd>
          )}
        </div>
      </div>

      {/* Resultados */}
      {showResults && (
        <div className="absolute top-full mt-2 w-full bg-[var(--background-secondary)] border border-white/10 rounded-xl shadow-2xl max-h-[600px] overflow-y-auto z-50">
          {/* Sem query - Mostrar pesquisas recentes */}
          {!query && recentSearches.length > 0 && (
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  Pesquisas Recentes
                </h3>
                <button
                  onClick={clearRecent}
                  className="text-xs text-gray-500 hover:text-gray-300 transition-colors"
                >
                  Limpar
                </button>
              </div>
              <div className="space-y-1">
                {recentSearches.map((search, index) => (
                  <button
                    key={index}
                    onClick={() => handleRecentClick(search)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/5 text-white transition-colors flex items-center justify-between group"
                  >
                    <span className="text-sm">{search}</span>
                    <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-white transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Com query - Mostrar resultados */}
          {query && (
            <>
              {/* Header com total */}
              {total > 0 && (
                <div className="px-4 py-3 border-b border-white/5">
                  <p className="text-sm text-gray-400">
                    {total} {total === 1 ? "resultado encontrado" : "resultados encontrados"}
                  </p>
                </div>
              )}

              {/* Resultados por categoria */}
              {results.length > 0 ? (
                <div className="p-2">
                  {results.map((category, catIndex) => (
                    <div key={catIndex} className="mb-4 last:mb-0">
                      <h3 className="text-xs font-semibold text-gray-500 uppercase px-2 py-2 flex items-center gap-2">
                        <span>{category.icon}</span>
                        {category.category}
                      </h3>
                      <div className="space-y-1">
                        {category.items.map((item) => (
                          <button
                            key={item.id}
                            onClick={() => handleResultClick(item)}
                            className="w-full text-left px-3 py-3 rounded-lg hover:bg-white/5 transition-colors group"
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white mb-1 truncate">
                                  {item.title}
                                </p>
                                <p className="text-xs text-gray-400 truncate">{item.subtitle}</p>
                              </div>
                              <ArrowRight className="w-4 h-4 text-gray-500 group-hover:text-[var(--gold)] transition-colors flex-shrink-0 ml-2 mt-1" />
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : !loading && query.length >= 2 ? (
                <div className="p-8 text-center">
                  <Search className="w-12 h-12 text-gray-600 mx-auto mb-3" />
                  <p className="text-gray-400">
                    Nenhum resultado encontrado para {`\u201C${query}\u201D`}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Tenta pesquisar por nome, email, localização ou descrição
                  </p>
                </div>
              ) : loading ? (
                <div className="p-8 text-center">
                  <Loader2 className="w-12 h-12 text-[var(--gold)] mx-auto mb-3 animate-spin" />
                  <p className="text-gray-400">A pesquisar...</p>
                </div>
              ) : null}
            </>
          )}

          {/* Footer com dicas */}
          <div className="px-4 py-3 border-t border-white/5 bg-black/20">
            <div className="flex items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">↑</kbd>
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">↓</kbd>
                navegar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">↵</kbd>
                selecionar
              </span>
              <span className="flex items-center gap-1">
                <kbd className="px-1.5 py-0.5 bg-white/5 border border-white/10 rounded">ESC</kbd>
                fechar
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
