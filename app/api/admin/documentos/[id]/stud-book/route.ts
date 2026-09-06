/**
 * POST /api/admin/documentos/[id]/stud-book — corpo `{ resposta, chave, visto? }`.
 *
 * Regista o que **uma pessoa** viu na consulta pública do Livro Genealógico.
 *
 * ## ██ Esta rota não fala com a APSL ██
 *
 * Não há aqui um `fetch`. Quem abriu a página da APSL foi o browser de quem
 * revê, com um clique dele, num formulário público que tem um reCAPTCHA — e o
 * CAPTCHA é a razão de o `STUD_BOOK_APSL_ACTIVO` estar em baixo. Esta rota
 * recebe a resposta escrita à mão e escreve-a na `consultas_stud_book`, com o
 * e-mail de quem a escreveu ao lado.
 *
 * ## O que esta rota não faz
 *
 * **Não escreve `verificado` em documento nenhum.** Não toca sequer na tabela
 * dos documentos: lê-a para saber de que anúncio se trata, e escreve noutra. A
 * palavra «verificado» continua a ter um sítio só — o `/verificar`, com um
 * clique de uma pessoa e o nome dela. Saber que um número consta do Livro
 * Genealógico é matéria para quem revê ler **antes** de decidir; não é a
 * decisão, e um caminho que a transformasse em decisão seria um caminho que
 * carimba anúncios a partir de um clique feito noutra página.
 *
 * ## Porque é que a chave vem no corpo
 *
 * O painel mostra um número, a pessoa vai ver esse número, e volta. Entre as
 * duas coisas o vendedor pode ter corrigido o anúncio — e então a observação
 * dela é sobre um número que já não é o deste anúncio. A `chave` que o painel
 * recebeu volta no corpo e confronta-se com a de agora: se mudaram, 409, e a
 * ficha recarrega. Sem isto, a resposta certa ficava agarrada à pergunta
 * errada, que é o único jeito que este registo tem de mentir.
 */

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import {
  assentarResultado,
  consultaAssistida,
  escolherIdentificador,
  guardarConsultaDoCavalo,
  lerMemoriaDaChave,
  respostaAssistidaValida,
  type PedidoDeConsulta,
  type VistoNoStudBook,
} from "@/lib/documentos/stud-book";
import { TABELA, baseDeDados, idValido, respostaIdInvalido, sessaoDeAdmin } from "../../comum";

// Literal por exigência do Next — ver a nota em `../../route.ts`.
export const dynamic = "force-dynamic";

/**
 * O tecto de cada campo copiado do ecrã.
 *
 * Um nome de cavalo não passa dos cento e vinte caracteres em lado nenhum, e a
 * data e a pelagem são mais curtas ainda. O tecto existe pela mesma razão do
 * motivo da recusa: o campo é `text`, e sem tecto entra lá uma página inteira
 * colada por engano.
 */
const MAX_CAMPO = 120;

function campoCopiado(valor: unknown): string | null {
  if (typeof valor !== "string") return null;
  const limpo = valor.trim();
  if (limpo === "" || limpo.length > MAX_CAMPO) return null;
  return limpo;
}

/** As colunas do anúncio de que esta rota precisa. Nada mais. */
const COLUNAS = "id, registro_apsl, passaporte_equino, microchip";

