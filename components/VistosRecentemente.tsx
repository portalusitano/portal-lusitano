"use client";

import { useEffect, useState } from "react";
import { History, X } from "lucide-react";
import HorseCard from "@/components/HorseCard";
import { lerVistos, limparVistos, excepto, type CavaloVisto } from "@/lib/vistos-recentemente";

interface VistosRecentementeProps {
  /** Anúncio que está aberto neste momento — não faz sentido sugeri-lo a si próprio. */
  excluirId?: string;
  /** Quantos cartões mostrar (o histórico guarda mais do que isto). */
  limite?: number;
  /** Classes da grelha — a ficha do anúncio é estreita e pede menos colunas. */
  gridClassName?: string;
  className?: string;
}

/**
 * Faixa "Vistos recentemente" alimentada pelo histórico local do browser.
 *
 * Só aparece depois de montar: o histórico vive no localStorage e desenhá-lo
 * no servidor daria sempre um desencontro de hidratação.
 */
export default function VistosRecentemente({
  excluirId,
  limite = 6,
  gridClassName = "grid-cols-2 sm:grid-cols-3 lg:grid-cols-6",
  className = "",
}: VistosRecentementeProps) {
  const [vistos, setVistos] = useState<CavaloVisto[] | null>(null);

  useEffect(() => {
    setVistos(excepto(lerVistos(), excluirId));
  }, [excluirId]);

  if (!vistos || vistos.length === 0) return null;

  const visiveis = vistos.slice(0, limite);

  return (
    <section aria-labelledby="vistos-recentemente-heading" className={className}>
      <div className="flex items-center justify-between gap-4 mb-6">
        <h2
          id="vistos-recentemente-heading"
          className="flex items-center gap-2 text-[var(--gold)] uppercase tracking-[0.35em] text-[10px] font-bold"
        >
          <History size={13} aria-hidden="true" />
          Vistos recentemente
        </h2>
        <button
          type="button"
          onClick={() => {
            limparVistos();
            setVistos([]);
          }}
          className="inline-flex items-center gap-1 text-[9px] uppercase tracking-widest text-[var(--foreground-muted)] hover:text-[var(--foreground)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
        >
          <X size={11} aria-hidden="true" />
          Limpar
        </button>
      </div>

      <div className={`grid ${gridClassName} gap-3 sm:gap-4`}>
        {visiveis.map((cavalo) => (
          <HorseCard
            key={cavalo.id}
            horse={{
              id: cavalo.id,
              nome_cavalo: cavalo.nome,
              preco: cavalo.preco ?? 0,
              image_url: cavalo.imagem ?? undefined,
              localizacao: cavalo.localizacao ?? undefined,
            }}
            href={`/comprar/${cavalo.id}`}
            compact
            priority={false}
          />
        ))}
      </div>
    </section>
  );
}
