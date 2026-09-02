import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { logger } from "@/lib/logger";
import { strictLimiter } from "@/lib/rate-limit";
import { chaveRegistoApsl } from "@/components/vender-cavalo/registo-apsl";

/**
 * «Este número de registo já está noutro anúncio?»
 *
 * É a **única verificação de existência possível hoje**. O Livro Genealógico
 * da APSL não é consultável a partir daqui — a razão longa está no cabeçalho
 * de `components/vender-cavalo/registo-apsl.ts` —, e por isso o que se
 * pergunta é à nossa própria base. Apanha os dois enganos que dão problema a
 * sério: o mesmo cavalo anunciado duas vezes, e o número do cavalo errado
 * copiado para o formulário.
 *
 * **A resposta é um booleano e mais nada.** Não vai o `slug`, nem o nome do
 * cavalo, nem o vendedor. Um número de registo não é um segredo, mas este
 * caminho responde a quem não está autenticado, e devolver a ficha de um
 * anúncio a partir de um número seria dar uma segunda porta para a base — uma
 * que ninguém pediu e que não tem paginação, filtro nem contagem.
 *
 * Quando houver acesso ao stud-book, é aqui que a segunda consulta entra, ao
 * lado desta: a assinatura da resposta já está preparada para crescer
 * (`existe` continua a ser o duplicado nosso; a resposta da APSL entra num
 * campo próprio) e o formulário não muda uma linha.
 */

/** O `registro_apsl` é um `VARCHAR(100)`: nada maior do que isso pode existir lá. */
const MAX_CARACTERES = 100;

/**
 * A chave canónica com `%` entre cada caractere, para o `ilike` do Postgres.
 * O `%` e o `_` do próprio texto vão escapados — a chave já só tem letras e
 * algarismos, mas escapa-se na mesma: o dia em que a canonização mudar, esta
 * linha não passa a ser uma injecção de padrão.
 */
function padraoDeProcura(chave: string): string {
  return chave
    .split("")
    .map((c) => c.replace(/[%_\\]/g, "\\$&"))
    .join("%");
}

export async function GET(request: NextRequest) {
  try {
    // O mesmo limite dos outros caminhos de leitura pública. Sem ele, este é
    // um contador de existência que se pode percorrer à vontade.
    const ip = request.headers.get("x-forwarded-for") ?? "desconhecido";
    await strictLimiter.check(30, `registo-apsl:${ip}`);
  } catch {
    return NextResponse.json({ error: "Demasiados pedidos" }, { status: 429 });
  }

  const bruto = request.nextUrl.searchParams.get("numero") ?? "";
  if (bruto.length > MAX_CARACTERES) {
    return NextResponse.json({ error: "Número demasiado longo" }, { status: 400 });
  }

  const chave = chaveRegistoApsl(bruto);
  if (!chave) return NextResponse.json({ error: "Número em falta" }, { status: 400 });

  try {
    // A coluna guarda o número como o vendedor o escreveu, com os separadores
    // que ele usou: `PSL 2019 4471` e `PSL-2019/4471` são o mesmo número, e um
    // `eq` na coluna nunca os juntaria. Por isso são duas passagens. A
    // primeira é no servidor e serve para trazer poucas linhas: um `ilike` com
    // `%` entre cada caractere da chave apanha qualquer escrita que só difira
    // em separadores — e apanha também alguma coisa a mais, que é o preço de
    // filtrar sem uma coluna canónica. A segunda é aqui, e é exacta.
    const { data, error } = await supabaseAdmin
      .from("cavalos_venda")
      .select("registro_apsl")
      .ilike("registro_apsl", padraoDeProcura(chave))
      .neq("status", "removido")
      .limit(50);

    if (error) throw error;

    const existe = (data ?? []).some(
      (linha) => chaveRegistoApsl(String(linha.registro_apsl ?? "")) === chave
    );

    return NextResponse.json(
      { existe },
      // Meio minuto de cache. Quem escreve um número engana-se e corrige-o
      // várias vezes seguidas, e cada correcção era um pedido novo.
      { headers: { "Cache-Control": "private, max-age=30" } }
    );
  } catch (erro) {
    logger.error("Falha a verificar registo APSL", { erro });
    // Nunca se responde `existe: true` por engano: quem não sabe, cala-se, e
    // o formulário trata a falha como «não foi possível verificar».
    return NextResponse.json({ error: "Indisponível" }, { status: 503 });
  }
}