export async function POST(pedido: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sessao = await sessaoDeAdmin();
  if (!sessao.ok) return sessao.resposta;

  const { id } = await params;
  if (!idValido(id)) return respostaIdInvalido();

  let corpo: unknown;
  try {
    corpo = await pedido.json();
  } catch {
    return NextResponse.json({ erro: "Corpo do pedido inválido" }, { status: 400 });
  }

  const c = corpo as { resposta?: unknown; chave?: unknown; visto?: unknown } | null;
  if (!respostaAssistidaValida(c?.resposta)) {
    return NextResponse.json(
      { erro: "Resposta desconhecida. É «consta», «não consta» ou «não consegui ver»." },
      { status: 400 }
    );
  }
  const chaveVista = typeof c?.chave === "string" ? c.chave : null;
  if (!chaveVista) {
    return NextResponse.json(
      { erro: "Falta o número a que a resposta diz respeito." },
      {
        status: 400,
      }
    );
  }

  try {
    const { data: doc, error } = await baseDeDados
      .from(TABELA)
      .select("id, cavalo_id, leitura")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      logger.error("[admin/documentos/stud-book] falha a ler o documento", error);
      return NextResponse.json({ erro: "Erro ao carregar o documento" }, { status: 500 });
    }
    if (!doc) return NextResponse.json({ erro: "Documento não encontrado" }, { status: 404 });

    const linha = doc as Record<string, unknown>;
    const cavaloId = (linha.cavalo_id as string | null) ?? null;

    // Sem anúncio não há onde escrever: a chave primária da
    // `consultas_stud_book` é o `cavalo_id`. O documento sobe antes do
    // pagamento, e nesse intervalo a observação não tem a que se prender. O
    // painel já o diz por palavras — esta é a segunda fechadura na mesma porta.
    if (!cavaloId) {
      return NextResponse.json(
        {
          erro:
            "O anúncio ainda não existe — o documento sobe antes do pagamento. " +
            "O registo é por anúncio, e por isso a resposta ainda não tem onde ficar.",
        },
        { status: 409 }
      );
    }

    const { data: anuncioBruto } = await baseDeDados
      .from("cavalos_venda")
      .select(COLUNAS)
      .eq("id", cavaloId)
      .maybeSingle();
    const anuncio = (anuncioBruto as Record<string, unknown> | null) ?? null;

    // O número por que se pergunta é o **do anúncio**, e não o que a leitura
    // automática tirou do ficheiro. É o do anúncio que o `deveConsultar`
    // compara no dia em que o interruptor subir; guardar a observação contra o
    // outro fazia com que a consulta automática visse uma chave diferente e
    // voltasse a perguntar o mesmo à APSL.
    const pedidoDeConsulta: PedidoDeConsulta = {
      numeroRegisto: (anuncio?.registro_apsl as string | null) ?? null,
      ueln: (anuncio?.passaporte_equino as string | null) ?? null,
      microchip: (anuncio?.microchip as string | null) ?? null,
    };

    const escolha = escolherIdentificador(pedidoDeConsulta);
    if (!escolha) {
      return NextResponse.json(
        { erro: "Este anúncio não traz nenhum número por que perguntar." },
        { status: 409 }
      );
    }
    if (escolha.chave !== chaveVista) {
      return NextResponse.json(
        {
          erro:
            "O número do anúncio mudou desde que abriu esta ficha. " +
            "Recarregue e volte a consultar — a resposta é sobre o número novo.",
          chave: escolha.chave,
        },
        { status: 409 }
      );
    }

    const visto: VistoNoStudBook | undefined =
      c?.resposta === "consta" && typeof c.visto === "object" && c.visto !== null
        ? {
            nome: campoCopiado((c.visto as Record<string, unknown>).nome),
            dataNascimento: campoCopiado((c.visto as Record<string, unknown>).dataNascimento),
            pelagem: campoCopiado((c.visto as Record<string, unknown>).pelagem),
          }
        : undefined;

    const registada = consultaAssistida({
      resposta: c.resposta,
      identificador: escolha.identificador,
      valor: escolha.valor,
      por: sessao.email,
      visto,
    });

    if (!registada.ok) {
      // O `sem_identificador` já foi apanhado acima; o `sem_autor` só acontece
      // se a sessão trouxer um e-mail vazio, e nesse caso o problema é nosso.
      logger.error("[admin/documentos/stud-book] pedido assistido recusado", {
        recusa: registada.recusa,
      });
      return NextResponse.json({ erro: "Não foi possível registar a consulta." }, { status: 500 });
    }

    // A memória é por **chave** e não por anúncio: se este número já passou por
    // cá noutra submissão, a contagem de tentativas continua de onde estava.
    const memoria = await lerMemoriaDaChave(escolha.chave, baseDeDados);
    const consulta = assentarResultado(memoria, registada.resultado);

    const guardou = await guardarConsultaDoCavalo(cavaloId, consulta, baseDeDados);
    if (!guardou) {
      return NextResponse.json(
        { erro: "A resposta não ficou guardada. Tente outra vez." },
        { status: 500 }
      );
    }

    logger.info("[admin/documentos] consulta assistida registada", {
      documentoId: id,
      cavaloId,
      estado: consulta.estado,
      identificador: escolha.identificador,
      por: sessao.email,
    });

    return NextResponse.json({ consulta });
  } catch (e) {
    logger.error("[admin/documentos/stud-book] erro inesperado", e);
    return NextResponse.json({ erro: "Erro interno" }, { status: 500 });
  }
}
