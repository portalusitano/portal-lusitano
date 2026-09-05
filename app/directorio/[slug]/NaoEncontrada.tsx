"use client";

import { ArrowLeft } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import { useLanguage } from "@/context/LanguageContext";

/**
 * O que se vê quando o slug não existe.
 *
 * Era uma página inteiramente em português com um alfinete de mapa de 80px e
 * uma lista de três sugestões genéricas («Verifique se o endereço está
 * correto»). Quem chega aqui vem de um link partilhado que morreu; o que lhe
 * serve é voltar ao directório num clique, na sua língua.
 */
export default function NaoEncontrada() {
  const { t } = useLanguage();
  const f = t.directorio.ficha;

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-6 py-24">
      <div className="w-full max-w-lg">
        <p className="rotulo mb-3">404</p>
        <h1 className="titulo-gradiente mb-3 text-3xl leading-tight sm:text-4xl">
          {f.nao_encontrada_titulo}
        </h1>
        <p className="mb-8 leading-relaxed text-[var(--foreground-secondary)]">
          {f.nao_encontrada_texto}
        </p>
        <div className="flex flex-wrap gap-3">
          <LocalizedLink href="/directorio" className="btn btn-primario">
            <ArrowLeft size={15} aria-hidden="true" />
            {f.nao_encontrada_directorio}
          </LocalizedLink>
          <LocalizedLink href="/" className="btn btn-secundario">
            {f.nao_encontrada_inicio}
          </LocalizedLink>
        </div>
      </div>
    </div>
  );
}
