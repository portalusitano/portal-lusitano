"use client";

import Image from "next/image";
import { ArrowRight, MapPin } from "lucide-react";
import LocalizedLink from "@/components/LocalizedLink";
import Revelar, { atrasoEmGrelha } from "@/components/Revelar";
import { useLanguage } from "@/context/LanguageContext";
import { kmLegivel } from "@/lib/coudelaria-ficha";
import { iniciaisDe } from "@/lib/directorio-capas";

export interface Vizinha {
  slug: string;
  nome: string;
  localizacao?: string | null;
  regiao?: string | null;
  /** Quilómetros em linha recta até à coudelaria da ficha. */
  km: number;
  capa: string | null;
}

/**
 * As coudelarias mais próximas desta.
 *
 * A ficha acabava no rodapé. Quem chegou aqui do globo ou de um directório
 * filtrado e concluiu «esta não é» tinha de voltar atrás no browser e perder
 * o que já tinha escolhido; e quem concluiu «esta é» não ficava a saber que
 * havia mais três à mesma distância de casa — o que muda a conta a quem está
 * a decidir se faz a viagem.
 *
 * O número é medido, não estimado: sai das coordenadas que as vinte e nove
 * têm todas. E escreve-se **em linha recta**, porque é isso que ele é — a
 * estrada entre duas coudelarias do Ribatejo pode ser metade outra vez mais
 * longa, e um número apresentado como distância de viagem seria mais uma
 * afirmação que os dados não sustentam.
 *
 * O último cartão não é uma coudelaria: é a saída para o directório já
 * filtrado pela região desta. Quem quer a quarta encontra-a onde as outras
 * estão todas.
 */
