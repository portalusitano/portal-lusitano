"use client";

import Link from "next/link";
import { useLanguage } from "@/context/LanguageContext";

/**
 * O pé do ecrã de entrada.
 *
 * Estava escrito no `layout`, que é um componente de servidor e por isso não
 * sabe o idioma escolhido: numa página em inglês ficava «Voltar ao portal»
 * em português, ao lado de «Sign In». Agora o texto vem todo do dicionário —
 * um `tr()` dentro do componente é a mesma dívida com outro nome, porque
 * escreve as três línguas no meio do JSX e deixa de fora quem só olha para
 * os `locales/`.
 *
 * A citação estava a `mt-14` do botão, que por sua vez estava a `mt-8` do
 * cartão: noventa pixéis de preto entre o formulário e ela. Solta a essa
 * distância não se lia como o remate da página, lia-se como uma coisa que
 * ficou para trás. Encosta-se ao resto e baixa de peso — o que ali importa é
 * o formulário, e a frase é o que fica a dizer de quem é o sítio.
 */
export default function RodapeEntrada() {
  const { t } = useLanguage();

  return (
    <>
      <div className="animate-auth-fadeInUp auth-stagger-4 mt-6 flex justify-center">
        <Link href="/" className="btn btn-subtil btn-sm rounded-full">
          ← {t.auth.back_to_portal}
        </Link>
      </div>

      <blockquote className="animate-auth-fadeInUp auth-stagger-6 mt-8 text-center">
        <p className="text-xs italic leading-relaxed text-[var(--foreground-muted)]">
          {t.auth.quote}
        </p>
        <footer className="meta mt-1.5 block">{t.auth.quote_author}</footer>
      </blockquote>
    </>
  );
}
