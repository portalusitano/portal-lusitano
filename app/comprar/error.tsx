"use client";

import { useEffect } from "react";
import LocalizedLink from "@/components/LocalizedLink";
import { SUPPORT_EMAIL } from "@/lib/constants";

/**
 * A montra rebentou a desenhar-se.
 *
 * Tinha duas linhas, e a primeira era `"use client"` escrita duas vezes — a
 * segunda é uma string solta a meio de um módulo, inofensiva e sem sentido.
 * Reexportava o `app/error.tsx` do site: um ecrã inteiro com uma exclamação de
 * 220px e «Algo correu mal», que apaga a página e não diz o que falhou.
 *
 * Aqui sabe-se o que falhou — a lista de anúncios — e sabe-se o que continua a
 * funcionar. Por isso este ecrã cabe numa caixa, diz que é a montra e não o
 * site, e leva a três sítios que não dependem desta consulta. O `digest` fica,
 * porque é o que o suporte precisa para encontrar o erro nos registos.
 */
export default function ErroComprar({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      console.error("[/comprar]", error);
    } else {
      import("@sentry/nextjs").then((Sentry) => Sentry.captureException(error)).catch(() => {});
    }
  }, [error]);

  return (
    <section className="min-h-screen bg-[var(--background)] px-4 pt-24 pb-24 sm:px-6 sm:pt-32 md:px-12 lg:px-20">
      <div className="cartao mx-auto max-w-xl px-6 py-12 text-center" role="alert">
        <p className="rotulo mb-4 text-[var(--erro)]">Erro</p>
        <h1 className="titulo-seccao mb-3">A montra não conseguiu abrir.</h1>
        <p className="mx-auto mb-8 max-w-sm text-sm leading-relaxed text-[var(--foreground-secondary)]">
          Falhou a lista de anúncios, não o site. Volte a tentar — e se voltar a acontecer, o resto
          do Portal Lusitano continua a funcionar.
        </p>

        <div className="flex flex-wrap justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="btn btn-primario btn-sm rounded-full px-5"
          >
            Tentar de novo
          </button>
          <LocalizedLink href="/directorio" className="btn btn-subtil btn-sm">
            Ver coudelarias
          </LocalizedLink>
          <LocalizedLink href="/vender-cavalo" className="btn btn-subtil btn-sm">
            Anunciar cavalo
          </LocalizedLink>
        </div>

        {error.digest && (
          <p className="meta mt-8 border-t border-[var(--border-soft)] pt-6">
            Referência <span className="font-mono">{error.digest}</span> ·{" "}
            <a
              href={`mailto:${SUPPORT_EMAIL}`}
              className="text-[var(--foreground-strong)] underline underline-offset-4"
            >
              {SUPPORT_EMAIL}
            </a>
          </p>
        )}
      </div>
    </section>
  );
}