export default function Vizinhas({ vizinhas, regiao }: { vizinhas: Vizinha[]; regiao?: string }) {
  const { t, language } = useLanguage();
  const f = t.directorio.ficha;
  const locale = language === "en" ? "en-GB" : language === "es" ? "es-ES" : "pt-PT";

  if (!vizinhas.length) return null;

  return (
    <section aria-labelledby="t-vizinhas" className="mt-14 sm:mt-20">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          <h2 id="t-vizinhas" className="titulo-pagina mb-1">
            {f.vizinhas_titulo}
          </h2>
          {/* Esta frase não é uma legenda: é o que impede o número de mentir.
              Medidas as 87 distâncias que as 29 fichas escrevem, **17 passam
              dos 50 km e duas dizem 121 e 129 km** — e sob um título que
              promete «mais próximas» só esta linha explica que o número é uma
              recta entre coordenadas e não um caminho. Em `.meta` lia-se a
              **3,66:1** nos pixéis, abaixo do mínimo de 4,5 para texto que se
              lê; com a tinta secundária, **8,37:1**. Uma ressalva que não se lê
              é uma ressalva que não existe, e sem ela o que fica no ecrã é a
              promessa do título. */}
          <p className="fc-nota">{f.vizinhas_nota}</p>
        </div>
        {regiao && (
          <LocalizedLink
            href={`/directorio?regiao=${encodeURIComponent(regiao)}`}
            className="btn btn-subtil btn-sm"
          >
            {f.vizinhas_ver_regiao.replace("{regiao}", regiao)}
            <ArrowRight size={14} aria-hidden="true" />
          </LocalizedLink>
        )}
      </div>

      {/* ── `grid-cols-1` não é decoração: é o que impede o cartão de sair do
          ecrã ───────────────────────────────────────────────────────────────
          Sem ele a grelha não declara coluna nenhuma abaixo dos `sm`, e a
          coluna implícita é uma faixa `auto`. Um item de grelha em faixa `auto`
          leva `min-width: auto`, ou seja **não encolhe abaixo do seu
          min-content** — e o min-content deste cartão é a fotografia de 96px
          mais a palavra mais longa da morada, que em «Monte Mayor, EN 114 Km
          145.5, 7050-…» dá 493px dentro de um contentor de 358.

          Medido a 390×780 nas 29 do banco de ensaio: **18 fichas e 54 dos 87
          cartões passavam da borda direita do ecrã, até 187px.** E não havia
          barra de deslocamento a denunciá-lo, porque o `overflow-x: clip` que a
          ficha põe no `body` — pela boa razão de fazer o `sticky` prender —
          corta o que passa **sem deixar deslocar**: a morada acabava cortada a
          meio de uma palavra na borda do vidro, sem reticências, como se a
          página estivesse partida. O `truncate` que este cartão já tinha nunca
          podia disparar, porque a caixa que ele havia de encher já era maior do
          que o ecrã.

          Os `sm:grid-cols-2` e `lg:grid-cols-3` nunca tiveram o problema, e
          isso é a assinatura da causa: o Tailwind escreve-os
          `repeat(n, minmax(0, 1fr))`, e esse `0` é exactamente o mínimo que
          faltava. O telemóvel era a única vista sem uma dessas classes. Medido
          depois: **0 fichas e 0 cartões**, nas duas vistas, com a morada a
          acabar em reticências como estava escrito. */}
      <ul className="m-0 grid list-none grid-cols-1 gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
        {vizinhas.map((v, i) => (
          <li key={v.slug}>
            <Revelar atraso={atrasoEmGrelha(i)}>
              <LocalizedLink
                href={`/directorio/${v.slug}`}
                className="cartao cartao-interactivo group flex h-full items-stretch gap-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--gold)]"
              >
                <span className="relative block w-24 flex-shrink-0 self-stretch overflow-hidden bg-[var(--elevate-1)] sm:w-28">
                  {v.capa ? (
                    <Image
                      src={v.capa}
                      alt=""
                      fill
                      sizes="112px"
                      className="object-cover"
                      aria-hidden="true"
                    />
                  ) : (
                    /* Sem fotografia não se empresta uma: as iniciais são a
                       mesma chapa que o cartão da listagem desenha. */
                    <span
                      className="flex h-full w-full items-center justify-center font-mono text-sm tracking-widest text-[var(--foreground-muted)]"
                      aria-hidden="true"
                    >
                      {iniciaisDe(v.nome)}
                    </span>
                  )}
                </span>
                <span className="flex min-w-0 flex-1 flex-col justify-center gap-1 p-3.5">
                  {/* Duas linhas para o nome, e não uma que corta: metade
                      destas coudelarias chama-se «Coudelaria …» e num cartão
                      de 250px o que sobrava do outro lado das reticências era
                      justamente o que as distingue. */}
                  <span className="titulo-seccao line-clamp-2 text-[var(--foreground-strong)]">
                    {v.nome}
                  </span>
                  {/* A distância à frente do sítio: é o número que se compara
                      entre os três cartões, e em mono alinha em coluna.

                      A linha toda escreve-se com a tinta secundária e não com
                      a `.meta`: metade dela já era secundária — o número — e a
                      outra metade, a terra, lia-se a **3,45:1** contra os
                      **7,89:1** do número, na mesma linha e no mesmo papel.
                      Num cartão que tem três coisas escritas, a terra é a que
                      responde a «onde», que é a pergunta desta secção; e até
                      agora nem se via, porque em 54 dos 87 cartões a caixa saía
                      do ecrã (ver a grelha, acima). */}
                  <span className="fc-nota flex min-w-0 items-center gap-1.5">
                    <span className="flex-shrink-0 font-mono tabular-nums">
                      {f.vizinhas_km.replace("{km}", kmLegivel(v.km, locale))}
                    </span>
                    {v.localizacao && (
                      <>
                        <MapPin size={11} aria-hidden="true" className="flex-shrink-0" />
                        <span className="truncate">{v.localizacao}</span>
                      </>
                    )}
                  </span>
                </span>
              </LocalizedLink>
            </Revelar>
          </li>
        ))}
      </ul>
    </section>
  );
}
