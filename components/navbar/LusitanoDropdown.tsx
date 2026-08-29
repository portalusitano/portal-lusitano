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
        className="flex items-center gap-1 text-[11px] uppercase tracking-[0.2em] text-[var(--foreground-secondary)] hover:text-[var(--foreground)] transition-colors duration-300 py-2 cursor-pointer bg-transparent border-none"
      >
        Lusitano
        <ChevronDown
          size={14}
          className={`transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown Panel */}
      {open && (
        <div
          className="absolute top-full left-1/2 -translate-x-1/2 pt-3"
          style={{ zIndex: 9999 }}
          role="menu"
        >
          <div className="w-[90vw] sm:w-[480px] md:w-[560px] bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-5 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.8)]">
            {/* Secção: Base de Dados */}
            <span className="text-[9px] uppercase tracking-[0.25em] text-[var(--gold)] font-semibold block mb-3 px-3">
              {t.nav.database}
            </span>
            <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
              {dbItems.map((item) => (
                <LocalizedLink
                  key={item.href}
                  href={item.href}
                  className="dd-item"
                  role="menuitem"
                  onClick={() => setOpen(false)}
                >
                  <item.icon
                    size={16}
                    className={item.iconClass || "text-[var(--gold)] shrink-0"}
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-[var(--foreground)]">{item.label}</div>
                    <div className="text-[10px] text-[var(--foreground-muted)] leading-tight">
                      {item.desc}
                    </div>
                  </div>
                </LocalizedLink>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
