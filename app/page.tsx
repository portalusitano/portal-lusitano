import { supabase } from "@/lib/supabase-admin";
import { LISTING_STATUS, normalizeListing } from "@/lib/marketplace-listings";
import { logger } from "@/lib/logger";
import HomeContent from "@/components/HomeContent";

// ISR: a homepage mostra anúncios reais, que mudam ao longo do dia.
export const revalidate = 900;

export default async function HomePage() {
  const agora = new Date();

  // Em destaque primeiro, depois os mais recentes. Uma única query serve as duas
  // secções: o catálogo é pequeno e ordenar em memória evita um segundo round-trip.
  const { data, error } = await supabase
    .from("cavalos_venda")
    .select("*")
    .in("status", [LISTING_STATUS.ACTIVE, LISTING_STATUS.RESERVADO])
    .order("destaque", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(24);

  if (error) {
    logger.error("[HomePage] Supabase error:", error);
  }

  const anuncios = (data || [])
    .map((row) => normalizeListing(row, agora))
    .filter((a) => !a.expirado);

  const { count: totalAtivos } = await supabase
    .from("cavalos_venda")
    .select("id", { count: "exact", head: true })
    .eq("status", LISTING_STATUS.ACTIVE);

  return (
    <HomeContent
      destaques={anuncios.filter((a) => a.destaque).slice(0, 3)}
      recentes={anuncios.slice(0, 8)}
      totalAtivos={totalAtivos ?? anuncios.length}
    />
  );
}
