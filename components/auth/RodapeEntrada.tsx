"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";
import { createTranslator } from "@/lib/tr";

/**
 * O pé do ecrã de entrada.
 *
 * Estava escrito no `layout`, que é um componente de servidor e por isso não
 * sabe o idioma escolhido: numa página em inglês ficava «Voltar ao portal»
 * em português, ao lado de «Sign In».
 */
export default function RodapeEntrada() {
  const { language } = useLanguage();
  const tr = createTranslator(language);

  return (
    <>
      <div className="animate-auth-fadeInUp auth-stagger-4 mt-8 flex justify-center">
        <Link href="/" className="btn btn-subtil btn-sm rounded-full">
          ← {tr("Voltar ao portal", "Back to the portal", "Volver al portal")}
        </Link>
      </div>

      <blockquote className="animate-auth-fadeInUp auth-stagger-6 mt-14 text-center">
        <p className="text-sm italic leading-relaxed text-[var(--foreground-muted)]">
          {tr(
            "“A equitação é a arte de esconder a arte.”",
            "“Riding is the art of concealing art.”",
            "“La equitación es el arte de esconder el arte.”"
          )}
        </p>
        <footer className="rotulo mt-2 block">Mestre Nuno Oliveira</footer>
      </blockquote>
    </>
  );
}
