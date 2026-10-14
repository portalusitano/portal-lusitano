"use client";

import { Star } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";

/**
 * Fila de estrelas.
 *
 * A versão anterior pintava as cheias e as vazias exactamente com a mesma
 * classe (`text-[var(--foreground-muted)]` nos dois ramos do ternário): cinco
 * estrelas iguais, sempre, fosse a avaliação 1 ou 5. Aqui a cheia é branca e
 * preenchida, a vazia é ténue e oca — a diferença lê-se de relance e não
 * gasta o dourado.
 */
export default function Estrelas({
  valor,
  tamanho = 14,
  max = 5,
}: {
  valor: number;
  tamanho?: number;
  max?: number;
}) {
  const { t } = useLanguage();
  const cheias = Math.round(valor);

  return (
    <span
      className="inline-flex items-center gap-0.5"
      role="img"
      aria-label={t.directorio.ficha.estrelas.replace("{n}", String(valor))}
    >
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={tamanho}
          aria-hidden="true"
          className={
            i < cheias ? "text-[var(--foreground-strong)]" : "text-[var(--foreground-muted)]"
          }
          fill={i < cheias ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}
