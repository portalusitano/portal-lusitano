"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { ExternalLink, Loader2, Map as IconeMapa, Navigation } from "lucide-react";
import { useLanguage } from "@/context/LanguageContext";
import type { CoudelariaFicha } from "@/lib/coudelaria-ficha";

const GloboMapa = dynamic(() => import("@/components/GloboMapa"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center">
      <Loader2 className="animate-spin text-[var(--foreground-muted)]" size={22} />
    </div>
  ),
});

/**
 * «Onde fica», e o mapa só a pedido.
 *
 * Medido nesta ficha, quando o mapa era o do MapLibre: 1 621 402 bytes num
 * painel de 220px que ninguém pediu, em todas as fichas, também no telemóvel.
 * O motor mudou e agora são 180KB, mas o botão fica: um mapa que ninguém
 * pediu continua a não valer o que custa. Quem quer chegar lá usa o «Como
 * chegar», que abre a aplicação de mapas do próprio telefone com a rota
 * feita; quem quer ver onde é carrega no botão e aí sim paga o mapa.
 */
export default function MapaDaCoudelaria({
  coudelaria,
  capa,
  direccoes,
  sitio,
}: {
  coudelaria: CoudelariaFicha;
  capa: string | null;
  direccoes: string;
  sitio: string;
}) {
  const { t } = useLanguage();
  const f = t.directorio.ficha;
  const [montado, setMontado] = useState(false);

  /* Uma coudelaria só, mas numa lista memorizada: escrita à mão no JSX era um
     array novo a cada renderização do pai, e o globo lia-a como dados novos —
     voltava a enquadrar-se e a repetir o voo de entrada. */
  const noMapa = useMemo(
    () => [
      {
        id: coudelaria.id,
        nome: coudelaria.nome,
        slug: coudelaria.slug,
        descricao: coudelaria.descricao || "",
        localizacao: coudelaria.localizacao || "",
        regiao: coudelaria.regiao || "",
        foto_capa: capa || undefined,
        is_pro: Boolean(coudelaria.is_pro),
        destaque: Boolean(coudelaria.destaque),
        coordenadas_lat: coudelaria.coordenadas_lat ?? undefined,
        coordenadas_lng: coudelaria.coordenadas_lng ?? undefined,
      },
    ],
    [coudelaria, capa]
  );

  const coordenadas =
    typeof coudelaria.coordenadas_lat === "number" && typeof coudelaria.coordenadas_lng === "number"
      ? ([coudelaria.coordenadas_lat, coudelaria.coordenadas_lng] as [number, number])
      : null;

  /* As coordenadas em cru saíram daqui.
   *
   * Estavam em 29 das 29 fichas — «39.2218, -7.6576» a 12px por baixo dos
   * botões — e medidas nos pixéis dão **3,45:1** de contraste, abaixo do
   * mínimo de 4,5:1. Mas o problema não é o contraste: é para quem aquilo é.
   * Quem quer lá chegar tem o «Como chegar», que abre a aplicação de mapas do
   * telefone com a rota feita; quem quer ver onde é tem o «Ver mapa». Um par
   * de números que ninguém copia à mão, ilegível, repetido nas vinte e nove —
   * o número continua no `flyTo` e no `hrefDireccoes`, que é onde ele
   * trabalha. Se algum dia se provar que alguém os quer, a forma honesta é um
   * botão que os copia, não texto cinzento. */
  return (
    <section className="cartao overflow-hidden" aria-labelledby="t-mapa">
      <div className="px-4 pt-4 sm:px-5">
        <h2 id="t-mapa" className="titulo-seccao mb-1">
          {f.onde_fica}
        </h2>
        {sitio && <p className="meta mb-3">{sitio}</p>}
      </div>

      {montado ? (
        <div className="relative z-0 h-[220px] border-t border-[var(--border-soft)]">
          <GloboMapa flyTo={coordenadas} coudelarias={noMapa} />
        </div>
      ) : (
        <div className="px-4 pb-4 sm:px-5 sm:pb-5">
          <div className="flex flex-col gap-2">
            <a
              href={direccoes}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-secundario w-full justify-start"
            >
              <Navigation size={15} aria-hidden="true" />
              {f.como_chegar}
              <ExternalLink size={12} aria-hidden="true" className="flex-shrink-0" />
            </a>
            <button
              type="button"
              onClick={() => setMontado(true)}
              className="btn btn-subtil w-full justify-start"
              title={f.mapa_ajuda}
            >
              <IconeMapa size={15} aria-hidden="true" />
              {f.ver_mapa}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
