import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin as supabase } from "@/lib/supabase-admin";
import { verifySession } from "@/lib/auth";
import { logger } from "@/lib/logger";
import { sanitizeSearchInput } from "@/lib/sanitize";
import { adminCoudelariaSchema, parseWithZod } from "@/lib/schemas";
import { COUDELARIA_STATUS } from "@/lib/coudelaria-status";
import { criarSlug } from "@/lib/slug";

// GET - Listar coudelarias com filtros
export async function GET(req: NextRequest) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get("status") || "all";
    const search = searchParams.get("search") || "";
    // O painel enviava `?plano=…` e esta rota lia `?distrito=…`: um filtro
    // que não filtrava, com quatro opções (`gratis`, `bronze`, `prata`,
    // `ouro`) que a coluna `plan` não tem em linha nenhuma. E `distrito` está
    // a `NULL` nas 35 linhas, por isso escolher um distrito devolvia sempre
    // zero. Ficou `regiao`, que é `NOT NULL`, tem dados e é o mesmo eixo por
    // que o directório público filtra.
    const regiao = searchParams.get("regiao") || "all";

    // Buscar todas as coudelarias (não-deletadas)
    let query = supabase
      .from("coudelarias")
      .select("*", { count: "exact" })
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // Filtros
    if (status !== "all") {
      query = query.eq("status", status);
    }

    if (regiao !== "all") {
      query = query.eq("regiao", regiao);
    }

    // Pesquisa (sanitizada contra PostgREST filter injection)
    //
    // `cidade` não é coluna de `coudelarias` — o PostgREST devolvia 42703 e a
    // rota respondia 500: escrever seja o que fosse na caixa de pesquisa
    // esvaziava a tabela. A morada vive em `localizacao` e `regiao`.
    // `distrito` existe mas está a `NULL` nas 35 linhas, por isso não
    // acrescenta um resultado a nenhuma pesquisa.
    if (search) {
      const safeSearch = sanitizeSearchInput(search);
      if (safeSearch) {
        query = query.or(
          `nome.ilike.%${safeSearch}%,localizacao.ilike.%${safeSearch}%,regiao.ilike.%${safeSearch}%,proprietario_nome.ilike.%${safeSearch}%`
        );
      }
    }

    const { data: coudelarias, error, count } = await query;

    if (error) throw error;

    // As estatísticas contavam `pendente`, `aprovado` e `rejeitado` — três
    // valores que a coluna `status` não tem em linha nenhuma: os três cartões
    // mostravam sempre zero. E contavam sobre a lista **já filtrada**, por isso
    // escolher um estado punha os outros contadores a zero: uma estatística
    // que muda com o filtro não é uma estatística, é a mesma lista contada
    // outra vez. Agora vêm de uma consulta própria, sem filtros para lá do
    // apagado, e contam o vocabulário a sério.
    const { data: todas, error: erroStats } = await supabase
      .from("coudelarias")
      .select("status, destaque, is_pro, regiao")
      .is("deleted_at", null);

    if (erroStats) throw erroStats;

    const linhas = todas || [];
    const stats = {
      total: linhas.length,
      pending: linhas.filter((c) => c.status === COUDELARIA_STATUS.PENDING).length,
      active: linhas.filter((c) => c.status === COUDELARIA_STATUS.ACTIVE).length,
      inactive: linhas.filter((c) => c.status === COUDELARIA_STATUS.INACTIVE).length,
      destaque: linhas.filter((c) => c.destaque).length,
      pro: linhas.filter((c) => c.is_pro).length,
    };

    // As regiões que o filtro pode oferecer saem dos dados, não de uma lista
    // escrita à mão que envelhece sozinha.
    const regioes = Array.from(
      new Set(linhas.map((c) => c.regiao).filter((r): r is string => Boolean(r)))
    ).sort((a, b) => a.localeCompare(b, "pt"));

    return NextResponse.json({
      coudelarias,
      stats,
      regioes,
      count,
    });
  } catch (error) {
    logger.error("Error fetching coudelarias:", error);
    return NextResponse.json(
      {
        error: "Erro ao carregar coudelarias",
      },
      { status: 500 }
    );
  }
}

// POST - Criar nova coudelaria (GRÁTIS)
export async function POST(req: NextRequest) {
  try {
    const email = await verifySession();
    if (!email) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = parseWithZod(adminCoudelariaSchema, body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const {
      nome,
      descricao,
      historia,
      especialidades,
      localizacao,
      regiao,
      distrito,
      codigo_postal,
      pais,
      telefone,
      email: coudelariaEmail,
      website,
      facebook,
      instagram,
      youtube,
      logo_url,
      banner_url,
      galeria,
      ano_fundacao,
      numero_cavalos,
      area_hectares,
      proprietario_nome,
      proprietario_email,
      proprietario_telefone,
      status,
      destaque,
    } = parsed.data;

    // `slug` é `NOT NULL UNIQUE` e esta rota nunca o escrevia: toda a inserção
    // falhava, ainda antes de chegar às colunas inventadas. Deriva-se do nome,
    // como já se faz no registo público.
    //
    // Um nome sem uma única letra latina dá slug vazio, e dois desses
    // colidiriam na chave única. Recusa-se com uma frase, em vez de deixar a
    // base responder 23505 e a rota traduzir isso para um 500 mudo.
    const slug = criarSlug(nome);
    if (!slug) {
      return NextResponse.json(
        { error: "O nome não tem letras que sirvam para um endereço" },
        { status: 400 }
      );
    }

    const { data: coudelaria, error } = await supabase
      .from("coudelarias")
      .insert({
        nome,
        slug,
        descricao,
        historia,
        especialidades,
        localizacao,
        regiao,
        distrito,
        codigo_postal,
        pais: pais || "Portugal",
        telefone,
        email: coudelariaEmail,
        website,
        facebook,
        instagram,
        youtube,
        logo_url,
        banner_url,
        galeria: galeria || [],
        ano_fundacao,
        numero_cavalos,
        area_hectares,
        proprietario_nome,
        proprietario_email,
        proprietario_telefone,
        status: status || COUDELARIA_STATUS.PENDING,
        destaque: destaque || false,
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ coudelaria }, { status: 201 });
  } catch (error) {
    logger.error("Error creating coudelaria:", error);
    return NextResponse.json(
      {
        error: "Erro ao criar coudelaria",
      },
      { status: 500 }
    );
  }
}
