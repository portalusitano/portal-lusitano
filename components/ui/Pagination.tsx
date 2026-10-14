"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
}

export default function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className = "",
}: PaginationProps) {
  // Não mostrar paginação se houver apenas 1 página
  if (totalPages <= 1) return null;

  // Calcular páginas a mostrar (máximo 7: 1 ... 4 5 6 ... 10)
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];

    if (totalPages <= 7) {
      // Mostrar todas as páginas se forem 7 ou menos
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Sempre mostrar primeira página
      pages.push(1);

      if (currentPage <= 3) {
        // Início: 1 2 3 4 ... 10
        for (let i = 2; i <= 4; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        // Fim: 1 ... 7 8 9 10
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Meio: 1 ... 4 5 6 ... 10
        pages.push("...");
        pages.push(currentPage - 1);
        pages.push(currentPage);
        pages.push(currentPage + 1);
        pages.push("...");
        pages.push(totalPages);
      }
    }

    return pages;
  };

  const pageNumbers = getPageNumbers();

  return (
    <div className={`flex items-center justify-center gap-2 ${className}`}>
      {/* Botão Anterior */}
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage === 1}
        className="p-2 border border-[var(--border)] bg-[var(--background-secondary)]/50 text-[var(--foreground)] hover:bg-[var(--foreground-strong)] hover:border-[var(--foreground-strong)] hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--background-secondary)]/50 disabled:hover:text-[var(--foreground)] disabled:hover:border-[var(--border)]"
        aria-label="Página anterior"
      >
        <ChevronLeft size={20} />
      </button>

      {/* Números de página */}
      <div className="flex items-center gap-1">
        {pageNumbers.map((page, index) => {
          if (page === "...") {
            return (
              <span key={`ellipsis-${index}`} className="px-3 py-2 text-[var(--foreground-muted)]">
                ...
              </span>
            );
          }

          const pageNum = page as number;
          const isActive = pageNum === currentPage;

          return (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`min-w-[40px] px-3 py-2 border transition-all ${
                isActive
                  ? "bg-[var(--foreground-strong)] border-[var(--foreground-strong)] text-black font-bold"
                  : "border-[var(--border)] bg-[var(--background-secondary)]/50 text-[var(--foreground)] hover:bg-[var(--elevate-1)] hover:border-[var(--border-hover)]"
              }`}
              aria-label={`Página ${pageNum}`}
              aria-current={isActive ? "page" : undefined}
            >
              {pageNum}
            </button>
          );
        })}
      </div>

      {/* Botão Próximo */}
      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage === totalPages}
        className="p-2 border border-[var(--border)] bg-[var(--background-secondary)]/50 text-[var(--foreground)] hover:bg-[var(--foreground-strong)] hover:border-[var(--foreground-strong)] hover:text-black transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--background-secondary)]/50 disabled:hover:text-[var(--foreground)] disabled:hover:border-[var(--border)]"
        aria-label="Próxima página"
      >
        <ChevronRight size={20} />
      </button>
    </div>
  );
}
