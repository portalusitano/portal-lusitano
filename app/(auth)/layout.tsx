import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import RodapeEntrada from "@/components/auth/RodapeEntrada";
import TransicaoAuth from "@/components/auth/TransicaoAuth";
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
 *
 * As medidas verticais são um orçamento, não um gosto. Em 1280×900 a página
 * media 950px: cinquenta pixéis de rolo para conteúdo que cabia, e por causa
 * deles a navegação aterrava a meio em vez de aterrar no topo. Uma página de
 * entrada que não cabe no ecrã é a primeira coisa que o sítio faz mal à
 * frente de quem ainda está a decidir se confia nele. O que se cortou foi
 * espaço vazio — `py-16` para `py-10`, a distância da marca ao cartão e a
 * distância da citação ao resto —; a ferradura, essa, cresceu.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center px-5 py-10">
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
        {/* A ferradura era de 40px com o nome do mesmo tamanho por baixo: a
            marca do sítio lia-se como um ícone de barra de ferramentas. Passa
            a 56px, que é o tamanho a que o desenho se vê, e o nome desce para
            `.rotulo` — a marca é a ferradura, e a palavra é a legenda dela.
            Este é o único dourado da página, e é o que o CLAUDE.md lhe
            reserva. */}
        <Link
          href="/"
          className="animate-auth-fadeInUp mb-7 flex flex-col items-center gap-2.5"
          aria-label="Portal Lusitano"
        >
          <Image src="/logo.webp" alt="" width={56} height={56} className="h-14 w-14" priority />
          <span className="rotulo">Portal Lusitano</span>
        </Link>

        <div className="cartao-seco animate-auth-fadeInUp auth-stagger-2 bg-[var(--background-card)]">
          <div className="cartao-seco__costura" />
          <div className="cartao-seco__esbatido" />
          {/* O palco e a folha são escritos aqui, pelo servidor, e o
              `<TransicaoAuth>` é um irmão que não desenha nada: encontra-as
              e anima-as. A razão de o `children` não ir dentro de um
              componente de cliente está escrita nesse ficheiro, e não é a
              velocidade — é o observador do conteúdo, que com um nó novo por
              navegação mentia. Sem JavaScript ficam duas `<div>` à volta do
              formulário, e mais nada. */}
          <div className="relative z-10 px-6 py-7 sm:px-8">
            <div className="palco-auth" data-palco-auth>
              <div className="palco-auth__folha" data-palco-folha>
                {children}
              </div>
            </div>
            <TransicaoAuth />
          </div>
        </div>

        <RodapeEntrada />
      </div>
    </div>
  );
}
