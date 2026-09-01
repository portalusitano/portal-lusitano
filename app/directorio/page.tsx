import { readdirSync } from "node:fs";
import { lerListaDeTexto } from "@/lib/coudelaria-ficha";
import { join } from "node:path";
import type { Metadata } from "next";
import { supabase } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import DirectorioContent from "@/components/directorio/DirectorioContent";
import { generatePageMetadata } from "@/lib/seo";
import { PASTA_CAPAS, mapaDeCapas } from "@/lib/directorio-capas";

// ISR: Revalidate directory every hour (matches layout)
export const revalidate = 3600;

export const metadata: Metadata = generatePageMetadata({
  // A descrição anterior prometia «criadores certificados»: nada nesta página
  // verifica certificação nenhuma, e um resultado de pesquisa que promete o que
  // a página não tem é a mesma mentira do «1000+ cavalos» noutro sítio.
  title: "Directório de Coudelarias — Criadores Lusitanos",
  description:
    "Coudelarias de cavalos Lusitanos em Portugal, por região: localidade, ano de fundação, efectivo declarado, especialidades e linhagens.",
  path: "/directorio",
  keywords: [
    "coudelarias portugal",
    "criadores lusitanos",
    "directório equestre",
    "linhagens lusitano",
    "garanhões lusitanos",
    "coudelarias alentejo",
    "coudelarias ribatejo",
  ],
});

/**
 * Que fotografias existem mesmo em `public/images/coudelarias/`.
 *
 * A escolha da capa é feita aqui, uma vez por revalidação, e não no browser à
 * conta de `onError`: nenhum `capa.webp` existe no repositório, por isso o
 * cartão começava sempre por um pedido falhado e acabava numa fotografia de
 * stock que não era daquela coudelaria.
 *
 * Se a pasta não estiver onde se espera — um empacotamento diferente, por
 * exemplo — devolve-se um mapa vazio e os cartões desenham a chapa
 * tipográfica. Nunca deixa de haver página por causa de uma leitura de disco.
 */
function lerCapasEmDisco(): Record<string, string> {
  try {
    const raiz = join(process.cwd(), "public", PASTA_CAPAS);
    const pastas: Record<string, string[]> = {};
    for (const entrada of readdirSync(raiz, { withFileTypes: true })) {
      if (!entrada.isDirectory()) continue;
      pastas[entrada.name] = readdirSync(join(raiz, entrada.name));
    }
    return mapaDeCapas(pastas);
  } catch (error) {
    logger.warn("[DirectorioPage] sem capas em disco:", error);
    return {};
  }
}

export default async function DirectorioPage() {
  const { data, error } = await supabase
    .from("coudelarias")
    .select(
      "id, slug, nome, localizacao, regiao, foto_capa, destaque, ordem_destaque, ano_fundacao, num_cavalos, descricao, especialidades, linhagens, views_count, is_pro, coordenadas_lat, coordenadas_lng"
    )
    .eq("status", "active")
    .order("destaque", { ascending: false })
    .order("ordem_destaque", { ascending: true })
    .order("views_count", { ascending: false })
    .order("nome", { ascending: true });

  if (error) {
    logger.error("[DirectorioPage] Supabase error:", error);
  }

  /* As colunas de lista normalizam-se aqui, na fronteira, e não onde são
     desenhadas.

     `especialidades` e `linhagens` são `jsonb`, e nesta base há colunas que
     guardam uma **string** com JSON lá dentro em vez de um array — a
     `cavalos_destaque` já matou uma construção em produção por isso. Aqui o
     acidente seria o mesmo: o cartão faz `(c.especialidades ?? []).filter(…)`
     e uma string não tem `.filter`. Reproduzido: o `next build` morre a
     prerenderizar `/directorio` com «filter is not a function».

     O `as` de que estes dados vinham não era uma verificação, era uma
     promessa — e as promessas sobre dados de fora não se cumprem sozinhas. */
  const coudelarias = (data ?? []).map((c) => ({
    ...c,
    especialidades: lerListaDeTexto((c as { especialidades?: unknown }).especialidades),
    linhagens: lerListaDeTexto((c as { linhagens?: unknown }).linhagens),
  }));

  return <DirectorioContent coudelarias={coudelarias} capas={lerCapasEmDisco()} />;
}
