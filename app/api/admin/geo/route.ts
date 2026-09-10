import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { logger } from "@/lib/logger";

// Mapeamento de cidades/localidades para distritos (simplificado)
const CITY_TO_DISTRICT: Record<string, string> = {
  // Norte
  "viana do castelo": "Viana do Castelo",
  braga: "Braga",
  porto: "Porto",
  "vila nova de gaia": "Porto",
  matosinhos: "Porto",
  "vila real": "Vila Real",
  bragança: "Bragança",

  // Centro
  aveiro: "Aveiro",
  coimbra: "Coimbra",
  viseu: "Viseu",
  guarda: "Guarda",
  "castelo branco": "Castelo Branco",
  leiria: "Leiria",
  santarém: "Santarém",

  // Lisboa e Vale do Tejo
  lisboa: "Lisboa",
  sintra: "Lisboa",
  cascais: "Lisboa",
  oeiras: "Lisboa",
  amadora: "Lisboa",
  loures: "Lisboa",
  odivelas: "Lisboa",
  "vila franca de xira": "Lisboa",
  setúbal: "Setúbal",
  portalegre: "Portalegre",

  // Alentejo
  évora: "Évora",
  beja: "Beja",

  // Algarve
  faro: "Faro",
  albufeira: "Faro",
  portimão: "Faro",
  lagos: "Faro",
  "vila real de santo antónio": "Faro",
  olhão: "Faro",
  tavira: "Faro",
};

// Extrair distrito de uma localidade
function extractDistrict(location: string | null): string | null {
  if (!location) return null;

  const normalized = location.toLowerCase().trim();

  // Procurar correspondência direta
  if (CITY_TO_DISTRICT[normalized]) {
    return CITY_TO_DISTRICT[normalized];
  }

  // Procurar se a localidade contém o nome de um distrito
  for (const [city, district] of Object.entries(CITY_TO_DISTRICT)) {
    if (normalized.includes(city) || city.includes(normalized)) {
      return district;
    }
  }

  return null;
}

// Todos os distritos de Portugal
const ALL_DISTRICTS = [
  "Viana do Castelo",
  "Braga",
  "Porto",
  "Vila Real",
  "Bragança",
  "Aveiro",
  "Viseu",
  "Guarda",
  "Coimbra",
  "Castelo Branco",
  "Leiria",
  "Santarém",
  "Lisboa",
  "Portalegre",
  "Évora",
  "Setúbal",
  "Beja",
  "Faro",
];

// GET - Buscar dados geográficos
export async function GET(req: NextRequest) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const metric = searchParams.get("metric") || "leads"; // 'leads', 'payments', 'customers'

    const districtCounts: Record<string, number> = {};

    // Inicializar todos os distritos com 0
    ALL_DISTRICTS.forEach((district) => {
      districtCounts[district] = 0;
    });

    // A tabela `leads` tem sete colunas — `id`, `email`, `nome`, os três
    // `utm_*` e `created_at` — e nenhuma diz onde a pessoa está. As três
    // métricas que dependiam disso (`leads`, `payments`, `customers`) pediam
    // `leads.location`: o PostgREST devolve 42703, `data` fica a `null`, e a
    // rota respondia um mapa com zeros em todos os distritos. Um mapa a zeros
    // não é «não há dados», é «não há clientes em lado nenhum» — e isso é uma
    // afirmação falsa sobre o negócio.
    //
    // Não se inventa a coluna por migração: não há de onde a encher. O que se
    // pode responder com verdade é «esta métrica não tem fonte», e é o que se
    // responde. A métrica `cavalos` fica, porque essa tem fonte a sério.
    const SEM_FONTE = ["leads", "payments", "customers"];
    if (SEM_FONTE.includes(metric)) {
      return NextResponse.json({
        metric,
        data: [],
        total: 0,
        indisponivel: true,
        motivo: "A tabela de leads não guarda localização.",
      });
    }

    if (metric === "cavalos") {
      // Cavalos por distrito. A coluna não é `proprietario_localizacao` — essa
      // não existe —, é `localizacao`, que é onde o anúncio diz que o cavalo
      // está. O `.select` de uma coluna inexistente devolvia `null` e a
      // métrica ficava também ela a zeros.
      const { data: cavalos } = await supabase.from("cavalos_venda").select("localizacao");

      if (cavalos) {
        cavalos.forEach((cavalo) => {
          const district = extractDistrict(cavalo.localizacao);
          if (district && districtCounts[district] !== undefined) {
            districtCounts[district]++;
          }
        });
      }
    }

    // Converter para array
    const districtData = Object.entries(districtCounts).map(([name, value]) => ({
      name,
      value,
    }));

    return NextResponse.json({
      metric,
      data: districtData,
      total: districtData.reduce((sum, d) => sum + d.value, 0),
    });
  } catch (error) {
    logger.error("Geo data error:", error);
    return NextResponse.json({ error: "Erro ao buscar dados geográficos" }, { status: 500 });
  }
}
