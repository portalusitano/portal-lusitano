import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import RodapeEntrada from "@/components/auth/RodapeEntrada";
import "./auth.css";

export const metadata: Metadata = {
  title: "Autenticação",
  description:
    "Aceda à sua conta no Portal Lusitano — o maior portal de cavalos Lusitanos em Portugal.",
  robots: { index: false, follow: false },
};

/*
 * Entrada no portal.
 *
 * O que aqui estava era um painel de ornamentos: um gradiente dourado
 * animado que sobre preto dava castanho sujo, uma grelha, diagonais, duas
 * bolas desfocadas a flutuar, um cavalo desenhado à mão e três números
 * inventados («10K+ cavalos analisados»). Com a barra do site por cima,
 * ficavam duas marcas no mesmo ecrã e o formulário perdido num vazio.
 *
 * Fica uma coluna só, centrada, sobre preto: a marca, o cartão assinatura
 * do site — com a costura de luz no topo e as laterais dissolvidas — e mais
 * nada. É o mesmo desenho da página inicial, que é o que se pretende de um
 * ecrã de entrada: reconhecer-se o sítio ao primeiro olhar.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      {/* O mesmo halo ténue que abre a página inicial. Nada de dourado: sobre
          preto, um gradiente quente a 25% lê-se como castanho. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 70% 45% at 50% 0%, var(--elevate-1), transparent 70%)",
        }}
      />

      <div className="relative z-10 w-full max-w-[420px]">
        <Link
          href="/"
          className="animate-auth-fadeInUp mb-10 flex flex-col items-center gap-3"
          aria-label="Portal Lusitano — página inicial"
        >
          <Image src="/logo.webp" alt="" width={40} height={40} className="h-10 w-10" priority />
          <span className="rotulo-forte">Portal Lusitano</span>
        </Link>

        <div className="cartao-seco animate-auth-fadeInUp auth-stagger-2 bg-[var(--background-card)]">
          <div className="cartao-seco__costura" />
          <div className="cartao-seco__esbatido" />
          <div className="relative z-10 px-6 py-8 sm:px-8">{children}</div>
        </div>

        <RodapeEntrada />
      </div>
    </div>
  );
}
