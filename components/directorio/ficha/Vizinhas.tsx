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
          <p className="meta">{f.vizinhas_nota}</p>
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

      <ul className="m-0 grid list-none gap-3 p-0 sm:grid-cols-2 lg:grid-cols-3">
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
                      entre os três cartões, e em mono alinha em coluna. */}
                  <span className="meta flex min-w-0 items-center gap-1.5">
                    <span className="flex-shrink-0 font-mono tabular-nums text-[var(--foreground-secondary)]">
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
