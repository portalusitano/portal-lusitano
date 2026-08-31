"use client";

import { useCallback, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Galeria da coudelaria. Só existe quando há fotografias **da coudelaria** —
 * nunca há aqui fotografia de stock.
 *
 * As miniaturas eram `role="tab"` sem `tabpanel` nenhum, o que faz o leitor
 * de ecrã anunciar separadores que não existem. São botões, e o escolhido
 * diz-se com `aria-current`.
 */
export default function Galeria({ fotos, nome }: { fotos: string[]; nome: string }) {
  const { t } = useLanguage();
  const [activa, setActiva] = useState(0);

  const anterior = useCallback(
    () => setActiva((i) => (i - 1 + fotos.length) % fotos.length),
    [fotos.length]
  );
  const seguinte = useCallback(() => setActiva((i) => (i + 1) % fotos.length), [fotos.length]);

  if (!fotos.length) return null;

  const legenda = (n: number) =>
    t.directorio.ficha.foto_de.replace("{n}", String(n)).replace("{total}", String(fotos.length));

  return (
    <div
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          anterior();
        }
        if (e.key === "ArrowRight") {
          e.preventDefault();
          seguinte();
        }
      }}
    >
      <div className="relative aspect-[3/2] overflow-hidden rounded-[var(--raio-lg)] border border-[var(--border-soft)] bg-[var(--background-card)]">
        <Image
          src={fotos[activa]}
          alt={`${nome} — ${legenda(activa + 1)}`}
          fill
          sizes="(max-width: 1024px) 100vw, 640px"
          className="object-cover"
        />
        {fotos.length > 1 && (
          <>
            <button
              type="button"
              onClick={anterior}
              aria-label={t.directorio.ficha.foto_anterior}
              className="absolute left-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]/70 text-[var(--foreground-strong)] backdrop-blur-sm transition-colors hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={seguinte}
              aria-label={t.directorio.ficha.foto_seguinte}
              className="absolute right-3 top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[var(--border)] bg-[var(--background)]/70 text-[var(--foreground-strong)] backdrop-blur-sm transition-colors hover:bg-[var(--background)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
            <p
              className="meta absolute bottom-3 right-3 rounded-full border border-[var(--border-soft)] bg-[var(--background)]/70 px-2.5 py-1 font-mono tabular-nums text-[var(--foreground-secondary)] backdrop-blur-sm"
              aria-live="polite"
            >
              {activa + 1} / {fotos.length}
            </p>
          </>
        )}
      </div>

      {fotos.length > 1 && (
        <ul className="mt-3 flex list-none gap-2 overflow-x-auto p-0 pb-1">
          {fotos.map((foto, i) => (
            <li key={foto} className="flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiva(i)}
                aria-label={t.directorio.ficha.ver_foto.replace("{n}", String(i + 1))}
                aria-current={activa === i}
                className={`relative block h-14 w-20 overflow-hidden rounded-[var(--raio-sm)] border transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)] ${
                  activa === i
                    ? "border-[var(--foreground-strong)] opacity-100"
                    : "border-[var(--border-soft)] opacity-55 hover:opacity-90"
                }`}
              >
                <Image
                  src={foto}
                  alt=""
                  fill
                  sizes="80px"
                  className="object-cover"
                  aria-hidden="true"
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
