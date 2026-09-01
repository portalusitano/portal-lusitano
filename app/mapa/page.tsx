import { readdirSync } from "node:fs";
import { join } from "node:path";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { logger } from "@/lib/logger";
import { PASTA_CAPAS, mapaDeCapas } from "@/lib/directorio-capas";
import MapaClient from "@/components/MapaClient";
import type { Coudelaria } from "@/components/MapaClient";
import { lerEstadoDoMapa } from "@/lib/mapa-coudelarias";

/**
 * Que fotografias existem mesmo em `public/images/coudelarias/`.
 *
 * O mapa mostrava três fotografias do Unsplash à vez em todos os cartões,
 * apresentadas como sendo daquela coudelaria. Havia 24 capas verdadeiras no
 * repositório que ninguém usava. A escolha é a mesma do `/directorio` e vem
 * do mesmo módulo — não se escreve aqui uma segunda regra para a mesma coisa.
 *
 * Se a pasta não estiver onde se espera, devolve-se um mapa vazio e os cartões
 * desenham a chapa tipográfica: nunca deixa de haver página por uma leitura
 * de disco.
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
    logger.warn("[MapaPage] sem capas em disco:", error);
    return {};
  }
}

/**
 * A página é servida a pedido (`ƒ`), por isso ler a query não lhe custa
 * render nenhum — e é aqui que os filtros de um link partilhado têm de ser
 * lidos. Feito no cliente dentro de um efeito, a primeira pintura mostrava o
 * país inteiro e só depois é que encolhia para a região pedida.
 *
 * É também aqui que o «voltar» do browser é atendido: quem sai do mapa para
 * uma ficha volta a este endereço com os filtros que tinha. Quem os lê é o
 * `lerEstadoDoMapa`, o mesmo módulo que os escreve no cliente — antes eram
 * duas regras separadas e já discordavam no comprimento da pesquisa.
 */
export default async function MapaPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const supabase = await createSupabaseServerClient();

  const { data } = await supabase
    .from("coudelarias")
    .select(
      "id, slug, nome, descricao, localizacao, regiao, telefone, email, website, foto_capa, destaque, is_pro, coordenadas_lat, coordenadas_lng, num_cavalos, especialidades"
    )
    .eq("status", "active")
    .order("destaque", { ascending: false })
    .order("nome", { ascending: true });

  const coudelarias: Coudelaria[] = (data ?? []).map((c) => ({
    id: c.id,
    nome: c.nome,
    slug: c.slug,
    descricao: c.descricao ?? "",
    localizacao: c.localizacao ?? "",
    regiao: c.regiao ?? "",
    telefone: c.telefone ?? undefined,
    email: c.email ?? undefined,
    website: c.website ?? undefined,
    foto_capa: c.foto_capa ?? undefined,
    is_pro: c.is_pro ?? false,
    destaque: c.destaque ?? false,
    coordenadas_lat: c.coordenadas_lat ?? undefined,
    coordenadas_lng: c.coordenadas_lng ?? undefined,
    num_cavalos: c.num_cavalos ?? undefined,
    especialidades: c.especialidades ?? undefined,
  }));

  const params = await searchParams;
  const inicial = lerEstadoDoMapa(
    params,
    coudelarias.map((c) => c.regiao)
  );

  return <MapaClient coudelarias={coudelarias} capas={lerCapasEmDisco()} inicial={inicial} />;
}
