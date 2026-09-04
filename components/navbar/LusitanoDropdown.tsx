"use client";

import LocalizedLink from "@/components/LocalizedLink";
import { ChevronDown } from "lucide-react";
import { useMemo, useState, useRef, useEffect, useCallback } from "react";
import { useLanguage } from "@/context/LanguageContext";
import { getDbItems } from "./navData";

export function LusitanoDropdown() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const dbItems = useMemo(() => getDbItems(t.nav), [t]);

  // Close on Escape
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") setOpen(false);
  }, []);

  // Close on click outside
  useEffect(() => {
    if (!open) return;
    document.addEventListener("keydown", handleKeyDown);
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [open, handleKeyDown]);

  return (
    <div
      className="group/dd relative"
      ref={containerRef}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="true"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-[2px] text-sm font-medium text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors duration-150 py-1 cursor-pointer bg-transparent border-none"
      >
        Lusitano
        <ChevronDown
          size={14}
          className={`transition-transform duration-150 ease-in ${open ? "translate-y-0.5 rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 pt-3"
          style={{ zIndex: 9999 }}
          role="menu"
        >
          <div className="anim-crescer w-[90vw] rounded-3xl border border-[var(--border-soft)] bg-[var(--background-elevated)] p-2 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)] sm:w-[480px] md:w-[560px]">
            {/* Só palavras. Quatro ícones dourados lado a lado gastavam o
                acento e não diziam nada que o nome do destino não dissesse —
                a descrição por baixo faz esse trabalho melhor.

                E não há rótulo por cima. Dizia «Base de Dados» sobre quatro
                entradas que já se nomeiam a si próprias, e um cabeçalho que
                classifica uma lista de quatro é uma linha a mais: quem abriu
                este menu já sabe onde carregou. */}
            <div className="grupo-nav grid grid-cols-1 gap-x-4 gap-y-1 px-0 pt-1 sm:grid-cols-2">
              {dbItems.map((item) => (
                <LocalizedLink
                  key={item.href}
                  href={item.href}
                  className="ligacao-nav rounded-2xl px-3 py-2.5 transition-colors hover:bg-[var(--elevate-1)]"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <span className="block text-sm text-[var(--foreground-strong)]">
                    {item.label}
                  </span>
                  <span className="meta mt-0.5 block leading-snug">{item.desc}</span>
                </LocalizedLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
